import { describe, it, expect } from "vitest";
import { buildRunDag, computeBestPathSteps } from "@/lib/utils/dag";
import type { RunCard } from "@/types/run";

function makeRun(overrides: Partial<RunCard>): RunCard {
  return {
    id: "default-id",
    hypothesis_id: "h1",
    user_id: "u1",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    goal: "test",
    hardware: "A100",
    time_budget: "1h",
    model_size: "7B",
    tag_1: null,
    tag_2: null,
    forked_from: null,
    baseline_metric: 0,
    best_metric: 0,
    best_description: "",
    num_experiments: 1,
    num_kept: 1,
    num_discarded: 0,
    num_crashed: 0,
    improvement_pct: 0,
    results_tsv_url: "",
    code_file_url: "",
    code_filename: "",
    code_snapshot: null,
    synthesis: null,
    depth: 0,
    user: { x_handle: "test", x_display_name: "Test", x_avatar_url: "" },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Edge Case: Single run (no forks)
// ---------------------------------------------------------------------------
describe("buildRunDag — single run (no forks)", () => {
  it("treats a single run as both root and leaf", () => {
    const runs = [makeRun({ id: "solo", best_metric: 42 })];
    const dag = buildRunDag(runs, "higher_is_better");

    expect(dag.roots).toHaveLength(1);
    expect(dag.leaves).toHaveLength(1);
    expect(dag.nodeCount).toBe(1);
    expect(dag.maxDepth).toBe(0);
    expect(dag.roots[0].run.id).toBe("solo");
    expect(dag.leaves[0].run.id).toBe("solo");
    expect(dag.roots[0].isLeaf).toBe(true);
    expect(dag.roots[0].isOnBestPath).toBe(true);
  });

  it("best path contains only the single run", () => {
    const runs = [makeRun({ id: "solo", best_metric: 42 })];
    const dag = buildRunDag(runs, "higher_is_better");

    expect(dag.bestPath).toHaveLength(1);
    expect(dag.bestPath[0].run.id).toBe("solo");
  });

  it("metricDelta is null for a lone root", () => {
    const runs = [makeRun({ id: "solo", best_metric: 42 })];
    const dag = buildRunDag(runs, "higher_is_better");

    expect(dag.roots[0].metricDelta).toBeNull();
    expect(dag.roots[0].metricDirection).toBe("unchanged");
  });
});

// ---------------------------------------------------------------------------
// Edge Case: All roots (no forking — multiple independent runs)
// ---------------------------------------------------------------------------
describe("buildRunDag — all roots (no forking)", () => {
  it("treats every run as both root and leaf", () => {
    const runs = [
      makeRun({ id: "a", best_metric: 10 }),
      makeRun({ id: "b", best_metric: 20 }),
      makeRun({ id: "c", best_metric: 15 }),
    ];
    const dag = buildRunDag(runs, "higher_is_better");

    expect(dag.roots).toHaveLength(3);
    expect(dag.leaves).toHaveLength(3);
    expect(dag.nodeCount).toBe(3);
    expect(dag.maxDepth).toBe(0);
  });

  it("best path goes through the run with best metric (higher_is_better)", () => {
    const runs = [
      makeRun({ id: "a", best_metric: 10 }),
      makeRun({ id: "b", best_metric: 20 }),
      makeRun({ id: "c", best_metric: 15 }),
    ];
    const dag = buildRunDag(runs, "higher_is_better");

    expect(dag.bestPath).toHaveLength(1);
    expect(dag.bestPath[0].run.id).toBe("b");
  });

  it("best path goes through the run with best metric (lower_is_better)", () => {
    const runs = [
      makeRun({ id: "a", best_metric: 10 }),
      makeRun({ id: "b", best_metric: 20 }),
      makeRun({ id: "c", best_metric: 5 }),
    ];
    const dag = buildRunDag(runs, "lower_is_better");

    expect(dag.bestPath).toHaveLength(1);
    expect(dag.bestPath[0].run.id).toBe("c");
  });
});

// ---------------------------------------------------------------------------
// Edge Case: forked_from references a run NOT in the array
// ---------------------------------------------------------------------------
describe("buildRunDag — orphan fork references", () => {
  it("treats runs whose forked_from is not in the set as roots", () => {
    const runs = [
      makeRun({ id: "r1", forked_from: "NONEXISTENT", best_metric: 5 }),
      makeRun({ id: "r2", forked_from: "ALSO_MISSING", best_metric: 8 }),
    ];
    const dag = buildRunDag(runs, "higher_is_better");

    expect(dag.roots).toHaveLength(2);
    expect(dag.roots.map((r) => r.run.id).sort()).toEqual(["r1", "r2"]);
  });

  it("partial orphan: one run references missing parent, other runs are connected", () => {
    const runs = [
      makeRun({ id: "r1", best_metric: 1 }),
      makeRun({ id: "r2", forked_from: "r1", best_metric: 3 }),
      makeRun({ id: "r3", forked_from: "GONE", best_metric: 10 }),
    ];
    const dag = buildRunDag(runs, "higher_is_better");

    // r1 and r3 are both roots
    expect(dag.roots).toHaveLength(2);
    expect(dag.roots.map((r) => r.run.id).sort()).toEqual(["r1", "r3"]);
    // r3 has the best metric so best path goes through it
    expect(dag.bestPath[dag.bestPath.length - 1].run.id).toBe("r3");
  });
});

// ---------------------------------------------------------------------------
// Edge Case: Identical metrics (tie-breaking)
// ---------------------------------------------------------------------------
describe("buildRunDag — identical best_metric (tie-breaking)", () => {
  it("returns a valid best path even when leaves have identical metrics", () => {
    const runs = [
      makeRun({ id: "r1", best_metric: 5 }),
      makeRun({ id: "r2", forked_from: "r1", best_metric: 10 }),
      makeRun({ id: "r3", forked_from: "r1", best_metric: 10 }),
    ];
    const dag = buildRunDag(runs, "higher_is_better");

    // Both r2 and r3 have metric=10. The code uses `isBetter` with strict </>
    // so the reduce keeps the first one found. This is stable and fine.
    expect(dag.bestPath).toHaveLength(2);
    expect(dag.bestPath[0].run.id).toBe("r1");
    // The best leaf should be whichever was encountered first by flatMap
    expect(["r2", "r3"]).toContain(dag.bestPath[1].run.id);
  });

  it("all runs have the same metric — best path still valid", () => {
    const runs = [
      makeRun({ id: "r1", best_metric: 5 }),
      makeRun({ id: "r2", forked_from: "r1", best_metric: 5 }),
      makeRun({ id: "r3", forked_from: "r2", best_metric: 5 }),
    ];
    const dag = buildRunDag(runs, "higher_is_better");

    expect(dag.bestPath.length).toBeGreaterThanOrEqual(1);
    // With identical metrics, reduce keeps first leaf. In a linear chain
    // there is only one leaf (r3), so best path is r1 -> r2 -> r3.
    expect(dag.bestPath.map((n) => n.run.id)).toEqual(["r1", "r2", "r3"]);
  });
});

// ---------------------------------------------------------------------------
// Edge Case: Deep chain (performance / no stack overflow)
// ---------------------------------------------------------------------------
describe("buildRunDag — deep chain performance", () => {
  it("handles a chain of 200 runs without error", () => {
    const runs: RunCard[] = [];
    for (let i = 0; i < 200; i++) {
      runs.push(
        makeRun({
          id: `r${i}`,
          forked_from: i === 0 ? null : `r${i - 1}`,
          best_metric: i,
          depth: i,
        }),
      );
    }
    const dag = buildRunDag(runs, "higher_is_better");

    expect(dag.nodeCount).toBe(200);
    expect(dag.maxDepth).toBe(199);
    expect(dag.roots).toHaveLength(1);
    expect(dag.leaves).toHaveLength(1);
    expect(dag.bestPath).toHaveLength(200);
    expect(dag.bestPath[0].run.id).toBe("r0");
    expect(dag.bestPath[199].run.id).toBe("r199");
  });
});

// ---------------------------------------------------------------------------
// Edge Case: metric direction classification
// ---------------------------------------------------------------------------
describe("buildRunDag — metricDirection classification", () => {
  it("marks improving steps correctly for higher_is_better", () => {
    const runs = [
      makeRun({ id: "r1", best_metric: 5 }),
      makeRun({ id: "r2", forked_from: "r1", best_metric: 8 }),
    ];
    const dag = buildRunDag(runs, "higher_is_better");
    const child = dag.roots[0].children[0];

    expect(child.metricDelta).toBe(3);
    expect(child.metricDirection).toBe("improved");
  });

  it("marks regressing steps correctly for higher_is_better", () => {
    const runs = [
      makeRun({ id: "r1", best_metric: 8 }),
      makeRun({ id: "r2", forked_from: "r1", best_metric: 5 }),
    ];
    const dag = buildRunDag(runs, "higher_is_better");
    const child = dag.roots[0].children[0];

    expect(child.metricDelta).toBe(-3);
    expect(child.metricDirection).toBe("regressed");
  });

  it("marks improving steps correctly for lower_is_better", () => {
    const runs = [
      makeRun({ id: "r1", best_metric: 8 }),
      makeRun({ id: "r2", forked_from: "r1", best_metric: 5 }),
    ];
    const dag = buildRunDag(runs, "lower_is_better");
    const child = dag.roots[0].children[0];

    expect(child.metricDelta).toBe(-3);
    expect(child.metricDirection).toBe("improved");
  });

  it("marks regressing steps correctly for lower_is_better", () => {
    const runs = [
      makeRun({ id: "r1", best_metric: 5 }),
      makeRun({ id: "r2", forked_from: "r1", best_metric: 8 }),
    ];
    const dag = buildRunDag(runs, "lower_is_better");
    const child = dag.roots[0].children[0];

    expect(child.metricDelta).toBe(3);
    expect(child.metricDirection).toBe("regressed");
  });

  it("marks unchanged when delta is zero", () => {
    const runs = [
      makeRun({ id: "r1", best_metric: 5 }),
      makeRun({ id: "r2", forked_from: "r1", best_metric: 5 }),
    ];
    const dag = buildRunDag(runs, "higher_is_better");
    const child = dag.roots[0].children[0];

    expect(child.metricDelta).toBe(0);
    expect(child.metricDirection).toBe("unchanged");
  });
});

// ---------------------------------------------------------------------------
// computeBestPathSteps edge cases
// ---------------------------------------------------------------------------
describe("computeBestPathSteps — edge cases", () => {
  it("returns empty array for empty best path", () => {
    const steps = computeBestPathSteps([]);
    expect(steps).toHaveLength(0);
  });

  it("handles percentage calc when previous metric is zero (division guard)", () => {
    const runs = [
      makeRun({ id: "r1", best_metric: 0, synthesis: "Baseline" }),
      makeRun({ id: "r2", forked_from: "r1", best_metric: 5, synthesis: "Improved" }),
    ];
    const dag = buildRunDag(runs, "higher_is_better");
    const steps = computeBestPathSteps(dag.bestPath);

    expect(steps).toHaveLength(2);
    expect(steps[1].metricDelta).toBe(5);
    // When prev metric is 0, metricDeltaPct should be null (guarded)
    expect(steps[1].metricDeltaPct).toBeNull();
  });

  it("computes percentage correctly for non-zero prev metric", () => {
    const runs = [
      makeRun({ id: "r1", best_metric: 10 }),
      makeRun({ id: "r2", forked_from: "r1", best_metric: 12 }),
    ];
    const dag = buildRunDag(runs, "higher_is_better");
    const steps = computeBestPathSteps(dag.bestPath);

    expect(steps[1].metricDelta).toBe(2);
    expect(steps[1].metricDeltaPct).toBeCloseTo(20);
  });

  it("handles negative prev metric correctly for percentage", () => {
    const runs = [
      makeRun({ id: "r1", best_metric: -10 }),
      makeRun({ id: "r2", forked_from: "r1", best_metric: -8 }),
    ];
    const dag = buildRunDag(runs, "higher_is_better");
    const steps = computeBestPathSteps(dag.bestPath);

    // delta = -8 - (-10) = 2
    expect(steps[1].metricDelta).toBe(2);
    // pct = 2 / abs(-10) * 100 = 20%
    expect(steps[1].metricDeltaPct).toBeCloseTo(20);
  });
});
