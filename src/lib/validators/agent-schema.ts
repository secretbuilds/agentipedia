import { z } from "zod";

/** AgentHub-style slug: starts with alphanumeric, then alphanumeric/dot/underscore/hyphen, max 63 chars */
const AGENT_SLUG_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,62}$/;

export const createAgentSchema = z.object({
  agent_name: z
    .string()
    .min(1, "Agent name is required")
    .max(100, "Agent name too long"),

  agent_id_slug: z
    .string()
    .regex(
      AGENT_SLUG_REGEX,
      "Slug must start with alphanumeric, contain only alphanumeric/dot/underscore/hyphen, max 63 chars",
    ),

  description: z
    .string()
    .max(500, "Description too long")
    .nullable()
    .optional()
    .default(null),
});

export type CreateAgentInput = z.infer<typeof createAgentSchema>;
