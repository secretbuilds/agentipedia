-- Reusable updated_at trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_hypotheses_updated_at
  BEFORE UPDATE ON public.hypotheses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_runs_updated_at
  BEFORE UPDATE ON public.runs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Hypothesis feed view: joins hypothesis + author + aggregated run stats.
-- Powers the feed cards with run_count, best_metric, best_run user.
CREATE OR REPLACE VIEW public.hypothesis_feed AS
SELECT
  h.*,
  u.x_handle       AS author_handle,
  u.x_display_name AS author_display_name,
  u.x_avatar_url   AS author_avatar_url,
  COALESCE(rs.run_count, 0)         AS run_count,
  rs.best_metric_value,
  rs.best_run_user_handle
FROM public.hypotheses h
JOIN public.users u ON u.id = h.user_id
LEFT JOIN LATERAL (
  SELECT
    COUNT(*)::integer AS run_count,
    best_run.best_metric AS best_metric_value,
    best_user.x_handle AS best_run_user_handle
  FROM public.runs r
  LEFT JOIN LATERAL (
    SELECT r2.best_metric AS best_metric, r2.user_id
    FROM public.runs r2
    WHERE r2.hypothesis_id = h.id
    ORDER BY
      CASE WHEN h.metric_direction = 'lower_is_better' THEN r2.best_metric END ASC,
      CASE WHEN h.metric_direction = 'higher_is_better' THEN r2.best_metric END DESC
    LIMIT 1
  ) best_run ON true
  LEFT JOIN public.users best_user ON best_user.id = best_run.user_id
  WHERE r.hypothesis_id = h.id
  GROUP BY best_run.best_metric, best_user.x_handle
) rs ON true;
