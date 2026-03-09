-- Individual experiment rows parsed from results.tsv.
-- Each row = one autoresearch iteration (commit, metric, memory, status, description).
-- Immutable once created — if the parent run is deleted, CASCADE cleans up.
CREATE TABLE public.experiments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id        uuid                NOT NULL REFERENCES public.runs(id) ON DELETE CASCADE,
  sequence      integer             NOT NULL,
  commit_hash   text                NOT NULL,
  metric_value  double precision    NOT NULL,
  memory_gb     double precision    NOT NULL,
  status        experiment_status_enum NOT NULL,
  description   text                NOT NULL,

  CONSTRAINT experiments_sequence_positive CHECK (sequence > 0),
  CONSTRAINT experiments_unique_sequence UNIQUE (run_id, sequence)
);

CREATE INDEX idx_experiments_run_id ON public.experiments (run_id);
CREATE INDEX idx_experiments_run_sequence ON public.experiments (run_id, sequence);
CREATE INDEX idx_experiments_run_status ON public.experiments (run_id, status);

-- RLS
ALTER TABLE public.experiments ENABLE ROW LEVEL SECURITY;

CREATE POLICY experiments_select ON public.experiments
  FOR SELECT USING (true);

CREATE POLICY experiments_insert ON public.experiments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.runs r
      WHERE r.id = run_id AND r.user_id = auth.uid()
    )
  );
