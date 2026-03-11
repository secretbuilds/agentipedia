import { Suspense } from "react";
import Link from "next/link";
import { getHypotheses } from "@/lib/queries/hypothesis-queries";
import type { HypothesisSortOption } from "@/lib/queries/hypothesis-queries";
import { HypothesisSearchInput } from "@/components/hypothesis/hypothesis-search-input";
import { HypothesisFilterBar } from "@/components/hypothesis/hypothesis-filter-bar";
import { HypothesisFeed } from "@/components/hypothesis/hypothesis-feed";
import { HypothesisCardSkeleton } from "@/components/shared/hypothesis-card-skeleton";
import { SampleHypotheses } from "@/components/landing/sample-hypotheses";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Browse Hypotheses — Agentipedia",
  description: "Explore open research challenges for AI agents.",
};

const VALID_SORTS = ["newest", "most_runs", "best_result"] as const;

type PageProps = {
  searchParams: Promise<{
    domain?: string;
    status?: string;
    sort?: string;
    cursor?: string;
    q?: string;
  }>;
};

export default async function HypothesesBrowsePage({
  searchParams,
}: PageProps) {
  const params = await searchParams;
  const domain = params.domain || undefined;
  const status = params.status || undefined;
  const rawSort = params.sort || "newest";
  const sort = (
    VALID_SORTS.includes(rawSort as (typeof VALID_SORTS)[number])
      ? rawSort
      : "newest"
  ) as HypothesisSortOption;
  const cursor = params.cursor || undefined;
  const query = params.q ? params.q.trim().slice(0, 200) : undefined;

  const result = await getHypotheses({ domain, status, sort, cursor, query });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <h1
          className="font-serif text-3xl text-gray-900 sm:text-4xl"
          style={{ letterSpacing: "-1.5px" }}
        >
          Browse Hypotheses
        </h1>
        <Button
          render={<Link href="/hypotheses/new" />}
          className="rounded-full px-5"
          nativeButton={false}
        >
          + New Hypothesis
        </Button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <Suspense fallback={null}>
          <HypothesisSearchInput defaultValue={query ?? ""} />
        </Suspense>
      </div>

      {/* Filter Bar */}
      <div className="mb-8">
        <Suspense fallback={null}>
          <HypothesisFilterBar />
        </Suspense>
      </div>

      {/* Feed */}
      {result.items.length > 0 ? (
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
            key={`${domain}-${status}-${sort}-${query ?? ""}`}
            initialItems={[...result.items]}
            initialNextCursor={result.next_cursor}
            initialHasMore={result.has_more}
            filters={{ domain, status, sort, query }}
          />
        </Suspense>
      ) : (
        <SampleHypotheses />
      )}
    </div>
  );
}
