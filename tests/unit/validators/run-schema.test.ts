import { describe, it, expect } from "vitest";
import { runSchema } from "@/lib/validators/run-schema";

function validInput() {
  return {
    goal: "Tested GQA vs MHA with cosine schedule",
    hardware: "1x A100 80GB",
    time_budget: "30 min",
    model_size: "50M",
    tag_1: "attention",
    tag_2: "architecture-search",
    forked_from: null,
  };
}

describe("runSchema", () => {
  it("accepts a fully valid input", () => {
    const result = runSchema.safeParse(validInput());
    expect(result.success).toBe(true);
  });

  it("accepts input with only required fields", () => {
    const result = runSchema.safeParse({
      goal: "Test something",
      hardware: "1x V100",
      time_budget: "1 hour",
      model_size: "124M",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tag_1).toBeNull();
      expect(result.data.tag_2).toBeNull();
      expect(result.data.forked_from).toBeNull();
    }
  });

  describe("goal", () => {
    it("rejects empty goal", () => {
      const result = runSchema.safeParse({ ...validInput(), goal: "" });
      expect(result.success).toBe(false);
    });

    it("rejects goal longer than 500 characters", () => {
      const result = runSchema.safeParse({
        ...validInput(),
        goal: "g".repeat(501),
      });
      expect(result.success).toBe(false);
    });

    it("accepts goal of exactly 500 characters", () => {
      const result = runSchema.safeParse({
        ...validInput(),
        goal: "g".repeat(500),
      });
      expect(result.success).toBe(true);
    });
  });

  describe("hardware", () => {
    it("rejects empty hardware", () => {
      const result = runSchema.safeParse({ ...validInput(), hardware: "" });
      expect(result.success).toBe(false);
    });

    it("rejects hardware longer than 200 characters", () => {
      const result = runSchema.safeParse({
        ...validInput(),
        hardware: "h".repeat(201),
      });
      expect(result.success).toBe(false);
    });
  });

  describe("time_budget", () => {
    it("rejects empty time_budget", () => {
      const result = runSchema.safeParse({ ...validInput(), time_budget: "" });
      expect(result.success).toBe(false);
    });

    it("rejects time_budget longer than 100 characters", () => {
      const result = runSchema.safeParse({
        ...validInput(),
        time_budget: "t".repeat(101),
      });
      expect(result.success).toBe(false);
    });
  });

  describe("model_size", () => {
    it("rejects empty model_size", () => {
      const result = runSchema.safeParse({ ...validInput(), model_size: "" });
      expect(result.success).toBe(false);
    });

    it("rejects model_size longer than 100 characters", () => {
      const result = runSchema.safeParse({
        ...validInput(),
        model_size: "m".repeat(101),
      });
      expect(result.success).toBe(false);
    });
  });

  describe("tags", () => {
    it("rejects tag_1 longer than 50 characters", () => {
      const result = runSchema.safeParse({
        ...validInput(),
        tag_1: "t".repeat(51),
      });
      expect(result.success).toBe(false);
    });

    it("rejects tag_2 longer than 50 characters", () => {
      const result = runSchema.safeParse({
        ...validInput(),
        tag_2: "t".repeat(51),
      });
      expect(result.success).toBe(false);
    });

    it("accepts null tags", () => {
      const result = runSchema.safeParse({
        ...validInput(),
        tag_1: null,
        tag_2: null,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("forked_from", () => {
    it("accepts a valid UUID", () => {
      const result = runSchema.safeParse({
        ...validInput(),
        forked_from: "550e8400-e29b-41d4-a716-446655440000",
      });
      expect(result.success).toBe(true);
    });

    it("accepts null", () => {
      const result = runSchema.safeParse({
        ...validInput(),
        forked_from: null,
      });
      expect(result.success).toBe(true);
    });

    it("rejects an invalid UUID", () => {
      const result = runSchema.safeParse({
        ...validInput(),
        forked_from: "not-a-uuid",
      });
      expect(result.success).toBe(false);
    });
  });
});
