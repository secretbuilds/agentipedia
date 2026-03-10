import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { hashToken } from "@/lib/auth/hash-token";
import type { UserProfile } from "@/types/user";
import type { Agent } from "@/types/agent";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** @deprecated Use `AuthResult` instead. */
export interface AuthenticatedUser {
  readonly userId: string;
  readonly user: UserProfile;
}

/** Discriminated union returned by `authenticateRequest`. */
export type AuthResult =
  | { readonly kind: "user"; readonly userId: string; readonly user: UserProfile }
  | { readonly kind: "agent"; readonly userId: string; readonly user: UserProfile; readonly agent: Agent }
  | { readonly kind: "pat"; readonly userId: string; readonly user: UserProfile };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PAT_PREFIX = "agp_";

function buildUserProfile(row: {
  id: string;
  x_user_id: string;
  x_handle: string;
  x_display_name: string;
  x_avatar_url: string;
  created_at: string;
  last_login_at: string;
}): UserProfile {
  return {
    id: row.id,
    x_user_id: row.x_user_id,
    x_handle: row.x_handle,
    x_display_name: row.x_display_name,
    x_avatar_url: row.x_avatar_url,
    created_at: row.created_at,
    last_login_at: row.last_login_at,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

/**
 * Authenticate an incoming request.
 *
 * Resolution order for Bearer `agp_` tokens:
 * 1. Agent auth — hash the token, look up in `agents` by `api_key_hash`
 *    where `revoked_at IS NULL`. If found, return kind "agent".
 * 2. PAT auth — fall through to `api_tokens` lookup. Return kind "pat".
 *
 * If no Bearer header is present:
 * 3. Session auth — Supabase cookie-based auth. Return kind "user".
 *
 * Returns null if unauthenticated.
 */
export async function authenticateRequest(
  request: Request,
): Promise<AuthResult | null> {
  const authHeader = request.headers.get("authorization");

  if (authHeader) {
    const parts = authHeader.split(" ");
    if (parts.length === 2 && parts[0] === "Bearer" && parts[1].startsWith(PAT_PREFIX)) {
      const rawToken = parts[1];
      const tokenHash = await hashToken(rawToken);
      const admin = createAdminClient();

      // ----- Strategy 1: Agent auth -----
      const { data: agentRow, error: agentError } = await admin
        .from("agents")
        .select("id, user_id, agent_name, agent_id_slug, description, created_at, last_used_at, revoked_at, last_four")
        .eq("api_key_hash", tokenHash)
        .is("revoked_at", null)
        .single();

      if (!agentError && agentRow) {
        // Fetch the agent owner's profile
        const { data: ownerRow, error: ownerError } = await admin
          .from("users")
          .select("*")
          .eq("id", agentRow.user_id)
          .single();

        if (ownerError || !ownerRow) {
          return null;
        }

        // Update last_used_at (fire-and-forget)
        admin
          .from("agents")
          .update({ last_used_at: new Date().toISOString() })
          .eq("id", agentRow.id)
          .then(({ error }) => {
            if (error) {
              console.error("Failed to update last_used_at for agent:", error);
            }
          });

        const agent: Agent = {
          id: agentRow.id,
          user_id: agentRow.user_id,
          agent_name: agentRow.agent_name,
          agent_id_slug: agentRow.agent_id_slug,
          description: agentRow.description,
          created_at: agentRow.created_at,
          last_used_at: agentRow.last_used_at,
          revoked_at: agentRow.revoked_at,
          last_four: agentRow.last_four,
        };

        return {
          kind: "agent",
          userId: agentRow.user_id,
          user: buildUserProfile(ownerRow),
          agent,
        };
      }

      // ----- Strategy 2: PAT auth -----
      const { data: tokenRow, error: tokenError } = await admin
        .from("api_tokens")
        .select("id, user_id, revoked_at")
        .eq("token_hash", tokenHash)
        .single();

      if (tokenError || !tokenRow) {
        return null;
      }

      if (tokenRow.revoked_at) {
        return null;
      }

      const { data: userRow, error: userError } = await admin
        .from("users")
        .select("*")
        .eq("id", tokenRow.user_id)
        .single();

      if (userError || !userRow) {
        return null;
      }

      // Update last_used_at (fire-and-forget)
      admin
        .from("api_tokens")
        .update({ last_used_at: new Date().toISOString() })
        .eq("id", tokenRow.id)
        .then(({ error }) => {
          if (error) {
            console.error("Failed to update last_used_at for PAT:", error);
          }
        });

      return {
        kind: "pat",
        userId: userRow.id,
        user: buildUserProfile(userRow),
      };
    }
  }

  // ----- Strategy 3: Session auth -----
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  const { data: userRow, error: userError } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (userError || !userRow) {
    return null;
  }

  return {
    kind: "user",
    userId: userRow.id,
    user: buildUserProfile(userRow),
  };
}
