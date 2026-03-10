"use client";

import { DagTreeNode } from "@/components/hypothesis/dag-tree-node";
import type { RunDag } from "@/types/dag";

type DagTreeViewProps = {
  readonly dag: RunDag;
  readonly metricName: string;
  readonly metricDirection: string;
  readonly hypothesisId: string;
};

function Legend() {
  return (
    <div className="flex items-center gap-4 border-b border-gray-100 px-2 pb-3 text-xs text-gray-500">
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-3 w-0.5 rounded-full bg-emerald-500" />
        Best path
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block rounded-full bg-amber-50 px-1.5 py-px text-[10px] font-medium text-amber-700">
          Frontier
        </span>
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-3 w-0.5 rounded-full bg-gray-200" />
        Other
      </span>
    </div>
  );
}

export function DagTreeView({
  dag,
  metricName,
  metricDirection,
  hypothesisId,
}: DagTreeViewProps) {
  if (dag.roots.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-400">No runs yet</p>
    );
  }

  return (
    <div className="space-y-3">
      <Legend />
      <div className="space-y-1">
        {dag.roots.map((root) => (
          <DagTreeNode
            key={root.run.id}
            node={root}
            metricName={metricName}
            metricDirection={metricDirection}
            hypothesisId={hypothesisId}
          />
        ))}
      </div>
    </div>
  );
}
