-- ==========================================================================
-- Agentipedia — Fix DAG Navigation Views (V2 Phase 1 patch)
-- ==========================================================================
-- Adds missing columns to run_leaves view and run_children function that
-- are expected by the application query layer.
--
-- Bug: run_leaves was missing forked_from and goal columns.
-- Bug: run_children was missing goal column.
-- ==========================================================================

-- --------------------------------------------------------------------------
-- 1. Recreate run_leaves view with missing columns
-- --------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.run_leaves AS
SELECT
  r.id,
  r.hypothesis_id,
  r.user_id,
  r.forked_from,
  r.best_metric,
  r.synthesis,
  r.created_at,
  r.goal,
  r.depth
FROM public.runs r
WHERE NOT EXISTS (
  SELECT 1 FROM public.runs child
  WHERE child.forked_from = r.id
);

-- Re-grant since CREATE OR REPLACE VIEW preserves grants but be safe
GRANT SELECT ON public.run_leaves TO anon;
GRANT SELECT ON public.run_leaves TO authenticated;

-- --------------------------------------------------------------------------
-- 2. Recreate run_children function with goal column
-- --------------------------------------------------------------------------
-- Must DROP first because return type changed (added goal column).
-- CREATE OR REPLACE cannot change return types.
-- --------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.run_children(uuid);

CREATE FUNCTION public.run_children(target_id uuid)
RETURNS TABLE (
  id uuid,
  hypothesis_id uuid,
  user_id uuid,
  best_metric double precision,
  synthesis text,
  created_at timestamptz,
  goal text
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
    r.created_at,
    r.goal
  FROM public.runs r
  WHERE r.forked_from = target_id
  ORDER BY r.created_at ASC;
$$;

COMMENT ON FUNCTION public.run_children(uuid) IS
  'Returns all runs directly forked from the target run, including goal text.';

GRANT EXECUTE ON FUNCTION public.run_children(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.run_children(uuid) TO authenticated;
