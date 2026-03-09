"use server";

import { createClient } from "@/lib/supabase/server";
import { getErrorMessage } from "@/lib/utils/errors";
import { patLimiter } from "@/lib/utils/rate-limit";
import type { PersonalAccessToken, PatCreateResponse } from "@/types/pat";

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

type ActionSuccess<T = void> = { readonly success: true; readonly data: T };
type ActionFailure = { readonly success: false; readonly error: string };
type ActionResult<T = void> = ActionSuccess<T> | ActionFailure;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Generate a raw PAT token: "agp_" + 32 random hex bytes (64 hex chars).
 */
async function generateRawToken(): Promise<string> {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `agp_${hex}`;
}

/**
 * SHA-256 hash of a raw token string. Returns hex digest.
 */
async function hashToken(raw: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(raw);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/**
 * Create a new Personal Access Token.
 *
 * Generates `agp_` + 32 random hex bytes, SHA-256 hashes it, stores the hash,
 * and returns the raw token exactly once.
 */
export async function createPat(
  name: string,
): Promise<ActionResult<PatCreateResponse>> {
  try {
    if (!name || name.trim().length === 0) {
      return { success: false, error: "Token name is required" };
    }

    const trimmedName = name.trim();
    if (trimmedName.length > 100) {
      return { success: false, error: "Token name must be at most 100 characters" };
    }

    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "You must be signed in to create an API token" };
    }

    // Rate limit by user ID (tighter limit for token creation)
    const rateCheck = patLimiter.check(user.id);
    if (!rateCheck.allowed) {
      return { success: false, error: "Rate limit exceeded. Please try again later." };
    }

    // Generate token
    const rawToken = await generateRawToken();
    const tokenHash = await hashToken(rawToken);
    const lastFour = rawToken.slice(-4);

    // Insert into api_tokens
    const { data, error } = await supabase
      .from("api_tokens")
      .insert({
        user_id: user.id,
        name: trimmedName,
        token_hash: tokenHash,
        last_four: lastFour,
      })
      .select("id, name")
      .single();

    if (error || !data) {
      console.error("createPat insert error:", error);
      return { success: false, error: "Failed to create API token" };
    }

    return {
      success: true,
      data: {
        id: data.id,
        name: data.name,
        token: rawToken,
      },
    };
  } catch (err) {
    console.error("createPat unexpected error:", err);
    return { success: false, error: getErrorMessage(err) };
  }
}

/**
 * List all PATs for the current user.
 *
 * Returns name, created_at, last_used_at, revoked status, and last 4 characters.
 */
export async function listPats(): Promise<ActionResult<readonly PersonalAccessToken[]>> {
  try {
    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "You must be signed in to list API tokens" };
    }

    const { data, error } = await supabase
      .from("api_tokens")
      .select("id, user_id, name, created_at, last_used_at, revoked_at, last_four")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("listPats query error:", error);
      return { success: false, error: "Failed to list API tokens" };
    }

    const tokens: PersonalAccessToken[] = (data ?? []).map((row) => ({
      id: row.id,
      user_id: row.user_id,
      name: row.name,
      created_at: row.created_at,
      last_used_at: row.last_used_at,
      revoked_at: row.revoked_at,
      last_four: row.last_four,
    }));

    return { success: true, data: tokens };
  } catch (err) {
    console.error("listPats unexpected error:", err);
    return { success: false, error: getErrorMessage(err) };
  }
}

/**
 * Revoke a PAT by setting revoked_at = now().
 *
 * Validates ownership before revoking.
 */
export async function revokePat(
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
      return { success: false, error: "You must be signed in to revoke an API token" };
    }

    // Ownership check
    const { data: existing, error: fetchError } = await supabase
      .from("api_tokens")
      .select("user_id")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return { success: false, error: "API token not found" };
    }

    if (existing.user_id !== user.id) {
      return { success: false, error: "You can only revoke your own API tokens" };
    }

    // Revoke
    const { error: updateError } = await supabase
      .from("api_tokens")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", id);

    if (updateError) {
      console.error("revokePat update error:", updateError);
      return { success: false, error: "Failed to revoke API token" };
    }

    return { success: true, data: undefined };
  } catch (err) {
    console.error("revokePat unexpected error:", err);
    return { success: false, error: getErrorMessage(err) };
  }
}
