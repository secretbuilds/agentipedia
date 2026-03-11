"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runSchema } from "@/lib/validators/run-schema";
import { processTsv } from "@/lib/parsers/process-tsv";
import { getErrorMessage } from "@/lib/utils/errors";
import { mutationLimiter } from "@/lib/utils/rate-limit";
import {
  MAX_TSV_SIZE,
  MAX_CODE_SIZE,
  ALLOWED_CODE_EXTENSIONS,
} from "@/lib/utils/constants";
import type { ActionResult } from "@/types/action";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateUuid(): string {
  return crypto.randomUUID();
}

function getFileExtension(filename: string): string {
  const dotIdx = filename.lastIndexOf(".");
  if (dotIdx === -1) return "";
  return filename.slice(dotIdx).toLowerCase();
}

function sanitizeFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "code";
  return base.replace(/[^\w.\-]/g, "_");
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const BATCH_SIZE = 1_000;

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/**
 * Submit a new run against a hypothesis.
 *
 * Core flow:
 * 1.  Auth check
 * 2.  Extract + validate fields
 * 3.  Read & validate results.tsv
 * 4.  Get hypothesis direction
 * 5.  Process TSV server-side
 * 6.  Read code file
 * 7.  Upload files to storage
 * 8.  Insert run row
 * 9.  Batch insert experiments
 * 10. Revalidate + return
 */
export async function submitRun(
  hypothesisId: string,
  formData: FormData,
): Promise<ActionResult<{ runId: string; runUrl: string }>> {
  const runId = generateUuid();
  const storagePaths: string[] = [];
  const admin = createAdminClient();

  try {
    // 1. Auth check
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "You must be signed in to submit a run" };
    }

    // Rate limit by user ID
    const rateCheck = mutationLimiter.check(user.id);
    if (!rateCheck.allowed) {
      return { success: false, error: "Rate limit exceeded. Please try again later." };
    }

    // 2. Extract fields from FormData
    const rawFields = {
      goal: formData.get("goal") as string | null,
      hardware: formData.get("hardware") as string | null,
      time_budget: formData.get("time_budget") as string | null,
      model_size: formData.get("model_size") as string | null,
      tag_1: (formData.get("tag_1") as string | null) || null,
      tag_2: (formData.get("tag_2") as string | null) || null,
      forked_from: (formData.get("forked_from") as string | null) || null,
    };

    // 3. Validate with Zod
    const parsed = runSchema.safeParse(rawFields);
    if (!parsed.success) {
      const firstError = parsed.error.issues?.[0]?.message ?? "Validation failed";
      return { success: false, error: firstError };
    }

    // 4. Extract & validate results.tsv
    const tsvFile = formData.get("results_tsv") as File | null;
    if (!tsvFile || tsvFile.size === 0) {
      return { success: false, error: "results.tsv file is required" };
    }
    if (tsvFile.size > MAX_TSV_SIZE) {
      return { success: false, error: "results.tsv exceeds maximum size of 5 MB" };
    }

    const tsvBuffer = await tsvFile.arrayBuffer();
    const tsvText = new TextDecoder().decode(tsvBuffer);

    // 5. Validate hypothesisId as UUID
    if (!UUID_REGEX.test(hypothesisId)) {
      return { success: false, error: "Invalid hypothesis ID" };
    }

    // 6. Get hypothesis to know metric_direction
    const { data: hypothesis, error: hypoError } = await supabase
      .from("hypotheses")
      .select("metric_direction")
      .eq("id", hypothesisId)
      .single();

    if (hypoError || !hypothesis) {
      return { success: false, error: "Hypothesis not found" };
    }

    // 6. Process TSV server-side — NEVER trust client
    const tsvResult = processTsv(tsvText, hypothesis.metric_direction);
    if (!tsvResult.success) {
      return {
        success: false,
        error: `TSV validation failed: ${tsvResult.errors.join("; ")}`,
      };
    }

    // 7. Extract & validate code file
    const codeFile = formData.get("code_file") as File | null;
    if (!codeFile || codeFile.size === 0) {
      return { success: false, error: "Code file is required" };
    }
    if (codeFile.size > MAX_CODE_SIZE) {
      return { success: false, error: "Code file exceeds maximum size of 1 MB" };
    }

    const codeExtension = getFileExtension(codeFile.name);
    if (!ALLOWED_CODE_EXTENSIONS.includes(codeExtension)) {
      return {
        success: false,
        error: `Invalid code file type. Allowed: ${ALLOWED_CODE_EXTENSIONS.join(", ")}`,
      };
    }

    const codeBuffer = await codeFile.arrayBuffer();

    // Validate code file contains valid UTF-8 text (no binary content)
    try {
      const codeDecoder = new TextDecoder("utf-8", { fatal: true });
      codeDecoder.decode(codeBuffer);
    } catch {
      return { success: false, error: "Code file must be valid UTF-8 text" };
    }

    // 8. Upload results.tsv to Supabase Storage
    const tsvPath = `run-files/${hypothesisId}/${runId}/results.tsv`;
    const { error: tsvUploadError } = await admin.storage
      .from("run-files")
      .upload(tsvPath, new Uint8Array(tsvBuffer), {
        contentType: "text/tab-separated-values",
        upsert: false,
      });

    if (tsvUploadError) {
      console.error("TSV upload error:", tsvUploadError);
      return { success: false, error: "Failed to upload results.tsv" };
    }
    storagePaths.push(tsvPath);

    // 9. Upload code file to Storage
    const safeCodeFilename = sanitizeFilename(codeFile.name);
    const codePath = `run-files/${hypothesisId}/${runId}/${safeCodeFilename}`;
    const { error: codeUploadError } = await admin.storage
      .from("run-files")
      .upload(codePath, new Uint8Array(codeBuffer), {
        contentType: "text/plain; charset=utf-8",
        upsert: false,
      });

    if (codeUploadError) {
      console.error("Code upload error:", codeUploadError);
      // Clean up TSV
      await admin.storage.from("run-files").remove(storagePaths);
      return { success: false, error: "Failed to upload code file" };
    }
    storagePaths.push(codePath);

    // Get public URLs
    const { data: tsvUrlData } = admin.storage
      .from("run-files")
      .getPublicUrl(tsvPath);
    const { data: codeUrlData } = admin.storage
      .from("run-files")
      .getPublicUrl(codePath);

    // 10. Insert run row
    const { stats } = tsvResult;
    const { error: runInsertError } = await supabase
      .from("runs")
      .insert({
        id: runId,
        hypothesis_id: hypothesisId,
        user_id: user.id,
        goal: parsed.data.goal,
        hardware: parsed.data.hardware,
        time_budget: parsed.data.time_budget,
        model_size: parsed.data.model_size,
        tag_1: parsed.data.tag_1,
        tag_2: parsed.data.tag_2,
        forked_from: parsed.data.forked_from,
        baseline_metric: stats.baselineMetric ?? 0,
        best_metric: stats.bestMetric ?? 0,
        best_description: stats.bestDescription ?? "",
        num_experiments: stats.numExperiments,
        num_kept: stats.numKept,
        num_discarded: stats.numDiscarded,
        num_crashed: stats.numCrashed,
        improvement_pct: stats.improvementPct ?? 0,
        results_tsv_url: tsvUrlData.publicUrl,
        code_file_url: codeUrlData.publicUrl,
        code_filename: safeCodeFilename,
      });

    if (runInsertError) {
      console.error("Run insert error:", runInsertError);
      // Clean up storage
      await admin.storage.from("run-files").remove(storagePaths);
      return { success: false, error: "Failed to save run" };
    }

    // 11. Batch insert experiments (1,000 per batch)
    const experiments = tsvResult.rows.map((row, idx) => ({
      run_id: runId,
      sequence: idx + 1,
      commit_hash: row.commit,
      metric_value: row.metric_value,
      memory_gb: row.memory_gb,
      status: row.status,
      description: row.description,
    }));

    for (let i = 0; i < experiments.length; i += BATCH_SIZE) {
      const batch = experiments.slice(i, i + BATCH_SIZE);
      const { error: batchError } = await supabase
        .from("experiments")
        .insert(batch);

      if (batchError) {
        console.error(`Experiment batch insert error (batch ${i / BATCH_SIZE + 1}):`, batchError);
        // Clean up: delete the run (cascade should delete experiments) and storage
        await admin.from("runs").delete().eq("id", runId);
        await admin.storage.from("run-files").remove(storagePaths);
        return { success: false, error: "Failed to save experiment data" };
      }
    }

    // 12. Revalidate & return
    revalidatePath(`/hypotheses/${hypothesisId}`);

    return {
      success: true,
      data: { runId, runUrl: `/runs/${runId}` },
    };
  } catch (err) {
    console.error("submitRun unexpected error:", err);
    // Best-effort cleanup
    if (storagePaths.length > 0) {
      await admin.storage.from("run-files").remove(storagePaths).catch(() => {});
    }
    return { success: false, error: getErrorMessage(err) };
  }
}

