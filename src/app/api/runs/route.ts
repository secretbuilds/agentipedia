import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/authenticate-request";
import { createAdminClient } from "@/lib/supabase/admin";
import { runSchema } from "@/lib/validators/run-schema";
import { processTsv } from "@/lib/parsers/process-tsv";
import { getErrorMessage } from "@/lib/utils/errors";
import {
  MAX_TSV_SIZE,
  MAX_CODE_SIZE,
  ALLOWED_CODE_EXTENSIONS,
} from "@/lib/utils/constants";

// ---------------------------------------------------------------------------
// Rate limiting (in-memory, acceptable for V1)
// ---------------------------------------------------------------------------

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

const rateLimitMap = new Map<string, readonly number[]>();

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  const existing = rateLimitMap.get(userId) ?? [];
  const recent = existing.filter((ts) => ts > cutoff);

  if (recent.length >= RATE_LIMIT_MAX) {
    // Update map with pruned timestamps (immutable pattern)
    rateLimitMap.set(userId, recent);
    return true;
  }

  // Record this request (create new array, don't mutate)
  rateLimitMap.set(userId, [...recent, now]);
  return false;
}

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

function jsonError(error: string, status: number) {
  return NextResponse.json({ success: false, error }, { status });
}

const BATCH_SIZE = 1_000;

