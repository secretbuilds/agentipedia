import { z } from "zod";
import { DOMAINS, METRIC_DIRECTIONS } from "@/lib/utils/constants";

const domainValues = DOMAINS.map((d) => d.value) as [string, ...string[]];
const directionValues = METRIC_DIRECTIONS.map((d) => d.value) as [string, ...string[]];

export const hypothesisSchema = z.object({
  title: z
    .string()
    .min(10, "Title must be at least 10 characters")
    .max(300, "Title must be at most 300 characters")
    .trim(),
  description: z
    .string()
    .min(20, "Description must be at least 20 characters")
    .max(10000, "Description must be at most 10,000 characters")
    .trim(),
  domain: z.enum(domainValues, {
    error: "Please select a domain",
  }),
  dataset_url: z.string().url("Must be a valid URL").trim(),
  dataset_name: z
    .string()
    .min(1, "Dataset name is required")
    .max(200, "Dataset name must be at most 200 characters")
    .trim(),
  metric_name: z
    .string()
    .min(1, "Metric name is required")
    .max(100, "Metric name must be at most 100 characters")
    .trim(),
  metric_direction: z.enum(directionValues, {
    error: "Please select metric direction",
  }),
  baseline_to_beat: z
    .number()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  starter_code_url: z
    .string()
    .url("Must be a valid URL")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  hardware_recommendation: z
    .string()
    .max(200)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  tag_1: z
    .string()
    .max(50)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  tag_2: z
    .string()
    .max(50)
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export type HypothesisSchemaInput = z.input<typeof hypothesisSchema>;
export type HypothesisSchemaOutput = z.output<typeof hypothesisSchema>;
