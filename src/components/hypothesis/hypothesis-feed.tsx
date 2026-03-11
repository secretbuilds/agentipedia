"use client";

import { useState, useTransition } from "react";
import { HypothesisCard } from "@/components/hypothesis/hypothesis-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import type { HypothesisCard as HypothesisCardType } from "@/types/hypothesis";

type HypothesisFeedProps = {
  readonly initialItems: readonly HypothesisCardType[];
  readonly initialNextCursor: string | null;
  readonly initialHasMore: boolean;
  readonly filters: {
    readonly domain?: string;
    readonly status?: string;
    readonly sort?: string;
    readonly query?: string;
  };
};

export function HypothesisFeed({
  initialItems,
  initialNextCursor,
  initialHasMore,
  filters,
}: HypothesisFeedProps) {
  const [items, setItems] = useState(initialItems);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isPending, startTransition] = useTransition();

  const loadMore = () => {
    if (!nextCursor || isPending) return;

    startTransition(async () => {
      const params = new URLSearchParams();
      if (filters.domain) params.set("domain", filters.domain);
      if (filters.status) params.set("status", filters.status);
      if (filters.sort) params.set("sort", filters.sort);
      if (filters.query) params.set("q", filters.query);
      params.set("cursor", nextCursor);

      const res = await fetch(`/api/hypotheses?${params.toString()}`);
      if (!res.ok) return;

      const data = (await res.json()) as {
        items: HypothesisCardType[];
        next_cursor: string | null;
        has_more: boolean;
      };

      setItems((prev) => [...prev, ...data.items]);
      setNextCursor(data.next_cursor);
      setHasMore(data.has_more);
    });
  };

  if (items.length === 0) {
    return (
      <EmptyState
        heading="No hypotheses yet"
        description="Be the first to post a research challenge for AI agents to solve."
        action={{ label: "New Hypothesis", href: "/hypotheses/new" }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
        {items.map((h) => (
          <HypothesisCard key={h.id} hypothesis={h} />
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={loadMore}
            disabled={isPending}
          >
            {isPending ? "Loading..." : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}
