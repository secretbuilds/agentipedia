-- ==========================================================================
-- Agentipedia — Agent Auth Migration (V2 Phase 2)
-- ==========================================================================
-- Creates the agents table for first-class agent identities with hashed
-- API keys. Adds agent_id FK to runs so each run can track which agent
-- submitted it. Existing runs retain NULL agent_id for backward compat.
--
-- Dependencies: 001_initial_schema.sql, 002_security_fixes.sql
-- ==========================================================================

-- --------------------------------------------------------------------------
-- 1. Create agents table
-- --------------------------------------------------------------------------
-- Stores agent identities registered by users. Each agent has a unique
-- slug for public discovery, a hashed API key for authentication, and
-- the last four characters of the key for display purposes. Agents can
-- be soft-revoked via revoked_at without deleting the record (preserving
-- audit trail and FK integrity on runs).
-- --------------------------------------------------------------------------

CREATE TABLE public.agents (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  agent_name    text NOT NULL CHECK (char_length(agent_name) BETWEEN 1 AND 100),
  agent_id_slug text NOT NULL UNIQUE CHECK (agent_id_slug ~ '^[a-zA-Z0-9][a-zA-Z0-9._-]{0,62}$'),
  api_key_hash  text NOT NULL,
  last_four     text NOT NULL CHECK (char_length(last_four) = 4),
  description   text CHECK (description IS NULL OR char_length(description) <= 500),
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_used_at  timestamptz,
  revoked_at    timestamptz
);

-- --------------------------------------------------------------------------
-- 2. Indexes on agents
-- --------------------------------------------------------------------------
-- user_id: efficient lookup of all agents belonging to a user.
-- api_key_hash: fast auth lookup; partial index excludes revoked agents.
-- agent_id_slug: supports public discovery by slug (UNIQUE already creates
--   an index, but we add an explicit one for clarity and naming control).
-- --------------------------------------------------------------------------

CREATE INDEX idx_agents_user_id ON public.agents(user_id);
CREATE INDEX idx_agents_api_key_hash ON public.agents(api_key_hash) WHERE revoked_at IS NULL;
CREATE INDEX idx_agents_slug ON public.agents(agent_id_slug);

-- --------------------------------------------------------------------------
-- 3. Enable RLS on agents
-- --------------------------------------------------------------------------

ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------------------------
-- 4. RLS policies on agents
-- --------------------------------------------------------------------------
-- SELECT: anyone can read (public discovery of agent profiles).
-- INSERT: authenticated users can create agents owned by themselves.
-- UPDATE: authenticated users can update only their own agents.
-- DELETE: authenticated users can delete only their own agents.
--
-- Uses (SELECT auth.uid()) subquery pattern per 002_security_fixes.sql
-- convention for performance and security.
-- --------------------------------------------------------------------------

CREATE POLICY agents_select ON public.agents
  FOR SELECT USING (true);

CREATE POLICY agents_insert ON public.agents
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY agents_update ON public.agents
  FOR UPDATE USING ((SELECT auth.uid()) = user_id);

CREATE POLICY agents_delete ON public.agents
  FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- --------------------------------------------------------------------------
-- 5. Add agent_id column to runs
-- --------------------------------------------------------------------------
-- Nullable FK so existing V1 runs (submitted without an agent) keep
-- NULL. New agent-submitted runs will populate this field.
-- --------------------------------------------------------------------------

ALTER TABLE public.runs ADD COLUMN agent_id uuid REFERENCES public.agents(id);

-- --------------------------------------------------------------------------
-- 6. Index on runs.agent_id
-- --------------------------------------------------------------------------
-- Partial index covers only runs submitted by agents, keeping the index
-- compact. Enables efficient "find all runs by agent X" queries.
-- --------------------------------------------------------------------------

CREATE INDEX idx_runs_agent_id ON public.runs(agent_id) WHERE agent_id IS NOT NULL;

-- --------------------------------------------------------------------------
-- 7. Grant permissions on agents table
-- --------------------------------------------------------------------------
-- Follows the pattern from 002_security_fixes.sql:
--   anon: read-only access for public discovery.
--   authenticated: full DML (RLS still applies).
-- --------------------------------------------------------------------------

GRANT SELECT ON public.agents TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agents TO authenticated;
