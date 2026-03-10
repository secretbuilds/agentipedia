-- ==========================================================================
-- Agentipedia — Security Fixes Migration
-- ==========================================================================
-- Fixes:
--   1. CRITICAL: Remove overly permissive storage delete policy
--   2. CRITICAL: Wrap all auth.uid() calls in subqueries for performance/security
--   3. HIGH: Remove overly permissive storage insert policy
--   4. MEDIUM: Add explicit GRANT/REVOKE statements
-- ==========================================================================

-- --------------------------------------------------------------------------
-- 1. CRITICAL: Drop overly permissive storage delete policy
-- --------------------------------------------------------------------------
-- The run_files_delete policy allowed ANY authenticated user to delete ANY
-- file in the run-files bucket. Since the application uses the admin/service
-- role client for all storage operations, user-level delete access is
-- unnecessary and dangerous. Removing the policy means only the service role
-- (admin client) can delete files.
-- --------------------------------------------------------------------------

DROP POLICY IF EXISTS run_files_delete ON storage.objects;

-- --------------------------------------------------------------------------
-- 2. HIGH: Drop overly permissive storage insert policy
-- --------------------------------------------------------------------------
-- Same rationale as delete: uploads go through the admin client (service
-- role), so user-level insert access is unnecessary. Removing the policy
-- restricts uploads to the service role only.
-- --------------------------------------------------------------------------

DROP POLICY IF EXISTS run_files_insert ON storage.objects;

-- --------------------------------------------------------------------------
-- 3. CRITICAL: Recreate all 13 RLS policies with (SELECT auth.uid())
-- --------------------------------------------------------------------------
-- Using auth.uid() directly in a policy causes Postgres to re-evaluate
-- the function for every row. Wrapping it in a subquery —
-- (SELECT auth.uid()) — allows the planner to evaluate it once and reuse
-- the result, improving both performance and security (prevents certain
-- timing-based attacks on the auth function).
-- --------------------------------------------------------------------------

-- ---- USERS ----

DROP POLICY IF EXISTS users_insert ON public.users;
CREATE POLICY users_insert ON public.users
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS users_update ON public.users;
CREATE POLICY users_update ON public.users
  FOR UPDATE USING ((SELECT auth.uid()) = id);

-- ---- API TOKENS ----

DROP POLICY IF EXISTS api_tokens_select ON public.api_tokens;
CREATE POLICY api_tokens_select ON public.api_tokens
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS api_tokens_insert ON public.api_tokens;
CREATE POLICY api_tokens_insert ON public.api_tokens
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS api_tokens_update ON public.api_tokens;
CREATE POLICY api_tokens_update ON public.api_tokens
  FOR UPDATE USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS api_tokens_delete ON public.api_tokens;
CREATE POLICY api_tokens_delete ON public.api_tokens
  FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- ---- HYPOTHESES ----

DROP POLICY IF EXISTS hypotheses_insert ON public.hypotheses;
CREATE POLICY hypotheses_insert ON public.hypotheses
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS hypotheses_update ON public.hypotheses;
CREATE POLICY hypotheses_update ON public.hypotheses
  FOR UPDATE USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS hypotheses_delete ON public.hypotheses;
CREATE POLICY hypotheses_delete ON public.hypotheses
  FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- ---- RUNS ----

DROP POLICY IF EXISTS runs_insert ON public.runs;
CREATE POLICY runs_insert ON public.runs
  FOR INSERT WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.hypotheses h
      WHERE h.id = hypothesis_id AND h.status = 'open'
    )
  );

DROP POLICY IF EXISTS runs_update ON public.runs;
CREATE POLICY runs_update ON public.runs
  FOR UPDATE USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS runs_delete ON public.runs;
CREATE POLICY runs_delete ON public.runs
  FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- ---- EXPERIMENTS ----

DROP POLICY IF EXISTS experiments_insert ON public.experiments;
CREATE POLICY experiments_insert ON public.experiments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.runs r
      WHERE r.id = run_id AND r.user_id = (SELECT auth.uid())
    )
  );

-- --------------------------------------------------------------------------
-- 4. MEDIUM: Explicit GRANT/REVOKE statements
-- --------------------------------------------------------------------------
-- Tighten public schema permissions so only the roles that need access
-- have it. The anon role gets read-only access to public-facing tables
-- and the feed view. The authenticated role gets full DML on tables they
-- interact with. Service role inherits superuser-like access by default.
-- --------------------------------------------------------------------------

-- Revoke default broad privileges on public schema
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;

-- Anon: read-only access to public-facing data
GRANT SELECT ON public.users TO anon;
GRANT SELECT ON public.hypotheses TO anon;
GRANT SELECT ON public.runs TO anon;
GRANT SELECT ON public.experiments TO anon;
GRANT SELECT ON public.hypothesis_feed TO anon;

-- Authenticated: full DML on tables they interact with (RLS still applies)
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_tokens TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hypotheses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.runs TO authenticated;
GRANT SELECT, INSERT ON public.experiments TO authenticated;
GRANT SELECT ON public.hypothesis_feed TO authenticated;

-- Grant usage on sequences so inserts with gen_random_uuid() work
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
