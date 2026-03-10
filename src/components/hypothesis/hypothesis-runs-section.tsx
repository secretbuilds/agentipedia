"use client";

import { useMemo } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RunList } from "@/components/run/run-list";
import { DagTreeView } from "@/components/hypothesis/dag-tree-view";
import { BestPathView } from "@/components/hypothesis/best-path-view";
import { LeavesPanel } from "@/components/hypothesis/leaves-panel";
import { buildRunDag, computeBestPathSteps } from "@/lib/utils/dag";
import type { RunCard } from "@/types/run";

type HypothesisRunsSectionProps = {
  readonly runs: readonly RunCard[];
  readonly metricName: string;
  readonly metricDirection: string;
  readonly hypothesisId: string;
};

export function HypothesisRunsSection({
  runs,
  metricName,
  metricDirection,
  hypothesisId,
}: HypothesisRunsSectionProps) {
  const dag = useMemo(
    () => buildRunDag(runs, metricDirection),
    [runs, metricDirection],
  );

  const bestPathSteps = useMemo(
    () => computeBestPathSteps(dag.bestPath),
    [dag.bestPath],
  );

  return (
    <div className="space-y-6">
      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">
            Runs ({runs.length})
          </TabsTrigger>
          <TabsTrigger value="tree">
            DAG Tree
          </TabsTrigger>
          <TabsTrigger value="best-path">
            Best Path
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <RunList
            runs={[...runs]}
            metric_name={metricName}
            metric_direction={metricDirection}
            hypothesisId={hypothesisId}
          />
        </TabsContent>

        <TabsContent value="tree">
          <DagTreeView
            dag={dag}
            metricName={metricName}
            metricDirection={metricDirection}
            hypothesisId={hypothesisId}
          />
        </TabsContent>

        <TabsContent value="best-path">
          <BestPathView
            steps={bestPathSteps}
            metricName={metricName}
            metricDirection={metricDirection}
            hypothesisId={hypothesisId}
          />
        </TabsContent>
      </Tabs>

      {/* Frontier / Leaves panel below tabs */}
      <LeavesPanel
        leaves={dag.leaves}
        metricName={metricName}
        metricDirection={metricDirection}
        hypothesisId={hypothesisId}
      />
    </div>
  );
}
