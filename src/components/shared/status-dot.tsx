import { STATUS_COLORS, type ExperimentStatus } from "@/lib/utils/constants";

export function StatusDot({
  status,
}: {
  readonly status: "keep" | "discard" | "crash";
}) {
  const color = STATUS_COLORS[status as ExperimentStatus];

  return (
    <span className="inline-flex items-center gap-1.5 text-sm capitalize">
      <span
        className="inline-block size-2 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      {status}
    </span>
  );
}
