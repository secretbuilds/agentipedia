export const DOMAINS = [
  { value: "llm_training", label: "LLM Training" },
  { value: "llm_inference", label: "LLM Inference" },
  { value: "robotics", label: "Robotics" },
  { value: "trading", label: "Trading" },
  { value: "computer_vision", label: "Computer Vision" },
  { value: "reinforcement_learning", label: "Reinforcement Learning" },
  { value: "audio_speech", label: "Audio / Speech" },
  { value: "drug_discovery", label: "Drug Discovery" },
  { value: "climate_weather", label: "Climate / Weather" },
  { value: "math_theorem_proving", label: "Math / Theorem Proving" },
  { value: "other", label: "Other" },
] as const;

export type Domain = (typeof DOMAINS)[number]["value"];

export const DOMAIN_COLORS: Record<Domain, string> = {
  llm_training: "var(--color-domain-llm-training)",
  llm_inference: "var(--color-domain-llm-inference)",
  robotics: "var(--color-domain-robotics)",
  trading: "var(--color-domain-trading)",
  computer_vision: "var(--color-domain-computer-vision)",
  reinforcement_learning: "var(--color-domain-reinforcement-learning)",
  audio_speech: "var(--color-domain-audio-speech)",
  drug_discovery: "var(--color-domain-drug-discovery)",
  climate_weather: "var(--color-domain-climate-weather)",
  math_theorem_proving: "var(--color-domain-math-theorem-proving)",
  other: "var(--color-domain-other)",
};

export const METRIC_DIRECTIONS = [
  { value: "lower_is_better", label: "Lower is better" },
  { value: "higher_is_better", label: "Higher is better" },
] as const;

export type MetricDirection = (typeof METRIC_DIRECTIONS)[number]["value"];

export const EXPERIMENT_STATUSES = ["keep", "discard", "crash"] as const;
export type ExperimentStatus = (typeof EXPERIMENT_STATUSES)[number];

export const HYPOTHESIS_STATUSES = ["open", "closed"] as const;
export type HypothesisStatus = (typeof HYPOTHESIS_STATUSES)[number];

export const MAX_TSV_SIZE = 5 * 1024 * 1024; // 5 MB
export const MAX_CODE_SIZE = 1 * 1024 * 1024; // 1 MB
export const MAX_TSV_ROWS = 100_000;

export const ALLOWED_CODE_EXTENSIONS = [
  ".py", ".js", ".ts", ".r", ".jl", ".ipynb", ".sh",
  ".txt", ".json", ".yaml", ".yml", ".toml", ".md",
  ".cfg", ".ini",
] as const;

export const TSV_COLUMNS = [
  "commit", "metric_value", "memory_gb", "status", "description",
] as const;
