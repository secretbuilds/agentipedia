import { z } from "zod";

export const TSV_STATUSES = ["keep", "discard", "crash"] as const;

export type TsvStatus = (typeof TSV_STATUSES)[number];

export const tsvRowSchema = z.object({
  commit: z
    .string()
    .min(1, "Commit is required"),

  metric_value: z
    .number({ message: "Metric value must be a number" }),

  memory_gb: z
    .number({ message: "Memory (GB) must be a number" }),

  status: z.enum(TSV_STATUSES),

  description: z
    .string()
    .min(1, "Description is required"),
});

export type TsvRowInput = z.input<typeof tsvRowSchema>;
export type TsvRowParsed = z.output<typeof tsvRowSchema>;
