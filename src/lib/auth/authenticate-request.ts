import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { UserProfile } from "@/types/user";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuthenticatedUser {
  readonly userId: string;
  readonly user: UserProfile;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PAT_PREFIX = "agp_";

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
// Main
// ---------------------------------------------------------------------------

/**
 * Authenticate an incoming request.
 *
 * Strategy:
 * 1. Check Authorization header for `Bearer agp_...` — PAT-based auth.
 *    Hash the token and look it up in `api_tokens` via the admin client.
 * 2. Fall back to Supabase session auth (cookie-based).
 *
 * Returns the authenticated user or null if unauthenticated.
 */
export async function authenticateRequest(
  request: Request,
): Promise<AuthenticatedUser | null> {
  // ----- Strategy 1: PAT auth via Authorization header -----
  const authHeader = request.headers.get("authorization");

  if (authHeader) {
    const parts = authHeader.split(" ");
    if (parts.length === 2 && parts[0] === "Bearer" && parts[1].startsWith(PAT_PREFIX)) {
      const rawToken = parts[1];
      const tokenHash = await hashToken(rawToken);
      const admin = createAdminClient();

      // Look up the token by hash
      const { data: tokenRow, error: tokenError } = await admin
        .from("api_tokens")
        .select("id, user_id, revoked_at")
        .eq("token_hash", tokenHash)
        .single();

      if (tokenError || !tokenRow) {
        return null;
      }

      // Reject revoked tokens
      if (tokenRow.revoked_at) {
        return null;
      }

      // Fetch the user profile
      const { data: userRow, error: userError } = await admin
        .from("users")
        .select("*")
        .eq("id", tokenRow.user_id)
        .single();

      if (userError || !userRow) {
        return null;
      }

      // Update last_used_at (fire-and-forget, don't block the response)
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
        userId: userRow.id,
        user: {
          id: userRow.id,
          x_user_id: userRow.x_user_id,
          x_handle: userRow.x_handle,
          x_display_name: userRow.x_display_name,
          x_avatar_url: userRow.x_avatar_url,
          created_at: userRow.created_at,
          last_login_at: userRow.last_login_at,
        },
      };
    }
  }

  // ----- Strategy 2: Session auth -----
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
    userId: userRow.id,
    user: {
      id: userRow.id,
      x_user_id: userRow.x_user_id,
      x_handle: userRow.x_handle,
      x_display_name: userRow.x_display_name,
      x_avatar_url: userRow.x_avatar_url,
      created_at: userRow.created_at,
      last_login_at: userRow.last_login_at,
    },
  };
}
