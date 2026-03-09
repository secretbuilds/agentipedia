import type { ParsedTsvRow, TsvStats } from "@/types/experiment";
import type { MetricDirection } from "@/lib/utils/constants";

export function extractTsvStats(
  rows: readonly ParsedTsvRow[],
  metricDirection: MetricDirection
): TsvStats {
  const baselineRow = rows.find((r) => r.commit === "baseline");
  const keptRows = rows.filter((r) => r.status === "keep");
  const discardedRows = rows.filter((r) => r.status === "discard");
  const crashedRows = rows.filter((r) => r.status === "crash");

  const baselineMetric = baselineRow?.metric_value ?? 0;

  let bestRow: ParsedTsvRow | undefined;
  if (keptRows.length > 0) {
    bestRow = keptRows.reduce((best, row) => {
      if (metricDirection === "lower_is_better") {
        return row.metric_value < best.metric_value ? row : best;
      }
      return row.metric_value > best.metric_value ? row : best;
    });
  }

  const bestMetric = bestRow?.metric_value ?? baselineMetric;
  const bestDescription = bestRow?.description ?? "No improvements found";

  const improvementPct =
    baselineMetric !== 0
      ? Math.abs(((bestMetric - baselineMetric) / baselineMetric) * 100)
      : 0;

  return {
    baseline_metric: baselineMetric,
    best_metric: bestMetric,
    best_description: bestDescription,
    num_experiments: rows.length,
    num_kept: keptRows.length,
    num_discarded: discardedRows.length,
    num_crashed: crashedRows.length,
    improvement_pct: Math.round(improvementPct * 10) / 10,
  };
}
