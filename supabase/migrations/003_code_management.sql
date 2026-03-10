-- ==========================================================================
-- Agentipedia — Code Management Migration (V2 Phase 1)
-- ==========================================================================
-- Adds code snapshot, synthesis, and depth columns to runs. Creates DAG
-- navigation primitives: depth trigger, run_leaves view, and
-- run_lineage/run_children/best_path functions.
--
-- Dependencies: 001_initial_schema.sql, 002_security_fixes.sql
-- ==========================================================================

-- --------------------------------------------------------------------------
-- 1. Add code_snapshot JSONB column to runs
-- --------------------------------------------------------------------------
-- Stores the full code snapshot as {"filename.py": "code content", ...}.
-- Multi-file agents submit multiple keys; single-file agents submit one.
-- Nullable for backward compatibility with existing runs that only have
-- code_file_url. The CHECK constraint caps serialized size at 5MB
-- (5,242,880 bytes) to prevent abuse while allowing realistic code bundles.
-- --------------------------------------------------------------------------

ALTER TABLE public.runs
  ADD COLUMN code_snapshot jsonb;

ALTER TABLE public.runs
  ADD CONSTRAINT runs_code_snapshot_size
    CHECK (code_snapshot IS NULL OR pg_column_size(code_snapshot) <= 5242880);

-- --------------------------------------------------------------------------
-- 2. Add synthesis TEXT column to runs
-- --------------------------------------------------------------------------
-- Agent's 2-3 sentence summary of what changed, why, and the result.
-- Displayed in DAG visualization, leaves view, and lineage output.
-- Max 2000 characters keeps it concise while allowing meaningful summaries.
-- --------------------------------------------------------------------------

ALTER TABLE public.runs
  ADD COLUMN synthesis text;

ALTER TABLE public.runs
  ADD CONSTRAINT runs_synthesis_length
    CHECK (synthesis IS NULL OR char_length(synthesis) <= 2000);

-- --------------------------------------------------------------------------
-- 3. Add depth INTEGER column to runs
-- --------------------------------------------------------------------------
-- Tracks how many ancestors a run has via the forked_from chain.
-- depth = 0 means root (no parent), depth = 1 means forked once, etc.
-- Stored as a materialized column rather than computed on the fly for
-- efficient queries. Maintained by the compute_run_depth trigger.
-- --------------------------------------------------------------------------

ALTER TABLE public.runs
  ADD COLUMN depth integer NOT NULL DEFAULT 0;

-- --------------------------------------------------------------------------
-- 4. GIN index on code_snapshot using jsonb_path_ops
-- --------------------------------------------------------------------------
-- Enables key-existence and containment queries on the JSONB structure
-- (e.g., "find runs that include a config.yaml file"). The partial index
-- avoids wasting space on runs without snapshots.
-- --------------------------------------------------------------------------

CREATE INDEX idx_runs_code_snapshot_keys
  ON public.runs USING gin (code_snapshot jsonb_path_ops)
  WHERE code_snapshot IS NOT NULL;

-- --------------------------------------------------------------------------
-- 5. compute_run_depth() trigger function
-- --------------------------------------------------------------------------
-- Sets depth = parent.depth + 1 on INSERT. If forked_from is NULL,
-- depth stays at the default of 0.
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.compute_run_depth()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.forked_from IS NOT NULL THEN
    SELECT r.depth + 1
      INTO NEW.depth
      FROM public.runs r
     WHERE r.id = NEW.forked_from;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.compute_run_depth() IS
  'BEFORE INSERT trigger that sets depth = parent.depth + 1 when forked_from is set.';

-- --------------------------------------------------------------------------
-- 6. trg_runs_compute_depth — BEFORE INSERT trigger
-- --------------------------------------------------------------------------

CREATE TRIGGER trg_runs_compute_depth
  BEFORE INSERT ON public.runs
  FOR EACH ROW
  EXECUTE FUNCTION public.compute_run_depth();

-- --------------------------------------------------------------------------
-- 7. Backfill depth for existing runs using recursive CTE
-- --------------------------------------------------------------------------
-- Walks the forked_from chain starting from root runs (forked_from IS NULL)
-- downward. Updates each run's depth to match its position in the chain.
-- --------------------------------------------------------------------------

WITH RECURSIVE ancestry AS (
  -- Base case: root runs have depth 0
  SELECT id, 0 AS depth
    FROM public.runs
   WHERE forked_from IS NULL

  UNION ALL

  -- Recursive case: child depth = parent depth + 1
  SELECT r.id, a.depth + 1
    FROM public.runs r
   INNER JOIN ancestry a ON a.id = r.forked_from
)
UPDATE public.runs
   SET depth = ancestry.depth
  FROM ancestry
 WHERE public.runs.id = ancestry.id;

-- --------------------------------------------------------------------------
-- 8. run_leaves view — frontier runs nobody has forked
-- --------------------------------------------------------------------------
-- A "leaf" is a run where no other run has forked_from pointing to it.
-- These are the active edges of exploration — the starting points for
-- new agent work.
--
-- Uses the stored depth column rather than computing it on the fly.
-- The anti-join pattern (NOT EXISTS) is efficient because the
-- idx_runs_forked_from partial index covers the lookup.
-- --------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.run_leaves AS
SELECT
  r.id,
  r.hypothesis_id,
  r.user_id,
  r.best_metric,
  r.synthesis,
  r.created_at,
  r.depth
