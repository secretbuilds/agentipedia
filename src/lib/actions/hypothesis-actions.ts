"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hypothesisSchema } from "@/lib/validators/hypothesis-schema";
import type { HypothesisFormData } from "@/types/hypothesis";
import { getErrorMessage } from "@/lib/utils/errors";

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

type ActionSuccess<T = void> = { readonly success: true; readonly data: T };
type ActionFailure = { readonly success: false; readonly error: string };
type ActionResult<T = void> = ActionSuccess<T> | ActionFailure;

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/**
 * Create a new hypothesis.
 *
 * Validates with Zod, checks authentication, inserts into the hypotheses
 * table, revalidates the homepage, and returns the new hypothesis ID.
 */
export async function createHypothesis(
  formData: HypothesisFormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    // Validate input
    const parsed = hypothesisSchema.safeParse(formData);
    if (!parsed.success) {
      const firstError = parsed.error.issues?.[0]?.message ?? "Validation failed";
      return { success: false, error: firstError };
    }

    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "You must be signed in to create a hypothesis" };
    }

    // Insert
    const { data, error } = await supabase
      .from("hypotheses")
      .insert({
        user_id: user.id,
        title: parsed.data.title,
        description: parsed.data.description,
        domain: parsed.data.domain,
        dataset_url: parsed.data.dataset_url,
        dataset_name: parsed.data.dataset_name,
        metric_name: parsed.data.metric_name,
        metric_direction: parsed.data.metric_direction,
        baseline_to_beat: parsed.data.baseline_to_beat,
        starter_code_url: parsed.data.starter_code_url,
        hardware_recommendation: parsed.data.hardware_recommendation,
        tag_1: parsed.data.tag_1,
        tag_2: parsed.data.tag_2,
        status: "open",
      })
      .select("id")
      .single();

    if (error || !data) {
      console.error("createHypothesis insert error:", error);
      return { success: false, error: "Failed to create hypothesis" };
    }

    revalidatePath("/");

    return { success: true, data: { id: data.id } };
  } catch (err) {
    console.error("createHypothesis unexpected error:", err);
    return { success: false, error: getErrorMessage(err) };
  }
}

/**
 * Update an existing hypothesis.
 *
 * Validates ownership (user_id must match session), validates with Zod,
 * updates the row, and revalidates relevant paths.
 */
export async function updateHypothesis(
  id: string,
  formData: HypothesisFormData,
): Promise<ActionResult> {
  try {
    // Validate input
    const parsed = hypothesisSchema.safeParse(formData);
    if (!parsed.success) {
      const firstError = parsed.error.issues?.[0]?.message ?? "Validation failed";
      return { success: false, error: firstError };
    }

    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "You must be signed in to update a hypothesis" };
    }

    // Ownership check
    const { data: existing, error: fetchError } = await supabase
      .from("hypotheses")
      .select("user_id")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return { success: false, error: "Hypothesis not found" };
    }

    if (existing.user_id !== user.id) {
      return { success: false, error: "You can only edit your own hypotheses" };
    }

    // Update
    const { error: updateError } = await supabase
      .from("hypotheses")
      .update({
        title: parsed.data.title,
        description: parsed.data.description,
        domain: parsed.data.domain,
        dataset_url: parsed.data.dataset_url,
        dataset_name: parsed.data.dataset_name,
        metric_name: parsed.data.metric_name,
        metric_direction: parsed.data.metric_direction,
        baseline_to_beat: parsed.data.baseline_to_beat,
        starter_code_url: parsed.data.starter_code_url,
        hardware_recommendation: parsed.data.hardware_recommendation,
        tag_1: parsed.data.tag_1,
        tag_2: parsed.data.tag_2,
      })
      .eq("id", id);

    if (updateError) {
      console.error("updateHypothesis update error:", updateError);
      return { success: false, error: "Failed to update hypothesis" };
    }

    revalidatePath("/");
    revalidatePath(`/hypotheses/${id}`);

    return { success: true, data: undefined };
  } catch (err) {
    console.error("updateHypothesis unexpected error:", err);
    return { success: false, error: getErrorMessage(err) };
  }
}

/**
 * Delete a hypothesis.
 *
 * Validates ownership, checks that no runs exist (returns error if they do),
 * deletes the hypothesis, and revalidates the homepage.
 */
export async function deleteHypothesis(
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
      return { success: false, error: "You must be signed in to delete a hypothesis" };
    }

    // Ownership check
    const { data: existing, error: fetchError } = await supabase
      .from("hypotheses")
      .select("user_id")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return { success: false, error: "Hypothesis not found" };
    }

    if (existing.user_id !== user.id) {
      return { success: false, error: "You can only delete your own hypotheses" };
    }

    // Check for existing runs
    const { count, error: countError } = await supabase
      .from("runs")
      .select("id", { count: "exact", head: true })
      .eq("hypothesis_id", id);

    if (countError) {
      console.error("deleteHypothesis count error:", countError);
      return { success: false, error: "Failed to check for existing runs" };
    }

    if (count && count > 0) {
      return {
        success: false,
        error: "Cannot delete a hypothesis that has runs. Delete all runs first.",
      };
    }

    // Delete
    const { error: deleteError } = await supabase
      .from("hypotheses")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("deleteHypothesis delete error:", deleteError);
      return { success: false, error: "Failed to delete hypothesis" };
    }

    revalidatePath("/");

    return { success: true, data: undefined };
  } catch (err) {
    console.error("deleteHypothesis unexpected error:", err);
    return { success: false, error: getErrorMessage(err) };
  }
}
