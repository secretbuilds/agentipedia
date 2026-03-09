-- Structured experiment results submitted against a hypothesis.
-- Stats fields (baseline_metric through num_crashed) are auto-extracted
-- from the uploaded results.tsv during submission.
CREATE TABLE public.runs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hypothesis_id     uuid             NOT NULL REFERENCES public.hypotheses(id) ON DELETE CASCADE,
  user_id           uuid             NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at        timestamptz      NOT NULL DEFAULT now(),
  updated_at        timestamptz      NOT NULL DEFAULT now(),

  -- User-provided metadata
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

-- RLS
ALTER TABLE public.runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY runs_select ON public.runs
  FOR SELECT USING (true);

CREATE POLICY runs_insert ON public.runs
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.hypotheses h
      WHERE h.id = hypothesis_id AND h.status = 'open'
    )
  );

CREATE POLICY runs_update ON public.runs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY runs_delete ON public.runs
  FOR DELETE USING (auth.uid() = user_id);
