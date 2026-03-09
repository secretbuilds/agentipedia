import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client that bypasses RLS.
 * Used for: PAT validation in API routes, inserting experiments during run submission.
 * NEVER expose this client to the browser.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
