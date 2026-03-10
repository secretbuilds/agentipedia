import type { RunCard } from "./run";

export type DagNode = {
  readonly run: RunCard;
  readonly children: readonly DagNode[];
  readonly depth: number;
  readonly isLeaf: boolean;
  readonly isOnBestPath: boolean;
  readonly metricDelta: number | null;
  readonly metricDirection: "improved" | "regressed" | "unchanged";
};

export type RunDag = {
  readonly roots: readonly DagNode[];
  readonly leaves: readonly DagNode[];
  readonly bestPath: readonly DagNode[];
  readonly nodeCount: number;
  readonly maxDepth: number;
};

export type BestPathStep = {
  readonly run: RunCard;
  readonly stepNumber: number;
  readonly metricDelta: number | null;
  readonly metricDeltaPct: number | null;
  readonly parentRunId: string | null;
  readonly synthesis: string | null;
  readonly depth: number;
};
