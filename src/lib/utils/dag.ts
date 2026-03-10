import type { RunCard } from "@/types/run";
import type { DagNode, RunDag, BestPathStep } from "@/types/dag";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isBetter(
  a: number,
  b: number,
  metricDirection: string,
): boolean {
  return metricDirection === "lower_is_better" ? a < b : a > b;
}

function classifyDelta(
  delta: number,
  metricDirection: string,
): "improved" | "regressed" | "unchanged" {
  if (delta === 0) return "unchanged";
  const positive = delta > 0;
  if (metricDirection === "higher_is_better") {
    return positive ? "improved" : "regressed";
  }
  // lower_is_better: a negative delta means improvement
  return positive ? "regressed" : "improved";
}

// ---------------------------------------------------------------------------
// Internal recursive tree builder (produces nodes WITHOUT best-path marking)
// ---------------------------------------------------------------------------

type PreNode = {
  readonly run: RunCard;
  readonly children: readonly PreNode[];
  readonly depth: number;
  readonly isLeaf: boolean;
  readonly metricDelta: number | null;
  readonly metricDirection: "improved" | "regressed" | "unchanged";
};

function buildSubtree(
  run: RunCard,
  childrenMap: ReadonlyMap<string, readonly RunCard[]>,
  depth: number,
  parentMetric: number | null,
  metricDir: string,
): PreNode {
  const kids = childrenMap.get(run.id) ?? [];

  const childNodes: readonly PreNode[] = kids.map((child) =>
    buildSubtree(child, childrenMap, depth + 1, run.best_metric, metricDir),
  );

  const delta =
    parentMetric === null ? null : run.best_metric - parentMetric;

  const direction: "improved" | "regressed" | "unchanged" =
    delta === null ? "unchanged" : classifyDelta(delta, metricDir);

  return {
    run,
    children: childNodes,
    depth,
    isLeaf: childNodes.length === 0,
    metricDelta: delta,
    metricDirection: direction,
  };
}

// ---------------------------------------------------------------------------
// Collect all leaf PreNodes
// ---------------------------------------------------------------------------

function collectLeaves(node: PreNode): readonly PreNode[] {
  if (node.isLeaf) return [node];
  return node.children.flatMap(collectLeaves);
}

// ---------------------------------------------------------------------------
// Count all nodes in a subtree
// ---------------------------------------------------------------------------

function countNodes(node: PreNode): number {
  return 1 + node.children.reduce((sum, c) => sum + countNodes(c), 0);
}

// ---------------------------------------------------------------------------
// Find the path from a root to a target run id, returning PreNode[]
// ---------------------------------------------------------------------------

function findPathTo(
  node: PreNode,
  targetId: string,
): readonly PreNode[] | null {
  if (node.run.id === targetId) return [node];
  for (const child of node.children) {
    const sub = findPathTo(child, targetId);
    if (sub !== null) return [node, ...sub];
  }
  return null;
}

// ---------------------------------------------------------------------------
// Re-tag a PreNode tree marking best-path membership
// ---------------------------------------------------------------------------

function tagBestPath(
  node: PreNode,
  bestPathIds: ReadonlySet<string>,
): DagNode {
  return {
    run: node.run,
    children: node.children.map((c) => tagBestPath(c, bestPathIds)),
    depth: node.depth,
    isLeaf: node.isLeaf,
    isOnBestPath: bestPathIds.has(node.run.id),
    metricDelta: node.metricDelta,
    metricDirection: node.metricDirection,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function buildRunDag(
  runs: readonly RunCard[],
  metricDirection: string,
): RunDag {
  if (runs.length === 0) {
    return { roots: [], leaves: [], bestPath: [], nodeCount: 0, maxDepth: 0 };
  }

  // Index runs by id
  const byId = new Map<string, RunCard>(runs.map((r) => [r.id, r]));

  // Group children by forked_from
  const childrenMap = new Map<string, RunCard[]>();
  for (const run of runs) {
    if (run.forked_from !== null && byId.has(run.forked_from)) {
      const existing = childrenMap.get(run.forked_from);
      if (existing) {
        childrenMap.set(run.forked_from, [...existing, run]);
      } else {
        childrenMap.set(run.forked_from, [run]);
      }
    }
  }

  // Identify roots
  const rootRuns = runs.filter(
    (r) => r.forked_from === null || !byId.has(r.forked_from),
  );

  // Build PreNode trees
  const preRoots: readonly PreNode[] = rootRuns.map((r) =>
    buildSubtree(r, childrenMap, 0, null, metricDirection),
  );

  // Collect leaves across all roots
  const allLeaves: readonly PreNode[] = preRoots.flatMap(collectLeaves);

  // Find best leaf
  const bestLeaf = allLeaves.reduce<PreNode | null>((best, leaf) => {
    if (best === null) return leaf;
    return isBetter(leaf.run.best_metric, best.run.best_metric, metricDirection)
      ? leaf
      : best;
  }, null);

  // Build best path
  let bestPathPreNodes: readonly PreNode[] = [];
  if (bestLeaf !== null) {
    for (const root of preRoots) {
      const path = findPathTo(root, bestLeaf.run.id);
      if (path !== null) {
        bestPathPreNodes = path;
        break;
      }
    }
  }

  const bestPathIds = new Set(bestPathPreNodes.map((n) => n.run.id));

  // Tag all nodes with isOnBestPath and produce final DagNode trees
  const finalRoots: readonly DagNode[] = preRoots.map((r) =>
    tagBestPath(r, bestPathIds),
  );

  // Recompute leaves/bestPath from final DagNode trees
  const finalLeaves: readonly DagNode[] = finalRoots.flatMap(
    function collectDagLeaves(node: DagNode): readonly DagNode[] {
      if (node.isLeaf) return [node];
      return node.children.flatMap(collectDagLeaves);
    },
  );

  const finalBestPath: readonly DagNode[] = (() => {
    if (bestLeaf === null) return [];
    for (const root of finalRoots) {
      const path = findDagPathTo(root, bestLeaf.run.id);
      if (path !== null) return path;
    }
    return [];
  })();

  const nodeCount = preRoots.reduce((sum, r) => sum + countNodes(r), 0);
  const maxDepth = allLeaves.reduce(
    (max, leaf) => Math.max(max, leaf.depth),
    0,
  );

  return {
    roots: finalRoots,
    leaves: finalLeaves,
    bestPath: finalBestPath,
    nodeCount,
    maxDepth,
  };
}

function findDagPathTo(
  node: DagNode,
  targetId: string,
): readonly DagNode[] | null {
  if (node.run.id === targetId) return [node];
  for (const child of node.children) {
    const sub = findDagPathTo(child, targetId);
    if (sub !== null) return [node, ...sub];
  }
  return null;
}

export function computeBestPathSteps(
  bestPath: readonly DagNode[],
): readonly BestPathStep[] {
  return bestPath.map((node, index) => {
    const isRoot = index === 0;
    const prev = isRoot ? null : bestPath[index - 1];

    const metricDelta = prev === null ? null : node.run.best_metric - prev.run.best_metric;

    const metricDeltaPct =
      metricDelta === null || prev === null || prev.run.best_metric === 0
        ? null
        : (metricDelta / Math.abs(prev.run.best_metric)) * 100;

    return {
      run: node.run,
      stepNumber: index + 1,
      metricDelta,
      metricDeltaPct,
      parentRunId: prev === null ? null : prev.run.id,
      synthesis: node.run.synthesis,
      depth: node.depth,
    };
  });
}
