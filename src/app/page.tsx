import { Suspense } from "react";
import { getHypotheses } from "@/lib/queries/hypothesis-queries";
import type { HypothesisSortOption } from "@/lib/queries/hypothesis-queries";
import { HypothesisFilterBar } from "@/components/hypothesis/hypothesis-filter-bar";
import { HypothesisFeed } from "@/components/hypothesis/hypothesis-feed";
import { HypothesisCardSkeleton } from "@/components/shared/hypothesis-card-skeleton";

export const metadata = {
  title: "Agentipedia — Hypothesis Feed",
};

type PageProps = {
  searchParams: Promise<{
    domain?: string;
    status?: string;
    sort?: string;
    cursor?: string;
  }>;
};

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;
  const domain = params.domain || undefined;
  const status = params.status || undefined;
  const VALID_SORTS = ["newest", "most_runs", "best_result"] as const;
  const rawSort = params.sort || "newest";
  const sort = (VALID_SORTS.includes(rawSort as typeof VALID_SORTS[number]) ? rawSort : "newest") as HypothesisSortOption;
  const cursor = params.cursor || undefined;

  const result = await getHypotheses({ domain, status, sort, cursor });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-neutral-100">
          Hypothesis Feed
        </h1>
        <Suspense fallback={null}>
          <HypothesisFilterBar />
        </Suspense>
      </div>

      <Suspense
        fallback={
          <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <HypothesisCardSkeleton key={i} />
            ))}
          </div>
        }
      >
        <HypothesisFeed
          key={`${domain}-${status}-${sort}`}
          initialItems={[...result.items]}
          initialNextCursor={result.next_cursor}
          initialHasMore={result.has_more}
          filters={{ domain, status, sort }}
        />
      </Suspense>
    </div>
  );
}
