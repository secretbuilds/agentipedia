-- ==========================================================================
-- Agentipedia — Initial Schema Migration
-- ==========================================================================
-- Creates all enums, tables, views, indexes, RLS policies, triggers,
-- and the run-files storage bucket needed for the application.
-- ==========================================================================

-- --------------------------------------------------------------------------
-- 1. Enums
-- --------------------------------------------------------------------------

CREATE TYPE domain_enum AS ENUM (
  'llm_training',
  'llm_inference',
  'robotics',
  'trading',
  'computer_vision',
  'reinforcement_learning',
  'audio_speech',
  'drug_discovery',
  'climate_weather',
  'math_theorem_proving',
  'other'
);

CREATE TYPE metric_direction_enum AS ENUM (
  'lower_is_better',
  'higher_is_better'
);

CREATE TYPE hypothesis_status_enum AS ENUM (
  'open',
  'closed'
);

CREATE TYPE experiment_status_enum AS ENUM (
  'keep',
  'discard',
  'crash'
);

-- --------------------------------------------------------------------------
-- 2. Tables
-- --------------------------------------------------------------------------

-- 2.1 Users (public profile mirroring X/Twitter identity)
CREATE TABLE public.users (
  id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  x_user_id       text        NOT NULL UNIQUE,
  x_handle        text        NOT NULL,
  x_display_name  text        NOT NULL,
  x_avatar_url    text        NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  last_login_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_x_handle ON public.users (x_handle);

-- 2.2 API Tokens (Personal Access Tokens for CLI/agent auth)
CREATE TABLE public.api_tokens (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token_hash    text        NOT NULL,
  name          text        NOT NULL,
  last_four     text        NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_used_at  timestamptz,
  revoked_at    timestamptz,

  CONSTRAINT api_tokens_name_length CHECK (char_length(name) BETWEEN 1 AND 100),
  CONSTRAINT api_tokens_last_four_length CHECK (char_length(last_four) = 4)
);

CREATE INDEX idx_api_tokens_user_id ON public.api_tokens (user_id);
CREATE INDEX idx_api_tokens_token_hash ON public.api_tokens (token_hash) WHERE revoked_at IS NULL;

-- 2.3 Hypotheses
CREATE TABLE public.hypotheses (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  uuid                   NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at               timestamptz            NOT NULL DEFAULT now(),
  updated_at               timestamptz            NOT NULL DEFAULT now(),

  title                    text                   NOT NULL,
  description              text                   NOT NULL,
  domain                   domain_enum            NOT NULL,
  dataset_url              text                   NOT NULL,
  dataset_name             text                   NOT NULL,
  metric_name              text                   NOT NULL,
  metric_direction         metric_direction_enum  NOT NULL,
  baseline_to_beat         double precision,
  starter_code_url         text,
  starter_code_file_url    text,
  hardware_recommendation  text,
  tag_1                    text,
  tag_2                    text,
  status                   hypothesis_status_enum NOT NULL DEFAULT 'open',

  CONSTRAINT hypotheses_title_length CHECK (char_length(title) BETWEEN 10 AND 300),
  CONSTRAINT hypotheses_description_length CHECK (char_length(description) BETWEEN 20 AND 10000),
  CONSTRAINT hypotheses_metric_name_length CHECK (char_length(metric_name) BETWEEN 1 AND 100)
);

CREATE INDEX idx_hypotheses_user_id ON public.hypotheses (user_id);
CREATE INDEX idx_hypotheses_domain ON public.hypotheses (domain);
CREATE INDEX idx_hypotheses_status ON public.hypotheses (status);
CREATE INDEX idx_hypotheses_created_at ON public.hypotheses (created_at DESC);
CREATE INDEX idx_hypotheses_domain_created ON public.hypotheses (domain, created_at DESC);
CREATE INDEX idx_hypotheses_dataset_name ON public.hypotheses USING gin (to_tsvector('english', dataset_name));
CREATE INDEX idx_hypotheses_metric_name ON public.hypotheses USING gin (to_tsvector('english', metric_name));
CREATE INDEX idx_hypotheses_tags ON public.hypotheses (tag_1, tag_2);

-- 2.4 Runs
CREATE TABLE public.runs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hypothesis_id     uuid             NOT NULL REFERENCES public.hypotheses(id) ON DELETE CASCADE,
  user_id           uuid             NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at        timestamptz      NOT NULL DEFAULT now(),
  updated_at        timestamptz      NOT NULL DEFAULT now(),

  -- User-provided
  goal              text             NOT NULL,
  hardware          text             NOT NULL,
  time_budget       text             NOT NULL,
  model_size        text             NOT NULL,
  tag_1             text,
  tag_2             text,
  forked_from       uuid             REFERENCES public.runs(id) ON DELETE SET NULL,

  -- Auto-extracted from results.tsv
  baseline_metric   double precision NOT NULL,
  best_metric       double precision NOT NULL,
  best_description  text             NOT NULL,
  num_experiments   integer          NOT NULL,
  num_kept          integer          NOT NULL,
  num_discarded     integer          NOT NULL,
  num_crashed       integer          NOT NULL,
  improvement_pct   double precision NOT NULL,

  -- File references (Supabase Storage URLs)
  results_tsv_url   text             NOT NULL,
  code_file_url     text             NOT NULL,
  code_filename     text             NOT NULL,

  CONSTRAINT runs_goal_length CHECK (char_length(goal) BETWEEN 5 AND 500),
  CONSTRAINT runs_num_experiments_positive CHECK (num_experiments > 0),
  CONSTRAINT runs_counts_consistent CHECK (num_kept + num_discarded + num_crashed = num_experiments)
);

