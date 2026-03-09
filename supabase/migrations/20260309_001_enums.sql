-- Enums for Agentipedia
-- Domain categories for hypotheses
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

-- Whether a metric should be minimized or maximized
CREATE TYPE metric_direction_enum AS ENUM (
  'lower_is_better',
  'higher_is_better'
);

-- Whether a hypothesis is accepting new runs
CREATE TYPE hypothesis_status_enum AS ENUM (
  'open',
  'closed'
);

-- Status of individual experiment rows from results.tsv
CREATE TYPE experiment_status_enum AS ENUM (
  'keep',
  'discard',
  'crash'
);
