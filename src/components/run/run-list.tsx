"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RunCard } from "@/components/run/run-card";
import { EmptyState } from "@/components/shared/empty-state";
import type { RunCard as RunCardType } from "@/types/run";

const SORT_OPTIONS = [
  { value: "best", label: "Best Result" },
  { value: "newest", label: "Newest" },
  { value: "most_improved", label: "Most Improved" },
] as const;

type RunListProps = {
  readonly runs: readonly RunCardType[];
  readonly metric_name: string;
  readonly metric_direction: string;
  readonly hypothesisId: string;
};

export function RunList({
  runs,
  metric_name,
  metric_direction,
  hypothesisId,
}: RunListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSort = searchParams.get("run_sort") ?? "best";

  const updateSort = useCallback(
    (value: string | null) => {
      const resolved = value ?? "best";
      const params = new URLSearchParams(searchParams.toString());
      if (resolved === "best") {
        params.delete("run_sort");
      } else {
        params.set("run_sort", resolved);
      }
      const qs = params.toString();
      router.push(
        qs
          ? `/hypotheses/${hypothesisId}?${qs}`
          : `/hypotheses/${hypothesisId}`,
      );
    },
    [router, searchParams, hypothesisId],
  );

  const sortedRuns = useMemo(() => {
    const copy = [...runs];
    switch (currentSort) {
      case "newest":
        return copy.sort(
          (a, b) =>
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime(),
        );
      case "most_improved":
        return copy.sort(
          (a, b) => b.improvement_pct - a.improvement_pct,
        );
      case "best":
      default:
        if (metric_direction === "lower_is_better") {
          return copy.sort((a, b) => a.best_metric - b.best_metric);
        }
        return copy.sort((a, b) => b.best_metric - a.best_metric);
    }
  }, [runs, currentSort, metric_direction]);

  if (runs.length === 0) {
    return (
      <EmptyState
        heading="No runs yet"
        description="Be the first to submit an experiment run against this hypothesis."
        action={{
          label: "Submit Run",
          href: `/hypotheses/${hypothesisId}/submit-run`,
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">
          Runs ({runs.length})
        </h2>
        <Select value={currentSort} onValueChange={updateSort}>
          <SelectTrigger className="min-w-[140px]">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4">
        {sortedRuns.map((run) => (
          <RunCard
            key={run.id}
            run={run}
            metric_name={metric_name}
            metric_direction={metric_direction}
          />
        ))}
      </div>
    </div>
  );
}