// ---------------------------------------------------------------------------
// POST /api/runs
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    // 1. Auth check
    const auth = await authenticateRequest(request);
    if (!auth) {
      return jsonError("Unauthorized", 401);
    }

    // 2. Rate limit check
    if (rateLimitMap.size > 10_000) {
      rateLimitMap.clear();
    }
    if (isRateLimited(auth.userId)) {
      return jsonError("Rate limit exceeded. Maximum 10 submissions per hour.", 429);
    }

    // 3. Parse multipart/form-data
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return jsonError("Invalid multipart/form-data body", 400);
    }

    // 4. Extract hypothesis_id
    const hypothesisId = formData.get("hypothesis_id") as string | null;
    if (!hypothesisId) {
      return jsonError("hypothesis_id is required", 400);
    }
    if (!UUID_REGEX.test(hypothesisId)) {
      return jsonError("Invalid hypothesis ID", 400);
    }

    // 5. Extract and validate fields
    const rawFields = {
      goal: formData.get("goal") as string | null,
      hardware: formData.get("hardware") as string | null,
      time_budget: formData.get("time_budget") as string | null,
      model_size: formData.get("model_size") as string | null,
      tag_1: (formData.get("tag_1") as string | null) || null,
      tag_2: (formData.get("tag_2") as string | null) || null,
      forked_from: (formData.get("forked_from") as string | null) || null,
      synthesis: (formData.get("synthesis") as string | null) || null,
    };

    const parsed = runSchema.safeParse(rawFields);
    if (!parsed.success) {
      const firstError = parsed.error.issues?.[0]?.message ?? "Validation failed";
      return jsonError(firstError, 400);
    }

    // V2: Extract code_snapshot and synthesis
    const rawCodeSnapshot = formData.get("code_snapshot") as string | null;
    const synthesis = parsed.data.synthesis ?? null;

    // Parse and validate code_snapshot JSON if provided
    let codeSnapshot: Record<string, string> | null = null;
    if (rawCodeSnapshot) {
      try {
        const parsed_snapshot = JSON.parse(rawCodeSnapshot);
        if (
          typeof parsed_snapshot !== "object" ||
          parsed_snapshot === null ||
          Array.isArray(parsed_snapshot)
        ) {
          return jsonError(
            "code_snapshot must be a JSON object mapping filenames to contents",
            400,
          );
        }
        for (const [key, value] of Object.entries(parsed_snapshot)) {
          if (typeof key !== "string" || typeof value !== "string") {
            return jsonError(
              "code_snapshot values must all be strings",
              400,
            );
          }
        }
        const snapshotSize = new TextEncoder().encode(
          rawCodeSnapshot,
        ).byteLength;
        if (snapshotSize > 5 * 1024 * 1024) {
          return jsonError(
            "code_snapshot exceeds maximum size of 5 MB",
            400,
          );
        }
        codeSnapshot = parsed_snapshot as Record<string, string>;
      } catch {
        return jsonError("code_snapshot must be valid JSON", 400);
      }
    }

    // 6. Extract & validate results.tsv
    const tsvFile = formData.get("results_tsv") as File | null;
    if (!tsvFile || tsvFile.size === 0) {
      return jsonError("results_tsv file is required", 400);
    }
    if (tsvFile.size > MAX_TSV_SIZE) {
      return jsonError("results_tsv exceeds maximum size of 5 MB", 400);
    }

    const tsvBuffer = await tsvFile.arrayBuffer();
    const tsvText = new TextDecoder().decode(tsvBuffer);

    // 7. Validate hypothesis exists and is open, get metric_direction
    const admin = createAdminClient();
    const { data: hypothesis, error: hypoError } = await admin
      .from("hypotheses")
      .select("id, status, metric_direction")
      .eq("id", hypothesisId)
      .single();

    if (hypoError || !hypothesis) {
      return jsonError("Hypothesis not found", 404);
    }

    if (hypothesis.status !== "open") {
      return jsonError(
        "This hypothesis is not accepting new runs. Only hypotheses with status 'open' accept submissions.",
        403,
      );
    }

    // 8. Process TSV server-side
    const tsvResult = processTsv(tsvText, hypothesis.metric_direction);
    if (!tsvResult.success) {
      return jsonError(
        `TSV validation failed: ${tsvResult.errors.join("; ")}`,
        400,
      );
    }

    // 9. Extract & validate code file (optional when code_snapshot provided)
    const codeFile = formData.get("code_file") as File | null;
    if ((!codeFile || codeFile.size === 0) && !codeSnapshot) {
      return jsonError(
        "Either code_file or code_snapshot is required",
        400,
      );
    }

    let codeBuffer: ArrayBuffer | null = null;
    let safeCodeFilename: string | null = null;

    if (codeFile && codeFile.size > 0) {
      if (codeFile.size > MAX_CODE_SIZE) {
        return jsonError("code_file exceeds maximum size of 1 MB", 400);
      }

      const codeExtension = getFileExtension(codeFile.name);
      if (!ALLOWED_CODE_EXTENSIONS.includes(codeExtension)) {
        return jsonError(
          `Invalid code file type. Allowed: ${ALLOWED_CODE_EXTENSIONS.join(", ")}`,
          400,
        );
      }

      codeBuffer = await codeFile.arrayBuffer();

      // Validate code file contains valid UTF-8 text (no binary content)
      try {
        const codeDecoder = new TextDecoder("utf-8", { fatal: true });
        codeDecoder.decode(codeBuffer);
      } catch {
        return jsonError("Code file must be valid UTF-8 text", 400);
      }

      safeCodeFilename = sanitizeFilename(codeFile.name);
    }

    // 10. Upload files and insert data
    const runId = generateUuid();
    const storagePaths: string[] = [];

    // Upload results.tsv
    const tsvPath = `run-files/${hypothesisId}/${runId}/results.tsv`;
    const { error: tsvUploadError } = await admin.storage
      .from("run-files")
      .upload(tsvPath, new Uint8Array(tsvBuffer), {
        contentType: "text/tab-separated-values",
        upsert: false,
      });

    if (tsvUploadError) {
      console.error("TSV upload error:", tsvUploadError);
      return jsonError("Failed to upload results.tsv", 500);
    }
    storagePaths.push(tsvPath);

    // Upload code file (only when a file was provided)
    let codePublicUrl = "";
    let finalCodeFilename = "";

    if (codeBuffer && safeCodeFilename) {
      const codePath = `run-files/${hypothesisId}/${runId}/${safeCodeFilename}`;
      const { error: codeUploadError } = await admin.storage
        .from("run-files")
        .upload(codePath, new Uint8Array(codeBuffer), {
          contentType: "text/plain; charset=utf-8",
          upsert: false,
        });

      if (codeUploadError) {
        console.error("Code upload error:", codeUploadError);
        await admin.storage.from("run-files").remove(storagePaths);
        return jsonError("Failed to upload code file", 500);
      }
      storagePaths.push(codePath);

      const { data: codeUrlData } = admin.storage
        .from("run-files")
        .getPublicUrl(codePath);
      codePublicUrl = codeUrlData.publicUrl;
      finalCodeFilename = safeCodeFilename;
    } else if (codeSnapshot) {
      // Derive filename from first key in snapshot
      const firstKey = Object.keys(codeSnapshot)[0] ?? "code.py";
      finalCodeFilename = sanitizeFilename(firstKey);
    }

    // Build code_snapshot from code_file if not already provided
    if (!codeSnapshot && codeBuffer && safeCodeFilename) {
      const codeContent = new TextDecoder().decode(codeBuffer);
      codeSnapshot = { [safeCodeFilename]: codeContent };
    }

    // Get public URL for TSV
    const { data: tsvUrlData } = admin.storage
      .from("run-files")
      .getPublicUrl(tsvPath);

    // Insert run row
    const { stats } = tsvResult;
    const { error: runInsertError } = await admin
      .from("runs")
      .insert({
        id: runId,
        hypothesis_id: hypothesisId,
        user_id: auth.userId,
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
        code_file_url: codePublicUrl,
        code_filename: finalCodeFilename,
        code_snapshot: codeSnapshot,
        synthesis: synthesis,
      });

    if (runInsertError) {
      console.error("Run insert error:", runInsertError);
      await admin.storage.from("run-files").remove(storagePaths);
      return jsonError("Failed to save run", 500);
    }

    // Batch insert experiments
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
      const { error: batchError } = await admin
        .from("experiments")
        .insert(batch);

      if (batchError) {
        console.error(
          `Experiment batch insert error (batch ${i / BATCH_SIZE + 1}):`,
          batchError,
        );
        await admin.from("runs").delete().eq("id", runId);
        await admin.storage.from("run-files").remove(storagePaths);
        return jsonError("Failed to save experiment data", 500);
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: { run_id: runId, run_url: `/runs/${runId}` },
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("POST /api/runs unexpected error:", err);
    return jsonError("An unexpected error occurred. Please try again later.", 500);
  }
}
