import Link from "next/link";
import { GitFork, Info } from "lucide-react";
import type { DagNode } from "@/types/dag";

type LeavesPanelProps = {
  readonly leaves: readonly DagNode[];
  readonly metricName: string;
  readonly metricDirection: string;
  readonly hypothesisId: string;
};

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}…`;
}

function sortLeaves(
  leaves: readonly DagNode[],
  direction: string,
): readonly DagNode[] {
  const sorted = [...leaves];
  if (direction === "lower_is_better") {
    sorted.sort((a, b) => a.run.best_metric - b.run.best_metric);
  } else {
    sorted.sort((a, b) => b.run.best_metric - a.run.best_metric);
  }
  return sorted;
}

export function LeavesPanel({
  leaves,
  metricName,
  metricDirection,
  hypothesisId,
}: LeavesPanelProps) {
  if (leaves.length === 0) return null;

  const sorted = sortLeaves(leaves, metricDirection);

  return (
    <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
      {/* Header */}
      <div>
        <h2 className="inline-flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wider text-gray-500">
          Frontier
          <Info className="size-3.5 text-gray-400" />
        </h2>
        <p className="mt-0.5 text-xs text-gray-400">
          Runs at the edge of exploration — fork from one to continue
        </p>
      </div>

      {/* Leaf list */}
      <ul className="divide-y divide-gray-200">
        {sorted.map((node, index) => {
          const rank = index + 1;
          const displayText =
            node.run.synthesis ?? node.run.goal ?? "";

          return (
            <li
              key={node.run.id}
              className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0"
            >
              {/* Rank badge */}
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-600">
                {rank}
              </span>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
                  {/* Metric value */}
                  <span className="font-mono text-sm font-medium text-gray-700">
                    {node.run.best_metric}
                  </span>

                  {/* Depth badge */}
                  <span className="rounded bg-gray-200 px-1.5 py-0.5 text-xs text-gray-500">
                    Depth {node.depth}
                  </span>

                  {/* User handle */}
                  <span className="text-xs text-gray-500">
                    @{node.run.user.x_handle}
                  </span>
                </div>

                {/* Synthesis / goal text */}
                {displayText.length > 0 && (
                  <p className="mt-0.5 text-xs leading-snug text-gray-500">
                    {truncate(displayText, 100)}
                  </p>
                )}
              </div>

              {/* Fork link */}
              <Link
                href={`/hypotheses/${hypothesisId}/submit-run?fork_from=${node.run.id}`}
                className="inline-flex shrink-0 items-center gap-1 rounded px-2 py-1 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700"
              >
                <GitFork className="size-3" />
                Fork
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