/**
 * Delete a run.
 *
 * Validates ownership, removes files from storage, deletes the run
 * (cascade deletes experiments), and revalidates the hypothesis page.
 */
export async function deleteRun(
  id: string,
): Promise<ActionResult> {
  try {
    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "You must be signed in to delete a run" };
    }

    // Rate limit by user ID
    const rateCheck = mutationLimiter.check(user.id);
    if (!rateCheck.allowed) {
      return { success: false, error: "Rate limit exceeded. Please try again later." };
    }

    // Fetch run for ownership check + file paths
    const { data: run, error: fetchError } = await supabase
      .from("runs")
      .select("user_id, hypothesis_id, results_tsv_url, code_file_url, code_filename")
      .eq("id", id)
      .single();

    if (fetchError || !run) {
      return { success: false, error: "Run not found" };
    }

    if (run.user_id !== user.id) {
      return { success: false, error: "You can only delete your own runs" };
    }

    // Delete files from storage
    const admin = createAdminClient();
    const filePaths = [
      `run-files/${run.hypothesis_id}/${id}/results.tsv`,
      `run-files/${run.hypothesis_id}/${id}/${run.code_filename}`,
    ];

    const { error: storageError } = await admin.storage
      .from("run-files")
      .remove(filePaths);

    if (storageError) {
      console.error("deleteRun storage error:", storageError);
      // Continue with DB deletion even if storage cleanup fails
    }

    // Delete run (cascade deletes experiments)
    const { error: deleteError } = await supabase
      .from("runs")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("deleteRun delete error:", deleteError);
      return { success: false, error: "Failed to delete run" };
    }

    revalidatePath(`/hypotheses/${run.hypothesis_id}`);

    return { success: true, data: undefined };
  } catch (err) {
    console.error("deleteRun unexpected error:", err);
    return { success: false, error: getErrorMessage(err) };
  }
}
