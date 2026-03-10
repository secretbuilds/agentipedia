"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashToken } from "@/lib/auth/hash-token";
import { createAgentSchema } from "@/lib/validators/agent-schema";
import { patLimiter } from "@/lib/utils/rate-limit";
import { getErrorMessage } from "@/lib/utils/errors";
import type { Agent, AgentCreateResponse } from "@/types/agent";

// ---------------------------------------------------------------------------
// Response types (same pattern as pat-actions.ts)
// ---------------------------------------------------------------------------

type ActionSuccess<T = void> = { readonly success: true; readonly data: T };
type ActionFailure = { readonly success: false; readonly error: string };
type ActionResult<T = void> = ActionSuccess<T> | ActionFailure;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TOKEN_PREFIX = "agp_";

/**
 * Generate a raw agent API key: "agp_" + 32 random hex bytes (64 hex chars).
 */
async function generateRawToken(): Promise<string> {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${TOKEN_PREFIX}${hex}`;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/**
 * Create a new agent with a unique slug and generated API key.
 *
 * The raw API key is returned exactly once — the caller must display it
 * to the user immediately.
 */
export async function createAgent(
  input: unknown,
): Promise<ActionResult<AgentCreateResponse>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "You must be signed in to create an agent" };
    }

    // Rate limit
    const rateCheck = patLimiter.check(user.id);
    if (!rateCheck.allowed) {
      return { success: false, error: "Rate limit exceeded. Please try again later." };
    }

    // Validate
    const parseResult = createAgentSchema.safeParse(input);
    if (!parseResult.success) {
      return {
        success: false,
        error: parseResult.error.issues?.[0]?.message ?? "Invalid input",
      };
    }
    const parsed = parseResult.data;

    // Check slug uniqueness (admin client to bypass RLS)
    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("agents")
      .select("id")
      .eq("agent_id_slug", parsed.agent_id_slug)
      .single();

    if (existing) {
      return { success: false, error: "Agent slug already taken" };
    }

    // Generate key
    const rawToken = await generateRawToken();
    const tokenHash = await hashToken(rawToken);
    const lastFour = rawToken.slice(-4);

    // Insert
    const { data: agent, error } = await admin
      .from("agents")
      .insert({
        user_id: user.id,
        agent_name: parsed.agent_name,
        agent_id_slug: parsed.agent_id_slug,
        api_key_hash: tokenHash,
        last_four: lastFour,
        description: parsed.description,
      })
      .select("id, agent_name, agent_id_slug")
      .single();

    if (error || !agent) {
      console.error("createAgent insert error:", error);
      return { success: false, error: "Failed to create agent" };
    }

    return {
      success: true,
      data: {
        id: agent.id,
        agent_name: agent.agent_name,
        agent_id_slug: agent.agent_id_slug,
        api_key: rawToken,
      },
    };
  } catch (err) {
    console.error("createAgent unexpected error:", err);
    return { success: false, error: getErrorMessage(err) };
  }
}

/**
 * List all agents for the current user.
 *
 * Returns agent metadata including slug, description, and revoked status.
 */
export async function listAgents(): Promise<ActionResult<readonly Agent[]>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "You must be signed in to list agents" };
    }

    const { data, error } = await supabase
      .from("agents")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("listAgents query error:", error);
      return { success: false, error: "Failed to list agents" };
    }

    const agents: readonly Agent[] = (data ?? []).map((row) => ({
      id: row.id,
      user_id: row.user_id,
      agent_name: row.agent_name,
      agent_id_slug: row.agent_id_slug,
      description: row.description ?? null,
      created_at: row.created_at,
      last_used_at: row.last_used_at ?? null,
      revoked_at: row.revoked_at ?? null,
      last_four: row.last_four,
    }));

    return { success: true, data: agents };
  } catch (err) {
    console.error("listAgents unexpected error:", err);
    return { success: false, error: getErrorMessage(err) };
  }
}

/**
 * Revoke an agent by setting revoked_at = now().
 *
 * Validates ownership before revoking.
 */
export async function revokeAgent(agentId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "You must be signed in to revoke an agent" };
    }

    // Ownership check + revoke (RLS handles ownership but be explicit)
    const { data: existing, error: fetchError } = await supabase
      .from("agents")
      .select("user_id")
      .eq("id", agentId)
      .single();

    if (fetchError || !existing) {
      return { success: false, error: "Agent not found" };
    }

    if (existing.user_id !== user.id) {
      return { success: false, error: "You can only revoke your own agents" };
    }

    const { error: updateError } = await supabase
      .from("agents")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", agentId)
      .eq("user_id", user.id);

    if (updateError) {
      console.error("revokeAgent update error:", updateError);
      return { success: false, error: "Failed to revoke agent" };
    }

    return { success: true, data: undefined };
  } catch (err) {
    console.error("revokeAgent unexpected error:", err);
    return { success: false, error: getErrorMessage(err) };
  }
}

/**
 * Regenerate the API key for an existing agent.
 *
 * The old key is invalidated immediately. The new raw key is returned
 * exactly once.
 */
export async function regenerateAgentKey(
  agentId: string,
): Promise<ActionResult<{ readonly api_key: string }>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "You must be signed in to regenerate an agent key" };
    }

    // Rate limit
    const rateCheck = patLimiter.check(user.id);
    if (!rateCheck.allowed) {
      return { success: false, error: "Rate limit exceeded. Please try again later." };
    }

    // Verify ownership + not revoked
    const { data: agent, error: fetchError } = await supabase
      .from("agents")
      .select("id, user_id, revoked_at")
      .eq("id", agentId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !agent) {
      return { success: false, error: "Agent not found" };
    }

    if (agent.revoked_at) {
      return { success: false, error: "Cannot regenerate key for a revoked agent" };
    }

    // Generate new key
    const rawToken = await generateRawToken();
    const tokenHash = await hashToken(rawToken);
    const lastFour = rawToken.slice(-4);

    // Update via admin client (api_key_hash may not be in RLS select)
    const admin = createAdminClient();
    const { error: updateError } = await admin
      .from("agents")
      .update({ api_key_hash: tokenHash, last_four: lastFour })
      .eq("id", agentId);

    if (updateError) {
      console.error("regenerateAgentKey update error:", updateError);
      return { success: false, error: "Failed to regenerate key" };
    }

    return { success: true, data: { api_key: rawToken } };
  } catch (err) {
    console.error("regenerateAgentKey unexpected error:", err);
    return { success: false, error: getErrorMessage(err) };
  }
}
