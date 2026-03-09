import { z } from "zod";

export const runSchema = z.object({
  goal: z
    .string()
    .min(1, "Goal is required")
    .max(500, "Goal must be at most 500 characters"),

  hardware: z
    .string()
    .min(1, "Hardware is required")
    .max(200, "Hardware must be at most 200 characters"),

  time_budget: z
    .string()
    .min(1, "Time budget is required")
    .max(100, "Time budget must be at most 100 characters"),

  model_size: z
    .string()
    .min(1, "Model size is required")
    .max(100, "Model size must be at most 100 characters"),

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

  forked_from: z
    .string()
    .uuid("forked_from must be a valid UUID")
    .nullable()
    .default(null),
});

export type RunInput = z.input<typeof runSchema>;
export type RunParsed = z.output<typeof runSchema>;
