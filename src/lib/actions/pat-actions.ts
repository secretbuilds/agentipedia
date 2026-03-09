"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type PatActionState = {
  success: boolean;
  message?: string;
  token?: string; // Only present on create (shown once)
};

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `agp_${hex}`;
}

async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function createPat(name: string): Promise<PatActionState> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, message: "You must be signed in." };
  }

  if (!name || name.length < 1 || name.length > 100) {
    return { success: false, message: "Token name must be 1-100 characters." };
  }

  const token = generateToken();
  const tokenHash = await hashToken(token);

  const { error } = await supabase.from("api_tokens").insert({
    user_id: user.id,
    token_hash: tokenHash,
    name,
  });

  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath("/settings");
  return { success: true, token };
}

export async function revokePat(tokenId: string): Promise<PatActionState> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, message: "You must be signed in." };
  }

  const { error } = await supabase
    .from("api_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", tokenId)
    .eq("user_id", user.id);

  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath("/settings");
  return { success: true };
}

export async function getMyTokens() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return [];
  }

  const { data } = await supabase
    .from("api_tokens")
    .select("id, name, created_at, last_used_at, revoked_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return data ?? [];
}
