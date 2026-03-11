import { HypothesisCardSkeleton } from "@/components/shared/hypothesis-card-skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <HypothesisCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
