export default function Loading() {
  return (
    <div className="space-y-4 py-8">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-lg border border-border p-6"
        >
          <div className="h-4 w-20 rounded bg-muted" />
          <div className="mt-3 h-6 w-3/4 rounded bg-muted" />
          <div className="mt-2 h-4 w-1/2 rounded bg-muted" />
          <div className="mt-4 flex gap-4">
            <div className="h-4 w-24 rounded bg-muted" />
            <div className="h-4 w-16 rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}