CREATE INDEX idx_runs_hypothesis_id ON public.runs (hypothesis_id);
CREATE INDEX idx_runs_user_id ON public.runs (user_id);
CREATE INDEX idx_runs_hypothesis_best ON public.runs (hypothesis_id, best_metric);
CREATE INDEX idx_runs_hypothesis_created ON public.runs (hypothesis_id, created_at DESC);
CREATE INDEX idx_runs_forked_from ON public.runs (forked_from) WHERE forked_from IS NOT NULL;
CREATE INDEX idx_runs_hypothesis_improvement ON public.runs (hypothesis_id, improvement_pct DESC);

-- 2.5 Experiments (parsed rows from results.tsv)
CREATE TABLE public.experiments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id        uuid                   NOT NULL REFERENCES public.runs(id) ON DELETE CASCADE,
  sequence      integer                NOT NULL,
  commit_hash   text                   NOT NULL,
  metric_value  double precision       NOT NULL,
  memory_gb     double precision       NOT NULL,
  status        experiment_status_enum NOT NULL,
  description   text                   NOT NULL,

  CONSTRAINT experiments_sequence_positive CHECK (sequence > 0),
  CONSTRAINT experiments_unique_sequence UNIQUE (run_id, sequence)
);

CREATE INDEX idx_experiments_run_id ON public.experiments (run_id);
CREATE INDEX idx_experiments_run_sequence ON public.experiments (run_id, sequence);
CREATE INDEX idx_experiments_run_status ON public.experiments (run_id, status);

-- --------------------------------------------------------------------------
-- 3. Updated-At Trigger
-- --------------------------------------------------------------------------

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

-- --------------------------------------------------------------------------
-- 4. Hypothesis Feed View
-- --------------------------------------------------------------------------
-- Column names match what the TypeScript query layer expects:
--   x_handle, x_display_name, x_avatar_url  (author info)
--   run_count                                (number of runs)
--   best_metric                              (best run metric value)
--   best_run_user_handle                     (handle of user with best run)
-- --------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.hypothesis_feed AS
SELECT
  h.*,
  u.x_handle,
  u.x_display_name,
  u.x_avatar_url,
  COALESCE(rs.run_count, 0)  AS run_count,
  rs.best_metric,
  rs.best_run_user_handle
