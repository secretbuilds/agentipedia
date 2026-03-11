-- ---------------------------------------------------------------------------
-- Full-text search for hypotheses
-- ---------------------------------------------------------------------------
-- Adds a generated tsvector column with weighted fields:
--   A = title (most relevant)
--   B = description
--   C = dataset_name, metric_name
-- Uses GIN index for fast full-text search queries.
-- ---------------------------------------------------------------------------

ALTER TABLE public.hypotheses
  ADD COLUMN IF NOT EXISTS search_tsv tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(dataset_name, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(metric_name, '')), 'C')
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_hypotheses_search_tsv
  ON public.hypotheses USING gin (search_tsv);
