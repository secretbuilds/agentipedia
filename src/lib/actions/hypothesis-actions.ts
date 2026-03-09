"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { hypothesisSchema } from "@/lib/validators/hypothesis-schema";
import { hypothesisUrl } from "@/lib/utils/url";

export type HypothesisActionState = {
  success: boolean;
  errors?: Record<string, string[]>;
  message?: string;
};

export async function createHypothesis(
  _prevState: HypothesisActionState,
  formData: FormData
): Promise<HypothesisActionState> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, message: "You must be signed in." };
  }

  const raw = {
    title: formData.get("title"),
    description: formData.get("description"),
    domain: formData.get("domain"),
    dataset_url: formData.get("dataset_url"),
    dataset_name: formData.get("dataset_name"),
    metric_name: formData.get("metric_name"),
    metric_direction: formData.get("metric_direction"),
    baseline_to_beat: formData.get("baseline_to_beat")
      ? Number(formData.get("baseline_to_beat"))
      : "",
    starter_code_url: formData.get("starter_code_url") ?? "",
    hardware_recommendation: formData.get("hardware_recommendation") ?? "",
    tag_1: formData.get("tag_1") ?? "",
    tag_2: formData.get("tag_2") ?? "",
  };

  const parsed = hypothesisSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { data: hypothesis, error } = await supabase
    .from("hypotheses")
    .insert({ ...parsed.data, user_id: user.id })
    .select("id")
    .single();

  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath("/");
  redirect(hypothesisUrl(hypothesis.id));
}

export async function updateHypothesis(
  hypothesisId: string,
  _prevState: HypothesisActionState,
  formData: FormData
): Promise<HypothesisActionState> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, message: "You must be signed in." };
  }

  const raw = {
    title: formData.get("title"),
    description: formData.get("description"),
    domain: formData.get("domain"),
    dataset_url: formData.get("dataset_url"),
    dataset_name: formData.get("dataset_name"),
    metric_name: formData.get("metric_name"),
    metric_direction: formData.get("metric_direction"),
    baseline_to_beat: formData.get("baseline_to_beat")
      ? Number(formData.get("baseline_to_beat"))
      : "",
    starter_code_url: formData.get("starter_code_url") ?? "",
    hardware_recommendation: formData.get("hardware_recommendation") ?? "",
    tag_1: formData.get("tag_1") ?? "",
    tag_2: formData.get("tag_2") ?? "",
  };

  const parsed = hypothesisSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { error } = await supabase
    .from("hypotheses")
    .update(parsed.data)
    .eq("id", hypothesisId)
    .eq("user_id", user.id);

  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath(hypothesisUrl(hypothesisId));
  return { success: true };
}

export async function deleteHypothesis(
  hypothesisId: string
): Promise<HypothesisActionState> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, message: "You must be signed in." };
  }

  const { error } = await supabase
    .from("hypotheses")
    .delete()
    .eq("id", hypothesisId)
    .eq("user_id", user.id);

  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath("/");
  redirect("/");
}
