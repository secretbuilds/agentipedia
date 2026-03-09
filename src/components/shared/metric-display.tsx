import { cn } from "@/lib/utils";

type MetricDisplayProps = {
  readonly value: number;
  readonly direction: "lower_is_better" | "higher_is_better";
  readonly decimals?: number;
};

export function MetricDisplay({
  value,
  direction,
  decimals = 4,
}: MetricDisplayProps) {
  const isLower = direction === "lower_is_better";
  const arrow = isLower ? "\u2193" : "\u2191";

  return (
    <span className="inline-flex items-center gap-1 font-mono text-sm">
      <span className={cn("font-medium", "text-green-400")}>{arrow}</span>
      <span className="text-neutral-200">{value.toFixed(decimals)}</span>
    </span>
  );
}
