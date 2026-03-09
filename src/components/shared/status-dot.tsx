type StatusDotProps = {
  status: "keep" | "discard" | "crash";
  showLabel?: boolean;
};

const colors = {
  keep: "bg-green-500",
  discard: "bg-gray-500",
  crash: "bg-red-500",
};

export function StatusDot({ status, showLabel = false }: StatusDotProps) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${colors[status]}`} />
      {showLabel && (
        <span className="text-xs capitalize text-muted-foreground">
          {status}
        </span>
      )}
    </span>
  );
}
