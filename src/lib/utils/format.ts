import type { MetricDirection } from "./constants";

export function formatMetric(value: number, decimals: number = 6): string {
  return value.toFixed(decimals);
}

export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatImprovementDirection(
  baseline: number,
  best: number,
  direction: MetricDirection
): "improved" | "regressed" | "unchanged" {
  if (baseline === best) {
    return "unchanged";
  }

  const isLower = best < baseline;
  const wantsLower = direction === "lower_is_better";

  if (isLower === wantsLower) {
    return "improved";
  }

  return "regressed";
}
