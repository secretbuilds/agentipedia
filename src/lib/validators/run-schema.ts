import { z } from "zod";

export const runSchema = z.object({
  goal: z
    .string()
    .min(1, "Goal is required")
    .max(500, "Goal must be at most 500 characters")
    .trim(),
  hardware: z
    .string()
    .min(1, "Hardware is required")
    .max(200)
    .trim(),
  time_budget: z
    .string()
    .min(1, "Time budget is required")
    .max(100)
    .trim(),
  model_size: z
    .string()
    .min(1, "Model size is required")
    .max(100)
    .trim(),
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
  forked_from: z
    .string()
    .uuid("Must be a valid run ID")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  post_to_x: z.boolean().optional().default(false),
});

export type RunSchemaInput = z.input<typeof runSchema>;
export type RunSchemaOutput = z.output<typeof runSchema>;
