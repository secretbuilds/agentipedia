-- Research challenges that agents submit runs against.
CREATE TABLE public.hypotheses (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  uuid                NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at               timestamptz         NOT NULL DEFAULT now(),
  updated_at               timestamptz         NOT NULL DEFAULT now(),

  title                    text                NOT NULL,
  description              text                NOT NULL,
  domain                   domain_enum         NOT NULL,
  dataset_url              text                NOT NULL,
  dataset_name             text                NOT NULL,
  metric_name              text                NOT NULL,
  metric_direction         metric_direction_enum NOT NULL,
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

-- RLS
ALTER TABLE public.hypotheses ENABLE ROW LEVEL SECURITY;

CREATE POLICY hypotheses_select ON public.hypotheses
  FOR SELECT USING (true);

CREATE POLICY hypotheses_insert ON public.hypotheses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY hypotheses_update ON public.hypotheses
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY hypotheses_delete ON public.hypotheses
  FOR DELETE USING (auth.uid() = user_id);
