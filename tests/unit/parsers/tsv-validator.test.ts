import { describe, it, expect } from "vitest";
import { validateTsvRows } from "@/lib/parsers/tsv-validator";
import type { RawTsvRow } from "@/lib/parsers/tsv-parser";

function makeRow(overrides: Partial<RawTsvRow> = {}): RawTsvRow {
  return {
    commit: "a1b2c3d",
    val_bpb: "1.543000",
    memory_gb: "38.5",
    status: "keep",
    description: "Replaced LayerNorm with RMSNorm",
    ...overrides,
  };
}

describe("validateTsvRows", () => {
  describe("column detection", () => {
    it("detects a known metric column (val_bpb)", () => {
      const result = validateTsvRows([makeRow()]);
      expect(result.metricColumnName).toBe("val_bpb");
      expect(result.errors).toHaveLength(0);
      expect(result.validRows).toHaveLength(1);
    });

    it("detects sharpe_ratio as metric column", () => {
      const row: RawTsvRow = {
        commit: "baseline",
        sharpe_ratio: "1.25",
        memory_gb: "16.0",
        status: "keep",
        description: "Initial strategy",
      };
      const result = validateTsvRows([row]);
      expect(result.metricColumnName).toBe("sharpe_ratio");
      expect(result.validRows).toHaveLength(1);
    });

    it("falls back to second column when no known metric name matches", () => {
      const row: RawTsvRow = {
        commit: "baseline",
        custom_metric: "0.95",
        memory_gb: "16.0",
        status: "keep",
        description: "test",
      };
      const result = validateTsvRows([row]);
      expect(result.metricColumnName).toBe("custom_metric");
      expect(result.validRows).toHaveLength(1);
    });

    it("reports error when required columns are missing", () => {
      const row: RawTsvRow = {
        commit: "baseline",
        val_bpb: "1.0",
      };
      const result = validateTsvRows([row]);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e) => e.includes("memory_gb"))).toBe(true);
    });

    it("reports error when no metric column can be found", () => {
      const row: RawTsvRow = {
        commit: "baseline",
        memory_gb: "16.0",
        status: "keep",
        description: "test",
      };
      const result = validateTsvRows([row]);
      expect(result.errors.some((e) => e.includes("No metric column"))).toBe(true);
    });
  });

  describe("empty input", () => {
    it("returns error for empty array", () => {
      const result = validateTsvRows([]);
      expect(result.errors).toContain("No rows to validate");
      expect(result.validRows).toHaveLength(0);
    });
  });

  describe("row-level validation", () => {
    it("validates numeric metric values", () => {
      const result = validateTsvRows([
        makeRow({ val_bpb: "not_a_number" }),
      ]);
      expect(result.validRows).toHaveLength(0);
      expect(result.errors[0]).toMatch(/val_bpb.*not a valid number/);
    });

    it("validates numeric memory_gb", () => {
      const result = validateTsvRows([
        makeRow({ memory_gb: "lots" }),
      ]);
      expect(result.validRows).toHaveLength(0);
      expect(result.errors[0]).toMatch(/memory_gb.*not a valid number/);
    });

    it("rejects empty commit", () => {
      const result = validateTsvRows([makeRow({ commit: "" })]);
      expect(result.validRows).toHaveLength(0);
      expect(result.errors[0]).toMatch(/commit is empty/);
    });

    it("rejects empty description", () => {
      const result = validateTsvRows([makeRow({ description: "" })]);
      expect(result.validRows).toHaveLength(0);
      expect(result.errors[0]).toMatch(/description is empty/);
    });

    it("rejects invalid status", () => {
      const result = validateTsvRows([makeRow({ status: "pending" })]);
      expect(result.validRows).toHaveLength(0);
      expect(result.errors[0]).toMatch(/status.*must be one of/);
    });

    it("accepts all valid status values", () => {
      const rows = [
        makeRow({ commit: "a", status: "keep" }),
        makeRow({ commit: "b", status: "discard" }),
        makeRow({ commit: "c", status: "crash" }),
      ];
      const result = validateTsvRows(rows);
      expect(result.validRows).toHaveLength(3);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("mixed valid and invalid rows", () => {
    it("separates valid rows from error rows", () => {
      const rows = [
        makeRow({ commit: "good1" }),
        makeRow({ commit: "", val_bpb: "bad" }), // invalid: empty commit + bad metric
        makeRow({ commit: "good2" }),
      ];
      const result = validateTsvRows(rows);
      expect(result.validRows).toHaveLength(2);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatch(/Row 2/);
    });
  });

  describe("type coercion", () => {
    it("coerces string numbers to actual numbers", () => {
      const result = validateTsvRows([makeRow()]);
      expect(result.validRows[0].metric_value).toBe(1.543);
      expect(result.validRows[0].memory_gb).toBe(38.5);
    });

    it("lowercases and trims status", () => {
      const result = validateTsvRows([makeRow({ status: " Keep " })]);
      expect(result.validRows[0].status).toBe("keep");
    });
  });
});
