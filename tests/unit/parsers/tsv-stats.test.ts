import { describe, it, expect } from "vitest";
import { extractTsvStats } from "@/lib/parsers/tsv-stats";
import type { ParsedTsvRow } from "@/lib/parsers/tsv-validator";

function makeRow(overrides: Partial<ParsedTsvRow> = {}): ParsedTsvRow {
  return {
    commit: "a1b2c3d",
    metric_value: 1.5,
    memory_gb: 38.0,
    status: "keep",
    description: "Some experiment",
    ...overrides,
  };
}

describe("extractTsvStats", () => {
  describe("empty input", () => {
    it("returns null stats for empty rows", () => {
      const stats = extractTsvStats([], "lower_is_better");
      expect(stats.baselineMetric).toBeNull();
      expect(stats.bestMetric).toBeNull();
      expect(stats.bestDescription).toBeNull();
      expect(stats.numExperiments).toBe(0);
      expect(stats.numKept).toBe(0);
      expect(stats.numDiscarded).toBe(0);
      expect(stats.numCrashed).toBe(0);
      expect(stats.improvementPct).toBeNull();
    });
  });

  describe("baseline detection", () => {
    it("finds the row with commit='baseline'", () => {
      const rows: ParsedTsvRow[] = [
        makeRow({ commit: "a1b2c3d", metric_value: 1.5 }),
        makeRow({ commit: "baseline", metric_value: 2.0 }),
      ];
      const stats = extractTsvStats(rows, "lower_is_better");
      expect(stats.baselineMetric).toBe(2.0);
    });

    it("falls back to first row when no 'baseline' commit exists", () => {
      const rows: ParsedTsvRow[] = [
        makeRow({ commit: "first", metric_value: 1.8 }),
        makeRow({ commit: "second", metric_value: 1.5 }),
      ];
      const stats = extractTsvStats(rows, "lower_is_better");
      expect(stats.baselineMetric).toBe(1.8);
    });

    it("is case-insensitive when matching 'baseline'", () => {
      const rows: ParsedTsvRow[] = [
        makeRow({ commit: "BASELINE", metric_value: 2.0 }),
        makeRow({ commit: "a1b2c3d", metric_value: 1.5 }),
      ];
      const stats = extractTsvStats(rows, "lower_is_better");
      expect(stats.baselineMetric).toBe(2.0);
    });
  });

  describe("best metric (lower_is_better)", () => {
    it("finds the lowest metric among keep rows", () => {
      const rows: ParsedTsvRow[] = [
        makeRow({ commit: "baseline", metric_value: 1.567, status: "keep" }),
        makeRow({ commit: "a1", metric_value: 1.543, status: "keep" }),
        makeRow({ commit: "b2", metric_value: 1.600, status: "discard" }),
        makeRow({ commit: "c3", metric_value: 1.488, status: "keep" }),
        makeRow({ commit: "d4", metric_value: 0.0, status: "crash" }),
      ];
      const stats = extractTsvStats(rows, "lower_is_better");
      expect(stats.bestMetric).toBe(1.488);
      expect(stats.bestDescription).toBe("Some experiment");
    });
  });

  describe("best metric (higher_is_better)", () => {
    it("finds the highest metric among keep rows", () => {
      const rows: ParsedTsvRow[] = [
        makeRow({ commit: "baseline", metric_value: 0.8, status: "keep" }),
        makeRow({ commit: "a1", metric_value: 1.2, status: "keep" }),
        makeRow({ commit: "b2", metric_value: 1.5, status: "keep", description: "best run" }),
        makeRow({ commit: "c3", metric_value: 1.1, status: "discard" }),
      ];
      const stats = extractTsvStats(rows, "higher_is_better");
      expect(stats.bestMetric).toBe(1.5);
      expect(stats.bestDescription).toBe("best run");
    });
  });

  describe("status counts", () => {
    it("counts rows by status", () => {
      const rows: ParsedTsvRow[] = [
        makeRow({ status: "keep" }),
        makeRow({ status: "keep" }),
        makeRow({ status: "discard" }),
        makeRow({ status: "discard" }),
        makeRow({ status: "discard" }),
        makeRow({ status: "crash" }),
      ];
      const stats = extractTsvStats(rows, "lower_is_better");
      expect(stats.numExperiments).toBe(6);
      expect(stats.numKept).toBe(2);
      expect(stats.numDiscarded).toBe(3);
      expect(stats.numCrashed).toBe(1);
    });
  });

  describe("improvement percentage", () => {
    it("calculates improvement for lower_is_better", () => {
      const rows: ParsedTsvRow[] = [
        makeRow({ commit: "baseline", metric_value: 1.567, status: "keep" }),
        makeRow({ commit: "best", metric_value: 1.488, status: "keep" }),
      ];
      const stats = extractTsvStats(rows, "lower_is_better");
      // abs(1.488 - 1.567) / abs(1.567) * 100 = 5.042...
      expect(stats.improvementPct).toBeCloseTo(5.042, 1);
    });

    it("calculates improvement for higher_is_better", () => {
      const rows: ParsedTsvRow[] = [
        makeRow({ commit: "baseline", metric_value: 0.8, status: "keep" }),
        makeRow({ commit: "best", metric_value: 1.2, status: "keep" }),
      ];
      const stats = extractTsvStats(rows, "higher_is_better");
      // abs(1.2 - 0.8) / abs(0.8) * 100 = 50
      expect(stats.improvementPct).toBeCloseTo(50, 1);
    });

    it("returns null improvement when no keep rows exist", () => {
      const rows: ParsedTsvRow[] = [
        makeRow({ commit: "baseline", metric_value: 1.0, status: "discard" }),
        makeRow({ commit: "a1", metric_value: 0.0, status: "crash" }),
      ];
      const stats = extractTsvStats(rows, "lower_is_better");
      expect(stats.bestMetric).toBeNull();
      expect(stats.improvementPct).toBeNull();
    });

    it("handles zero baseline gracefully", () => {
      const rows: ParsedTsvRow[] = [
        makeRow({ commit: "baseline", metric_value: 0.0, status: "keep" }),
        makeRow({ commit: "best", metric_value: 1.0, status: "keep" }),
      ];
      const stats = extractTsvStats(rows, "higher_is_better");
      // Division by zero: baseline is 0, so improvement should be null
      expect(stats.improvementPct).toBeNull();
    });
  });

  describe("integration with real-world data shape", () => {
    it("handles a typical 20-row experiment log", () => {
      const rows: ParsedTsvRow[] = [
        makeRow({ commit: "baseline", metric_value: 1.567, status: "keep" }),
        makeRow({ commit: "a1b2c3d", metric_value: 1.543, status: "keep" }),
        makeRow({ commit: "e4f5g6h", metric_value: 1.558, status: "discard" }),
        makeRow({ commit: "i7j8k9l", metric_value: 1.531, status: "keep" }),
        makeRow({ commit: "m0n1o2p", metric_value: 0.0, status: "crash" }),
        makeRow({ commit: "q3r4s5t", metric_value: 1.549, status: "discard" }),
        makeRow({ commit: "u6v7w8x", metric_value: 1.522, status: "keep" }),
        makeRow({ commit: "y9z0a1b", metric_value: 1.535, status: "discard" }),
        makeRow({ commit: "c2d3e4f", metric_value: 1.518, status: "keep" }),
        makeRow({ commit: "g5h6i7j", metric_value: 1.540, status: "discard" }),
        makeRow({ commit: "k8l9m0n", metric_value: 1.512, status: "keep" }),
        makeRow({ commit: "o1p2q3r", metric_value: 1.525, status: "discard" }),
        makeRow({ commit: "s4t5u6v", metric_value: 0.0, status: "crash" }),
        makeRow({ commit: "w7x8y9z", metric_value: 1.508, status: "keep" }),
        makeRow({ commit: "a2b3c4d", metric_value: 1.515, status: "discard" }),
        makeRow({ commit: "e5f6g7h", metric_value: 1.499, status: "keep" }),
        makeRow({ commit: "i8j9k0l", metric_value: 1.505, status: "discard" }),
        makeRow({ commit: "m1n2o3p", metric_value: 1.492, status: "keep" }),
        makeRow({ commit: "q4r5s6t", metric_value: 1.498, status: "discard" }),
        makeRow({ commit: "u7v8w9x", metric_value: 1.488, status: "keep", description: "Final optimized" }),
      ];
      const stats = extractTsvStats(rows, "lower_is_better");

      expect(stats.baselineMetric).toBe(1.567);
      expect(stats.bestMetric).toBe(1.488);
      expect(stats.bestDescription).toBe("Final optimized");
      expect(stats.numExperiments).toBe(20);
      expect(stats.numKept).toBe(10);
      expect(stats.numDiscarded).toBe(8);
      expect(stats.numCrashed).toBe(2);
      expect(stats.improvementPct).toBeCloseTo(5.042, 1);
    });
  });
});
