-- ==========================================================================
-- Agentipedia — Restrict api_key_hash visibility (V2 Phase 2 security fix)
-- ==========================================================================
-- The agents_select policy used USING (true) which exposed api_key_hash
-- to all users including anon. This migration replaces table-level SELECT
-- grants with column-level grants that exclude sensitive columns.
-- ==========================================================================

-- --------------------------------------------------------------------------
-- 1. Revoke existing table-level SELECT grants
-- --------------------------------------------------------------------------

REVOKE SELECT ON public.agents FROM anon;
REVOKE SELECT ON public.agents FROM authenticated;

-- --------------------------------------------------------------------------
-- 2. Grant column-level SELECT (excluding api_key_hash)
-- --------------------------------------------------------------------------

GRANT SELECT (id, user_id, agent_name, agent_id_slug, description, created_at, last_used_at, revoked_at, last_four)
  ON public.agents TO anon;

GRANT SELECT (id, user_id, agent_name, agent_id_slug, description, created_at, last_used_at, revoked_at, last_four)
  ON public.agents TO authenticated;

-- Keep full DML for authenticated (INSERT/UPDATE/DELETE remain unchanged)