FROM public.runs r
WHERE NOT EXISTS (
  SELECT 1 FROM public.runs child
  WHERE child.forked_from = r.id
);

-- --------------------------------------------------------------------------
-- 9. run_lineage(target_id UUID) — recursive ancestor chain
-- --------------------------------------------------------------------------
-- Walks from the target run back to the root via forked_from links.
-- Returns the full ancestor chain ordered by depth DESC (root first).
--
-- STABLE: the function does not modify data and returns consistent
-- results within a single statement.
--
-- Safety: depth guard of 1000 as a defensive measure against any
-- unexpected circular references.
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.run_lineage(target_id uuid)
RETURNS TABLE (
  id uuid,
  hypothesis_id uuid,
  forked_from uuid,
  best_metric double precision,
  synthesis text,
  created_at timestamptz,
  depth integer
)
LANGUAGE sql
STABLE
AS $$
  WITH RECURSIVE chain AS (
    -- Anchor: the target run
    SELECT
      r.id,
      r.hypothesis_id,
      r.forked_from,
      r.best_metric,
      r.synthesis,
      r.created_at,
      r.depth
    FROM public.runs r
    WHERE r.id = target_id

    UNION ALL

    -- Walk up to the parent
    SELECT
      r.id,
      r.hypothesis_id,
      r.forked_from,
      r.best_metric,
      r.synthesis,
      r.created_at,
      r.depth
    FROM public.runs r
    INNER JOIN chain c ON r.id = c.forked_from
    WHERE c.depth > -1000  -- defensive depth guard (depth decreases toward root)
  )
  SELECT
    chain.id,
    chain.hypothesis_id,
    chain.forked_from,
    chain.best_metric,
    chain.synthesis,
    chain.created_at,
    chain.depth
  FROM chain
  ORDER BY chain.depth ASC;
$$;

COMMENT ON FUNCTION public.run_lineage(uuid) IS
  'Returns the full ancestor chain from target_id back to the root run, '
  'ordered by depth ASC (root first). Uses a depth guard of 1000.';

-- --------------------------------------------------------------------------
-- 10. run_children(target_id UUID) — direct children of a run
-- --------------------------------------------------------------------------
-- Simple query returning all runs that were forked from the target.
-- Useful for agents to see what has already been tried on top of a run
-- before deciding whether to fork it.
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.run_children(target_id uuid)
RETURNS TABLE (
  id uuid,
  hypothesis_id uuid,
  user_id uuid,
  best_metric double precision,
  synthesis text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    r.id,
    r.hypothesis_id,
    r.user_id,
    r.best_metric,
    r.synthesis,
    r.created_at
  FROM public.runs r
  WHERE r.forked_from = target_id
  ORDER BY r.created_at ASC;
$$;

COMMENT ON FUNCTION public.run_children(uuid) IS
  'Returns all runs directly forked from the target run.';

-- --------------------------------------------------------------------------
-- 11. best_path(hypothesis_id, metric_direction) — winning lineage
-- --------------------------------------------------------------------------
-- Finds the best-scoring leaf run for a hypothesis (respecting metric
-- direction) and returns its full ancestor chain via run_lineage.
--
-- metric_direction must be 'lower_is_better' or 'higher_is_better'.
-- If no runs exist for the hypothesis, returns an empty result set.
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.best_path(
  p_hypothesis_id uuid,
  p_metric_direction text
)
RETURNS TABLE (
  id uuid,
  hypothesis_id uuid,
  forked_from uuid,
  best_metric double precision,
  synthesis text,
  created_at timestamptz,
  depth integer
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    lin.id,
    lin.hypothesis_id,
    lin.forked_from,
    lin.best_metric,
    lin.synthesis,
    lin.created_at,
    lin.depth
  FROM public.run_lineage(
    (
      SELECT r.id
      FROM public.runs r
      WHERE r.hypothesis_id = p_hypothesis_id
      ORDER BY
        CASE WHEN p_metric_direction = 'lower_is_better'
             THEN r.best_metric END ASC,
        CASE WHEN p_metric_direction = 'higher_is_better'
             THEN r.best_metric END DESC
      LIMIT 1
    )
  ) lin;
$$;

COMMENT ON FUNCTION public.best_path(uuid, text) IS
  'Returns the full ancestor chain from the best-scoring run for a hypothesis. '
  'p_metric_direction must be ''lower_is_better'' or ''higher_is_better''.';

-- --------------------------------------------------------------------------
-- 12. Grant SELECT on run_leaves view to anon and authenticated
-- --------------------------------------------------------------------------

GRANT SELECT ON public.run_leaves TO anon;
GRANT SELECT ON public.run_leaves TO authenticated;

-- --------------------------------------------------------------------------
-- 13. Grant EXECUTE on all 3 functions to anon and authenticated
-- --------------------------------------------------------------------------

GRANT EXECUTE ON FUNCTION public.run_lineage(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.run_lineage(uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.run_children(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.run_children(uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.best_path(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION public.best_path(uuid, text) TO authenticated;
