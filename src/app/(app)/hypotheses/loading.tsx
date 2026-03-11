import { HypothesisCardSkeleton } from "@/components/shared/hypothesis-card-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function HypothesesBrowseLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      {/* Header skeleton */}
      <div className="mb-8 flex items-center justify-between">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-8 w-40 rounded-full" />
      </div>

      {/* Filter bar skeleton */}
      <div className="mb-8 flex flex-wrap gap-3">
        <Skeleton className="h-9 w-[160px] rounded-lg" />
        <Skeleton className="h-9 w-[140px] rounded-lg" />
        <Skeleton className="h-9 w-[140px] rounded-lg" />
      </div>

      {/* Card grid skeleton */}
      <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <HypothesisCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
