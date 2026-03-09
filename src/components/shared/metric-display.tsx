import { formatMetric } from "@/lib/utils/format";

type MetricDisplayProps = {
  value: number | null;
  name: string;
  direction: "lower_is_better" | "higher_is_better";
  improvement?: number | null;
};

export function MetricDisplay({
  value,
  name,
  direction,
  improvement,
}: MetricDisplayProps) {
  const arrow = direction === "lower_is_better" ? "\u2193" : "\u2191";

  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-xs text-muted-foreground">{name}</span>
      <span className="font-mono text-sm font-medium">
        {value !== null ? formatMetric(value) : "\u2014"}
      </span>
      <span className="text-xs text-muted-foreground">{arrow}</span>
      {improvement !== null && improvement !== undefined && (
        <span
          className={`text-xs font-medium ${
            improvement > 0 ? "text-green-400" : "text-muted-foreground"
          }`}
        >
          {improvement > 0 ? "+" : ""}
          {improvement.toFixed(1)}%
        </span>
      )}
    </div>
  );
}
