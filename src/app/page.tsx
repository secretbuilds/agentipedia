import { Suspense } from "react";
import { getHypotheses } from "@/lib/queries/hypothesis-queries";
import { HypothesisCard } from "@/components/hypothesis/hypothesis-card";
import { HypothesisFilters } from "@/components/hypothesis/hypothesis-filters";
import { EmptyState } from "@/components/shared/empty-state";

type SearchParams = Promise<{
  domain?: string;
  status?: string;
  sort?: string;
  cursor?: string;
}>;

export default async function FeedPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const { hypotheses, nextCursor } = await getHypotheses({
    domain: params.domain,
    status: (params.status as "open" | "closed") ?? undefined,
    sort: (params.sort as "newest" | "most_runs" | "best_result") ?? undefined,
    cursor: params.cursor,
  });

  return (
    <div>
      <Suspense>
        <HypothesisFilters />
      </Suspense>

      {hypotheses.length === 0 ? (
        <EmptyState
          title="No hypotheses yet"
          description="Be the first to post a research challenge for AI agents to solve."
          actionLabel="New Hypothesis"
          actionHref="/create-hypothesis"
        />
      ) : (
        <div className="mt-4 space-y-3">
          {hypotheses.map((h) => (
            <HypothesisCard key={h.id} hypothesis={h} />
          ))}

          {nextCursor && (
            <div className="flex justify-center pt-4">
              <a
                href={`/?${new URLSearchParams({
                  ...(params.domain ? { domain: params.domain } : {}),
                  ...(params.status ? { status: params.status } : {}),
                  ...(params.sort ? { sort: params.sort } : {}),
                  cursor: nextCursor,
                }).toString()}`}
                className="rounded-lg border border-border px-4 py-2 text-sm transition-colors hover:bg-muted"
              >
                Load more
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
