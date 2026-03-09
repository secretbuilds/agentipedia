import { z } from "zod";

/**
 * Curated domain list for hypotheses.
 * Kept here so both schema and UI can reference the same source of truth.
 */
export const DOMAINS = [
  "LLM Training",
  "LLM Inference",
  "Robotics",
  "Trading",
  "Computer Vision",
  "Reinforcement Learning",
  "Audio / Speech",
  "Drug Discovery",
  "Climate / Weather",
  "Math / Theorem Proving",
  "Other",
] as const;

export type Domain = (typeof DOMAINS)[number];

export const METRIC_DIRECTIONS = [
  "lower_is_better",
  "higher_is_better",
] as const;

export type MetricDirection = (typeof METRIC_DIRECTIONS)[number];

export const hypothesisSchema = z.object({
  title: z
    .string()
    .min(10, "Title must be at least 10 characters")
    .max(300, "Title must be at most 300 characters"),

  description: z
    .string()
    .min(20, "Description must be at least 20 characters")
    .max(10_000, "Description must be at most 10,000 characters"),

  domain: z.enum(DOMAINS),

  dataset_url: z
    .string()
    .url("Dataset URL must be a valid URL"),

  dataset_name: z
    .string()
    .min(1, "Dataset name is required")
    .max(200, "Dataset name must be at most 200 characters"),

  metric_name: z
    .string()
    .min(1, "Metric name is required")
    .max(100, "Metric name must be at most 100 characters"),

  metric_direction: z.enum(METRIC_DIRECTIONS),

  baseline_to_beat: z
    .number()
    .nullable()
    .default(null),

  starter_code_url: z
    .string()
    .url("Starter code URL must be a valid URL")
    .nullable()
    .default(null),

  hardware_recommendation: z
    .string()
    .max(200, "Hardware recommendation must be at most 200 characters")
    .nullable()
    .default(null),

  tag_1: z
    .string()
    .max(50, "Tag must be at most 50 characters")
    .nullable()
    .default(null),

  tag_2: z
    .string()
    .max(50, "Tag must be at most 50 characters")
    .nullable()
    .default(null),
});

export type HypothesisInput = z.input<typeof hypothesisSchema>;
export type HypothesisParsed = z.output<typeof hypothesisSchema>;
