"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runSchema } from "@/lib/validators/run-schema";
import { parseTsv } from "@/lib/parsers/tsv-parser";
import { validateTsvRows } from "@/lib/parsers/tsv-validator";
import { extractTsvStats } from "@/lib/parsers/tsv-stats";
import { runUrl, hypothesisUrl } from "@/lib/utils/url";

export type RunActionState = {
  success: boolean;
  errors?: Record<string, string[]>;
  message?: string;
};

export async function submitRun(
  hypothesisId: string,
  _prevState: RunActionState,
  formData: FormData
): Promise<RunActionState> {
  const supabase = await createServerSupabaseClient();
  const admin = createAdminClient();

  // 1. Authenticate
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, message: "You must be signed in." };
  }

  // 2. Validate form fields
  const raw = {
    goal: formData.get("goal"),
    hardware: formData.get("hardware"),
    time_budget: formData.get("time_budget"),
    model_size: formData.get("model_size"),
    tag_1: formData.get("tag_1") ?? "",
    tag_2: formData.get("tag_2") ?? "",
    forked_from: formData.get("forked_from") ?? "",
  };

  const parsed = runSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  // 3. Get the hypothesis to know metric_direction
  const { data: hypothesis } = await supabase
    .from("hypotheses")
    .select("metric_direction, status")
    .eq("id", hypothesisId)
    .single();

  if (!hypothesis) {
    return { success: false, message: "Hypothesis not found." };
  }
  if (hypothesis.status !== "open") {
    return { success: false, message: "This hypothesis is closed." };
  }

  // 4. Parse and validate TSV server-side
  const tsvFile = formData.get("results_tsv") as File | null;
  if (!tsvFile) {
    return { success: false, message: "results.tsv file is required." };
  }

  const tsvText = await tsvFile.text();
  const parseResult = parseTsv(tsvText);
  if (parseResult.errors.length > 0) {
    return { success: false, message: parseResult.errors.join("; ") };
  }

  const validation = validateTsvRows(parseResult.rows, parseResult.headers);
  if (validation.errors.length > 0) {
    return { success: false, message: validation.errors.join("; ") };
  }

  // 5. Extract stats
  const metricDirection = hypothesis.metric_direction as
    | "lower_is_better"
    | "higher_is_better";
  const stats = extractTsvStats(validation.rows, metricDirection);

  if (stats.baseline_metric === null) {
    return {
      success: false,
      message: 'TSV must contain a baseline row (commit = "baseline").',
    };
  }

  // 6. Upload files to Supabase Storage
  const codeFile = formData.get("code_file") as File | null;
  if (!codeFile) {
    return { success: false, message: "Code file is required." };
  }

  // Generate a temporary run ID for the storage path
  const runId = crypto.randomUUID();
  const storagePath = `${hypothesisId}/${runId}`;

  const [tsvUpload, codeUpload] = await Promise.all([
    admin.storage
      .from("run-files")
      .upload(`${storagePath}/results.tsv`, tsvFile, {
        contentType: "text/tab-separated-values",
        upsert: false,
      }),
    admin.storage
      .from("run-files")
      .upload(`${storagePath}/${codeFile.name}`, codeFile, {
        contentType: "text/plain",
        upsert: false,
      }),
  ]);

  if (tsvUpload.error) {
    return { success: false, message: `TSV upload failed: ${tsvUpload.error.message}` };
  }
  if (codeUpload.error) {
    return { success: false, message: `Code upload failed: ${codeUpload.error.message}` };
  }

  const resultsTsvUrl = admin.storage
    .from("run-files")
    .getPublicUrl(`${storagePath}/results.tsv`).data.publicUrl;
  const codeFileUrl = admin.storage
    .from("run-files")
    .getPublicUrl(`${storagePath}/${codeFile.name}`).data.publicUrl;

  // 7. Insert run
  const { data: run, error: runError } = await admin
    .from("runs")
    .insert({
      id: runId,
      hypothesis_id: hypothesisId,
      user_id: user.id,
      goal: parsed.data.goal,
      hardware: parsed.data.hardware,
      time_budget: parsed.data.time_budget,
      model_size: parsed.data.model_size,
      tag_1: parsed.data.tag_1 || null,
      tag_2: parsed.data.tag_2 || null,
      forked_from: parsed.data.forked_from || null,
      baseline_metric: stats.baseline_metric,
      best_metric: stats.best_metric ?? stats.baseline_metric,
      best_description: stats.best_description ?? "baseline",
      num_experiments: stats.num_experiments,
      num_kept: stats.num_kept,
      num_discarded: stats.num_discarded,
      num_crashed: stats.num_crashed,
      improvement_pct: stats.improvement_pct ?? 0,
      results_tsv_url: resultsTsvUrl,
      code_file_url: codeFileUrl,
      code_filename: codeFile.name,
    })
    .select("id")
    .single();

  if (runError) {
    return { success: false, message: runError.message };
  }

  // 8. Insert experiment rows
  const experimentRows = validation.rows.map((row, index) => ({
    run_id: run.id,
    sequence: index + 1,
    commit_hash: row.commit,
    metric_value: row.metric_value,
    memory_gb: row.memory_gb,
    status: row.status,
    description: row.description,
  }));

  const { error: expError } = await admin
    .from("experiments")
    .insert(experimentRows);

  if (expError) {
    console.error("Failed to insert experiments:", expError.message);
    // Run was created successfully, experiments can be retried
  }

  revalidatePath(hypothesisUrl(hypothesisId));
  redirect(runUrl(run.id));
}
