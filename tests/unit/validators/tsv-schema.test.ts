import { describe, it, expect } from "vitest";
import { tsvRowSchema, TSV_STATUSES } from "@/lib/validators/tsv-schema";

function validRow() {
  return {
    commit: "a1b2c3d",
    metric_value: 1.543,
    memory_gb: 38.5,
    status: "keep" as const,
    description: "Replaced LayerNorm with RMSNorm",
  };
}

describe("tsvRowSchema", () => {
  it("accepts a valid row", () => {
    const result = tsvRowSchema.safeParse(validRow());
    expect(result.success).toBe(true);
  });

  describe("commit", () => {
    it("rejects empty commit", () => {
      const result = tsvRowSchema.safeParse({ ...validRow(), commit: "" });
      expect(result.success).toBe(false);
    });

    it("accepts 'baseline' as a valid commit", () => {
      const result = tsvRowSchema.safeParse({
        ...validRow(),
        commit: "baseline",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("metric_value", () => {
    it("rejects a string", () => {
      const result = tsvRowSchema.safeParse({
        ...validRow(),
        metric_value: "1.543",
      });
      expect(result.success).toBe(false);
    });

    it("accepts zero", () => {
      const result = tsvRowSchema.safeParse({
        ...validRow(),
        metric_value: 0,
      });
      expect(result.success).toBe(true);
    });

    it("accepts negative numbers", () => {
      const result = tsvRowSchema.safeParse({
        ...validRow(),
        metric_value: -1.5,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("memory_gb", () => {
    it("rejects a string", () => {
      const result = tsvRowSchema.safeParse({
        ...validRow(),
        memory_gb: "38.5",
      });
      expect(result.success).toBe(false);
    });

    it("accepts zero (crash case)", () => {
      const result = tsvRowSchema.safeParse({
        ...validRow(),
        memory_gb: 0,
        status: "crash",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("status", () => {
    it.each(TSV_STATUSES)("accepts '%s'", (status) => {
      const result = tsvRowSchema.safeParse({ ...validRow(), status });
      expect(result.success).toBe(true);
    });

    it("rejects an invalid status", () => {
      const result = tsvRowSchema.safeParse({
        ...validRow(),
        status: "pending",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("description", () => {
    it("rejects empty description", () => {
      const result = tsvRowSchema.safeParse({
        ...validRow(),
        description: "",
      });
      expect(result.success).toBe(false);
    });
  });
});
