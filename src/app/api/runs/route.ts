import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { runSchema } from "@/lib/validators/run-schema";
import { parseTsv } from "@/lib/parsers/tsv-parser";
import { validateTsvRows } from "@/lib/parsers/tsv-validator";
import { extractTsvStats } from "@/lib/parsers/tsv-stats";

/**
 * POST /api/runs — Submit a run via API (CLI/agent endpoint).
 * Auth: Bearer agp_... token or session cookie.
 * Body: multipart/form-data with hypothesis_id, goal, hardware,
 *       time_budget, model_size, results_tsv (file), code_file (file),
 *       and optional tag_1, tag_2, forked_from.
 */
export async function POST(request: Request) {
  // 1. Authenticate
  const authUser = await authenticateRequest(request);
  if (!authUser) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const admin = createAdminClient();

  // 2. Parse multipart form data
  const formData = await request.formData();
  const hypothesisId = formData.get("hypothesis_id") as string;

  if (!hypothesisId) {
    return NextResponse.json(
      { error: "hypothesis_id is required" },
      { status: 400 }
    );
  }

  // 3. Validate form fields
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
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  // 4. Check hypothesis exists and is open
  const { data: hypothesis } = await admin
    .from("hypotheses")
    .select("metric_direction, status")
    .eq("id", hypothesisId)
    .single();

  if (!hypothesis) {
    return NextResponse.json(
      { error: "Hypothesis not found" },
      { status: 404 }
    );
  }
  if (hypothesis.status !== "open") {
    return NextResponse.json(
      { error: "Hypothesis is closed" },
      { status: 400 }
    );
  }

  // 5. Parse and validate TSV
  const tsvFile = formData.get("results_tsv") as File | null;
  if (!tsvFile) {
    return NextResponse.json(
      { error: "results_tsv file is required" },
      { status: 400 }
    );
  }

  const tsvText = await tsvFile.text();
  const parseResult = parseTsv(tsvText);
  if (parseResult.errors.length > 0) {
    return NextResponse.json(
      { error: "TSV parse error", details: parseResult.errors },
      { status: 400 }
    );
  }

  const validation = validateTsvRows(parseResult.rows, parseResult.headers);
  if (validation.errors.length > 0) {
    return NextResponse.json(
      { error: "TSV validation error", details: validation.errors },
      { status: 400 }
    );
  }

  const metricDirection = hypothesis.metric_direction as
    | "lower_is_better"
    | "higher_is_better";
  const stats = extractTsvStats(validation.rows, metricDirection);

  if (stats.baseline_metric === null) {
    return NextResponse.json(
      { error: 'TSV must contain a baseline row (commit = "baseline")' },
      { status: 400 }
    );
  }

  // 6. Upload files
  const codeFile = formData.get("code_file") as File | null;
  if (!codeFile) {
    return NextResponse.json(
      { error: "code_file is required" },
      { status: 400 }
    );
  }

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

  if (tsvUpload.error || codeUpload.error) {
    return NextResponse.json(
      { error: "File upload failed" },
      { status: 500 }
    );
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
      user_id: authUser.id,
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
    return NextResponse.json(
      { error: runError.message },
      { status: 500 }
    );
  }

  // 8. Insert experiments
  const experimentRows = validation.rows.map((row, index) => ({
    run_id: run.id,
    sequence: index + 1,
    commit_hash: row.commit,
    metric_value: row.metric_value,
    memory_gb: row.memory_gb,
    status: row.status,
    description: row.description,
  }));

  await admin.from("experiments").insert(experimentRows);

  return NextResponse.json({
    id: run.id,
    url: `/runs/${run.id}`,
  }, { status: 201 });
}
