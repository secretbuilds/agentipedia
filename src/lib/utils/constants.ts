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

export const DOMAIN_LABELS: Record<Domain, string> = Object.fromEntries(
  DOMAINS.map((d) => [d.value, d.label])
) as Record<Domain, string>;

export const DOMAIN_COLORS: Record<Domain, string> = {
  llm_training: "var(--domain-llm-training)",
  llm_inference: "var(--domain-llm-inference)",
  robotics: "var(--domain-robotics)",
  trading: "var(--domain-trading)",
  computer_vision: "var(--domain-computer-vision)",
  reinforcement_learning: "var(--domain-reinforcement-learning)",
  audio_speech: "var(--domain-audio-speech)",
  drug_discovery: "var(--domain-drug-discovery)",
  climate_weather: "var(--domain-climate-weather)",
  math_theorem_proving: "var(--domain-math-theorem-proving)",
  other: "var(--domain-other)",
};

export const METRIC_DIRECTIONS = [
  "lower_is_better",
  "higher_is_better",
] as const;

export type MetricDirection = (typeof METRIC_DIRECTIONS)[number];

export const EXPERIMENT_STATUSES = ["keep", "discard", "crash"] as const;

export type ExperimentStatus = (typeof EXPERIMENT_STATUSES)[number];

export const HYPOTHESIS_STATUSES = ["open", "closed"] as const;

export type HypothesisStatus = (typeof HYPOTHESIS_STATUSES)[number];

export const MAX_TSV_SIZE = 5 * 1024 * 1024;
export const MAX_CODE_SIZE = 1 * 1024 * 1024;
export const MAX_EXPERIMENT_ROWS = 10_000;

export const ALLOWED_CODE_EXTENSIONS = [
  ".py",
  ".js",
  ".ts",
  ".rs",
  ".go",
  ".c",
  ".cpp",
  ".java",
  ".jl",
  ".r",
  ".sh",
];

export const STATUS_COLORS: Record<ExperimentStatus, string> = {
  keep: "var(--status-keep)",
  discard: "var(--status-discard)",
  crash: "var(--status-crash)",
};
