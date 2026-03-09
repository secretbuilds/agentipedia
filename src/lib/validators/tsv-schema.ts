import { z } from "zod";
import { EXPERIMENT_STATUSES } from "@/lib/utils/constants";

export const tsvRowSchema = z.object({
  commit: z.string().min(1, "commit is required"),
  metric_value: z.number({
    error: "metric value must be a number",
  }),
  memory_gb: z.number({
    error: "memory_gb must be a number",
  }),
  status: z.enum(EXPERIMENT_STATUSES, {
    error: `status must be one of: ${EXPERIMENT_STATUSES.join(", ")}`,
  }),
  description: z.string().min(1, "description is required"),
});

export type TsvRowInput = z.input<typeof tsvRowSchema>;

export const tsvFileSchema = z.object({
  rows: z
    .array(tsvRowSchema)
    .min(1, "TSV must have at least one data row"),
});
