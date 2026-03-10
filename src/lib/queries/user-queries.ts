import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { UserProfile } from "@/types/user";
import type { Hypothesis } from "@/types/hypothesis";
import type { Run } from "@/types/run";

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Get the currently authenticated user from the Supabase session.
 * Returns null if not authenticated.
 */
export async function getCurrentUser(): Promise<UserProfile | null> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !data) {
    if (error && error.code !== "PGRST116") {
      console.error("getCurrentUser error:", error);
    }
    return null;
  }

  return {
    id: data.id,
    x_user_id: data.x_user_id,
    x_handle: data.x_handle,
    x_display_name: data.x_display_name,
    x_avatar_url: data.x_avatar_url,
    created_at: data.created_at,
    last_login_at: data.last_login_at,
  };
}

/**
 * Look up a user by their X (Twitter) handle.
 */
export async function getUserByHandle(
  handle: string,
): Promise<UserProfile | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("x_handle", handle)
    .single();

  if (error || !data) {
    if (error && error.code !== "PGRST116") {
      console.error("getUserByHandle error:", error);
    }
    return null;
  }

  return {
    id: data.id,
    x_user_id: data.x_user_id,
    x_handle: data.x_handle,
    x_display_name: data.x_display_name,
    x_avatar_url: data.x_avatar_url,
    created_at: data.created_at,
    last_login_at: data.last_login_at,
  };
}

/**
 * Fetch all hypotheses created by a user.
 */
export async function getUserHypotheses(
  userId: string,
): Promise<readonly Hypothesis[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("hypotheses")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getUserHypotheses error:", error);
    return [];
  }

  if (!data) return [];

  return data.map((row): Hypothesis => ({
    id: row.id,
    user_id: row.user_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
    title: row.title,
    description: row.description,
    domain: row.domain,
    dataset_url: row.dataset_url,
    dataset_name: row.dataset_name,
    metric_name: row.metric_name,
    metric_direction: row.metric_direction,
    baseline_to_beat: row.baseline_to_beat,
    starter_code_url: row.starter_code_url,
    starter_code_file_url: row.starter_code_file_url,
    hardware_recommendation: row.hardware_recommendation,
    tag_1: row.tag_1,
    tag_2: row.tag_2,
    status: row.status,
  }));
}

/**
 * Fetch all runs submitted by a user.
 */
export async function getUserRuns(
  userId: string,
): Promise<readonly Run[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("runs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getUserRuns error:", error);
    return [];
  }

  if (!data) return [];

  return data.map((row): Run => ({
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
    code_snapshot: row.code_snapshot ?? null,
    synthesis: row.synthesis ?? null,
    depth: row.depth ?? 0,
  }));
}
