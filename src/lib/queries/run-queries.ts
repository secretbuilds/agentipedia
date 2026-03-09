import { createServerSupabaseClient } from "@/lib/supabase/server";

export type RunSort = "newest" | "best_metric" | "most_improved";

export async function getRunsByHypothesis(
  hypothesisId: string,
  sort: RunSort = "newest"
) {
  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from("runs")
    .select(
      `
      *,
      user:users(id, x_handle, x_display_name, x_avatar_url)
    `
    )
    .eq("hypothesis_id", hypothesisId);

  switch (sort) {
    case "best_metric":
      query = query.order("best_metric", { ascending: true });
      break;
    case "most_improved":
      query = query.order("improvement_pct", { ascending: false });
      break;
    case "newest":
    default:
      query = query.order("created_at", { ascending: false });
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch runs: ${error.message}`);
  }

  return data ?? [];
}

export async function getRunById(id: string) {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("runs")
    .select(
      `
      *,
      user:users(id, x_handle, x_display_name, x_avatar_url),
      hypothesis:hypotheses(id, title, metric_name, metric_direction, domain)
    `
    )
    .eq("id", id)
    .single();

  if (error) {
    return null;
  }

  return data;
}

export async function getExperimentsByRunId(runId: string) {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("experiments")
    .select("*")
    .eq("run_id", runId)
    .order("sequence", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch experiments: ${error.message}`);
  }

  return data ?? [];
}
