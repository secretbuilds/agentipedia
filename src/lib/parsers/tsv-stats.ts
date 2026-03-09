import type { ParsedTsvRow } from "./tsv-validator";
import type { MetricDirection } from "@/lib/utils/constants";

export interface TsvStats {
  readonly baselineMetric: number | null;
  readonly bestMetric: number | null;
  readonly bestDescription: string | null;
  readonly numExperiments: number;
  readonly numKept: number;
  readonly numDiscarded: number;
  readonly numCrashed: number;
  readonly improvementPct: number | null;
}

/**
 * Determine whether `candidate` is better than `current` given the metric direction.
 */
function isBetter(
  candidate: number,
  current: number,
  direction: MetricDirection,
): boolean {
  return direction === "lower_is_better"
    ? candidate < current
    : candidate > current;
}

/**
 * Extract summary statistics from validated TSV rows.
 *
 * - Baseline: the row where commit === "baseline", or the first row if none.
 * - Best: the best metric among rows with status === "keep", respecting direction.
 * - Improvement: abs(best - baseline) / abs(baseline) * 100, or null if no baseline or best.
 */
export function extractTsvStats(
  rows: readonly ParsedTsvRow[],
  metricDirection: MetricDirection,
): TsvStats {
  if (rows.length === 0) {
    return {
      baselineMetric: null,
      bestMetric: null,
      bestDescription: null,
      numExperiments: 0,
      numKept: 0,
      numDiscarded: 0,
      numCrashed: 0,
      improvementPct: null,
    };
  }

  // Find baseline: explicit "baseline" commit or first row
  const baselineRow =
    rows.find((r) => r.commit.toLowerCase() === "baseline") ?? rows[0];
  const baselineMetric = baselineRow.metric_value;

  // Count by status
  let numKept = 0;
  let numDiscarded = 0;
  let numCrashed = 0;

  for (const row of rows) {
    switch (row.status) {
      case "keep":
        numKept++;
        break;
      case "discard":
        numDiscarded++;
        break;
      case "crash":
        numCrashed++;
        break;
    }
  }

  // Find best among keep rows
  const keepRows = rows.filter((r) => r.status === "keep");
  let bestMetric: number | null = null;
  let bestDescription: string | null = null;

  if (keepRows.length > 0) {
    let bestRow = keepRows[0];
    for (let i = 1; i < keepRows.length; i++) {
      if (isBetter(keepRows[i].metric_value, bestRow.metric_value, metricDirection)) {
        bestRow = keepRows[i];
      }
    }
    bestMetric = bestRow.metric_value;
    bestDescription = bestRow.description;
  }

  // Compute improvement percentage
  let improvementPct: number | null = null;
  if (bestMetric !== null && baselineMetric !== 0) {
    improvementPct =
      (Math.abs(bestMetric - baselineMetric) / Math.abs(baselineMetric)) * 100;
  }

  return {
    baselineMetric,
    bestMetric,
    bestDescription,
    numExperiments: rows.length,
    numKept,
    numDiscarded,
    numCrashed,
    improvementPct,
  };
}
