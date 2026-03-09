import { createServerSupabaseClient } from "./server";
import { createAdminClient } from "./admin";

export type AuthenticatedUser = {
  id: string;
  source: "session" | "pat";
};

/**
 * Authenticate a request from either a browser session or a PAT.
 * Used by API route handlers.
 *
 * 1. Check for Authorization: Bearer agp_... header → SHA-256 lookup
 * 2. Else: check Supabase session cookie
 * 3. If neither: returns null
 */
export async function authenticateRequest(
  request: Request
): Promise<AuthenticatedUser | null> {
  const authHeader = request.headers.get("authorization");

  // PAT authentication
  if (authHeader?.startsWith("Bearer agp_")) {
    const token = authHeader.slice(7); // Remove "Bearer "
    return authenticateWithPat(token);
  }

  // Session authentication
  return authenticateWithSession();
}

async function authenticateWithPat(
  token: string
): Promise<AuthenticatedUser | null> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const tokenHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  const admin = createAdminClient();
  const { data: tokenRow, error } = await admin
    .from("api_tokens")
    .select("user_id")
    .eq("token_hash", tokenHash)
    .is("revoked_at", null)
    .single();

  if (error || !tokenRow) {
    return null;
  }

  // Update last_used_at asynchronously (fire-and-forget)
  admin
    .from("api_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("token_hash", tokenHash)
    .then();

  return { id: tokenRow.user_id, source: "pat" };
}

async function authenticateWithSession(): Promise<AuthenticatedUser | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  return { id: user.id, source: "session" };
}