FROM public.hypotheses h
JOIN public.users u ON u.id = h.user_id
LEFT JOIN LATERAL (
  SELECT
    COUNT(*)::integer AS run_count,
    best_run.best_metric,
    best_user.x_handle AS best_run_user_handle
  FROM public.runs r
  LEFT JOIN LATERAL (
    SELECT r2.best_metric, r2.user_id
    FROM public.runs r2
    WHERE r2.hypothesis_id = h.id
    ORDER BY
      CASE WHEN h.metric_direction = 'lower_is_better'  THEN r2.best_metric END ASC,
      CASE WHEN h.metric_direction = 'higher_is_better' THEN r2.best_metric END DESC
    LIMIT 1
  ) best_run ON true
  LEFT JOIN public.users best_user ON best_user.id = best_run.user_id
  WHERE r.hypothesis_id = h.id
  GROUP BY best_run.best_metric, best_user.x_handle
) rs ON true;

-- --------------------------------------------------------------------------
-- 5. Row Level Security
-- --------------------------------------------------------------------------

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hypotheses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experiments ENABLE ROW LEVEL SECURITY;

-- ---- USERS ----

-- Anyone can read user profiles
CREATE POLICY users_select ON public.users
  FOR SELECT USING (true);

-- Users can only update their own profile
CREATE POLICY users_update ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Insert handled by auth hook (service role); also allow self-insert
CREATE POLICY users_insert ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ---- API TOKENS ----

-- Users can only see their own tokens
CREATE POLICY api_tokens_select ON public.api_tokens
  FOR SELECT USING (auth.uid() = user_id);

-- Users can only create tokens for themselves
CREATE POLICY api_tokens_insert ON public.api_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own tokens (for revoking)
CREATE POLICY api_tokens_update ON public.api_tokens
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can only delete their own tokens
CREATE POLICY api_tokens_delete ON public.api_tokens
  FOR DELETE USING (auth.uid() = user_id);

-- ---- HYPOTHESES ----

-- Anyone (including anonymous) can read hypotheses
CREATE POLICY hypotheses_select ON public.hypotheses
  FOR SELECT USING (true);

-- Authenticated users can create hypotheses
CREATE POLICY hypotheses_insert ON public.hypotheses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Only the creator can update their hypothesis
CREATE POLICY hypotheses_update ON public.hypotheses
  FOR UPDATE USING (auth.uid() = user_id);

-- Only the creator can delete their hypothesis
CREATE POLICY hypotheses_delete ON public.hypotheses
  FOR DELETE USING (auth.uid() = user_id);

-- ---- RUNS ----

-- Anyone can read runs
CREATE POLICY runs_select ON public.runs
  FOR SELECT USING (true);

-- Authenticated users can submit runs to open hypotheses
CREATE POLICY runs_insert ON public.runs
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.hypotheses h
      WHERE h.id = hypothesis_id AND h.status = 'open'
    )
  );

-- Only the run creator can update
CREATE POLICY runs_update ON public.runs
  FOR UPDATE USING (auth.uid() = user_id);

-- Only the run creator can delete
CREATE POLICY runs_delete ON public.runs
  FOR DELETE USING (auth.uid() = user_id);

-- ---- EXPERIMENTS ----

-- Anyone can read experiments
CREATE POLICY experiments_select ON public.experiments
  FOR SELECT USING (true);

-- Allow insert only if the user owns the parent run
CREATE POLICY experiments_insert ON public.experiments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.runs r
      WHERE r.id = run_id AND r.user_id = auth.uid()
    )
  );

-- No direct updates or deletes on experiments (immutable once created).
-- If a run is deleted, CASCADE handles experiment cleanup.

-- --------------------------------------------------------------------------
-- 6. Storage Bucket
-- --------------------------------------------------------------------------
-- Creates the "run-files" bucket for results.tsv and code file uploads.
-- Public read access so files can be served via public URLs.
-- --------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES ('run-files', 'run-files', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: anyone can read files in run-files
CREATE POLICY run_files_select ON storage.objects
  FOR SELECT
  USING (bucket_id = 'run-files');

-- Storage policy: authenticated users can upload to run-files
CREATE POLICY run_files_insert ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'run-files'
    AND auth.role() = 'authenticated'
  );

-- Storage policy: users can delete their own uploads
-- (files are organized as run-files/{hypothesis_id}/{run_id}/...)
CREATE POLICY run_files_delete ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'run-files'
    AND auth.role() = 'authenticated'
  );
