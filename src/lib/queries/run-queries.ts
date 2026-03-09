import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { RunCard, RunDetail } from "@/types/run";
import type { Experiment } from "@/types/experiment";
import type { UserSummary } from "@/types/user";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RunSortOption = "best" | "newest" | "most_improved";

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Fetch all runs for a given hypothesis.
 *
 * Sort options:
 *  - "best"           — best_metric ASC or DESC depending on hypothesis direction
 *  - "newest"         — created_at DESC
 *  - "most_improved"  — improvement_pct DESC
 */
export async function getRunsByHypothesis(
  hypothesisId: string,
  sort: RunSortOption = "newest",
): Promise<readonly RunCard[]> {
  const supabase = await createClient();

  // We need hypothesis direction for "best" sort
  let metricDirection: string | null = null;
  if (sort === "best") {
    const { data: hypothesis } = await supabase
      .from("hypotheses")
      .select("metric_direction")
      .eq("id", hypothesisId)
      .single();
    metricDirection = hypothesis?.metric_direction ?? null;
  }

  let query = supabase
    .from("runs")
    .select(`
      *,
      users!runs_user_id_fkey (
        x_handle,
        x_display_name,
        x_avatar_url
      )
    `)
    .eq("hypothesis_id", hypothesisId);

  switch (sort) {
    case "best":
      query = query.order("best_metric", {
        ascending: metricDirection === "lower_is_better",
      });
      break;
    case "most_improved":
      query = query.order("improvement_pct", { ascending: false });
      break;
    case "newest":
    default:
      query = query.order("created_at", { ascending: false });
      break;
  }

  const { data, error } = await query;

  if (error) {
    console.error("getRunsByHypothesis error:", error);
    return [];
  }

  if (!data) return [];

  return data.map((row): RunCard => {
    const userRow = row.users as unknown as UserSummary | null;
    return {
      id: row.id,
      hypothesis_id: row.hypothesis_id,
      user_id: row.user_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      goal: row.goal,
      hardware: row.hardware,
      time_budget: row.time_budget,
      model_size: row.model_size,
      tag_1: row.tag_1,
      tag_2: row.tag_2,
      forked_from: row.forked_from,
      baseline_metric: row.baseline_metric,
      best_metric: row.best_metric,
      best_description: row.best_description,
      num_experiments: row.num_experiments,
      num_kept: row.num_kept,
      num_discarded: row.num_discarded,
      num_crashed: row.num_crashed,
      improvement_pct: row.improvement_pct,
      results_tsv_url: row.results_tsv_url,
      code_file_url: row.code_file_url,
      code_filename: row.code_filename,
      user: userRow ?? {
        x_handle: "",
        x_display_name: "",
        x_avatar_url: "",
      },
    };
  });
}

/**
 * Fetch a single run by ID with user info and parent hypothesis context.
 */
export async function getRunById(
  id: string,
): Promise<RunDetail | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("runs")
    .select(`
      *,
      users!runs_user_id_fkey (
        x_handle,
        x_display_name,
        x_avatar_url
      ),
      hypotheses!runs_hypothesis_id_fkey (
        title,
        metric_name,
        metric_direction,
        domain
      )
    `)
    .eq("id", id)
    .single();

  if (error || !data) {
    if (error && error.code !== "PGRST116") {
      console.error("getRunById error:", error);
    }
    return null;
  }

  const userRow = data.users as unknown as UserSummary | null;
  const hypothesisRow = data.hypotheses as unknown as {
    title: string;
    metric_name: string;
    metric_direction: string;
    domain: string;
  } | null;

  return {
    id: data.id,
    hypothesis_id: data.hypothesis_id,
    user_id: data.user_id,
    created_at: data.created_at,
    updated_at: data.updated_at,
    goal: data.goal,
    hardware: data.hardware,
    time_budget: data.time_budget,
    model_size: data.model_size,
    tag_1: data.tag_1,
    tag_2: data.tag_2,
    forked_from: data.forked_from,
    baseline_metric: data.baseline_metric,
    best_metric: data.best_metric,
    best_description: data.best_description,
    num_experiments: data.num_experiments,
    num_kept: data.num_kept,
    num_discarded: data.num_discarded,
    num_crashed: data.num_crashed,
    improvement_pct: data.improvement_pct,
    results_tsv_url: data.results_tsv_url,
    code_file_url: data.code_file_url,
    code_filename: data.code_filename,
    user: userRow ?? {
      x_handle: "",
      x_display_name: "",
      x_avatar_url: "",
    },
    hypothesis_title: hypothesisRow?.title ?? "",
    hypothesis_metric_name: hypothesisRow?.metric_name ?? "",
    hypothesis_metric_direction: hypothesisRow?.metric_direction ?? "",
    hypothesis_domain: hypothesisRow?.domain ?? "",
  };
}

/**
 * Fetch all experiments for a run, ordered by sequence ASC.
 */
export async function getExperimentsByRunId(
  runId: string,
): Promise<readonly Experiment[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("experiments")
    .select("*")
    .eq("run_id", runId)
    .order("sequence", { ascending: true });

  if (error) {
    console.error("getExperimentsByRunId error:", error);
    return [];
  }

  if (!data) return [];

  return data.map((row): Experiment => ({
    id: row.id,
    run_id: row.run_id,
    sequence: row.sequence,
    commit_hash: row.commit_hash,
    metric_value: row.metric_value,
    memory_gb: row.memory_gb,
    status: row.status,
    description: row.description,
  }));
}
