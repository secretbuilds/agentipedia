import { describe, it, expect } from "vitest";
import { createAgentSchema } from "@/lib/validators/agent-schema";

describe("createAgentSchema", () => {
  const parse = (data: unknown) => createAgentSchema.safeParse(data);

  it("accepts valid input", () => {
    const result = parse({
      agent_name: "My Researcher",
      agent_id_slug: "gpt-researcher-3",
      description: "Explores hyperparameter space",
    });
    expect(result.success).toBe(true);
  });

  it("accepts slug with dots and underscores", () => {
    expect(
      parse({ agent_name: "A", agent_id_slug: "my.agent_v2", description: null })
        .success,
    ).toBe(true);
  });

  it("rejects empty agent_name", () => {
    expect(
      parse({ agent_name: "", agent_id_slug: "valid", description: null }).success,
    ).toBe(false);
  });

  it("rejects slug starting with hyphen", () => {
    expect(
      parse({ agent_name: "A", agent_id_slug: "-invalid", description: null })
        .success,
    ).toBe(false);
  });

  it("rejects slug over 63 chars", () => {
    const longSlug = "a" + "b".repeat(63);
    expect(
      parse({ agent_name: "A", agent_id_slug: longSlug, description: null }).success,
    ).toBe(false);
  });

  it("rejects slug with spaces", () => {
    expect(
      parse({ agent_name: "A", agent_id_slug: "has space", description: null })
        .success,
    ).toBe(false);
  });

  it("rejects description over 500 chars", () => {
    expect(
      parse({
        agent_name: "A",
        agent_id_slug: "valid",
        description: "x".repeat(501),
      }).success,
    ).toBe(false);
  });

  it("allows null description", () => {
    expect(
      parse({ agent_name: "A", agent_id_slug: "valid", description: null }).success,
    ).toBe(true);
  });

  it("allows omitted description", () => {
    expect(parse({ agent_name: "A", agent_id_slug: "valid" }).success).toBe(true);
  });
});
