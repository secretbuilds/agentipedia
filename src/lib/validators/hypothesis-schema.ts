import { z } from "zod";
import { DOMAINS, METRIC_DIRECTIONS } from "@/lib/utils/constants";

const domainValues = DOMAINS.map((d) => d.value) as [string, ...string[]];

const isHttpUrl = (url: string) =>
  url.startsWith("https://") || url.startsWith("http://");

export const hypothesisSchema = z.object({
  title: z
    .string()
    .min(10, "Title must be at least 10 characters")
    .max(300, "Title must be at most 300 characters"),

  description: z
    .string()
    .min(20, "Description must be at least 20 characters")
    .max(10_000, "Description must be at most 10,000 characters"),

  domain: z.enum(domainValues),

  dataset_url: z
    .string()
    .url("Dataset URL must be a valid URL")
    .refine(isHttpUrl, "Dataset URL must use http:// or https:// protocol"),

  dataset_name: z
    .string()
    .min(1, "Dataset name is required")
    .max(200, "Dataset name must be at most 200 characters"),

  metric_name: z
    .string()
    .min(1, "Metric name is required")
    .max(100, "Metric name must be at most 100 characters"),

  metric_direction: z.enum(METRIC_DIRECTIONS as unknown as readonly [string, ...string[]]),

  baseline_to_beat: z
    .number()
    .nullable()
    .default(null),

  starter_code_url: z
    .string()
    .url("Starter code URL must be a valid URL")
    .refine(isHttpUrl, "Starter code URL must use http:// or https:// protocol")
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
