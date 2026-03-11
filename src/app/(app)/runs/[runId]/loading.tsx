import { Skeleton } from "@/components/ui/skeleton";

export default function RunDetailLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      {/* Header */}
      <div className="space-y-4">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-2/3" />
        <div className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-full" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-7 w-28 rounded-md" />
          <Skeleton className="h-7 w-28 rounded-md" />
        </div>
      </div>

      <Skeleton className="h-px w-full" />

      {/* Stats */}
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-lg" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="space-y-2">
        <Skeleton className="h-6 w-44" />
        <Skeleton className="h-[350px] w-full rounded-lg" />
      </div>

      {/* Table */}
      <div className="space-y-3">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>

      {/* Code */}
      <div className="space-y-2">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-80 w-full rounded-lg" />
      </div>
    </div>
  );
}
