export function formatMetric(value: number, decimals = 6): string {
  return value.toFixed(decimals);
}

export function formatPercentage(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function formatImprovementDirection(
  baseline: number,
  best: number,
  direction: "lower_is_better" | "higher_is_better"
): string {
  const improved =
    direction === "lower_is_better" ? best < baseline : best > baseline;
  const pct = Math.abs(((best - baseline) / baseline) * 100);
  const arrow = improved ? "↓" : "↑";
  const dirArrow = direction === "lower_is_better" ? arrow : improved ? "↑" : "↓";
  return `${formatPercentage(pct)} ${dirArrow}`;
}
