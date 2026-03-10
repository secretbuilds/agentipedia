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
    agent_id: null,
    agent: null,
    user: { x_handle: "test", x_display_name: "Test", x_avatar_url: "" },
    ...overrides,
  };
}

describe("buildRunDag", () => {
  it("returns empty DAG for empty runs", () => {
    const dag = buildRunDag([], "higher_is_better");
    expect(dag.roots).toHaveLength(0);
    expect(dag.leaves).toHaveLength(0);
    expect(dag.nodeCount).toBe(0);
  });

  it("builds a simple linear chain", () => {
    const runs = [
      makeRun({ id: "r1", best_metric: 1, depth: 0 }),
      makeRun({ id: "r2", forked_from: "r1", best_metric: 2, depth: 1 }),
      makeRun({ id: "r3", forked_from: "r2", best_metric: 3, depth: 2 }),
    ];
    const dag = buildRunDag(runs, "higher_is_better");
    expect(dag.roots).toHaveLength(1);
    expect(dag.roots[0].run.id).toBe("r1");
    expect(dag.leaves).toHaveLength(1);
    expect(dag.leaves[0].run.id).toBe("r3");
    expect(dag.maxDepth).toBe(2);
    expect(dag.bestPath.map(n => n.run.id)).toEqual(["r1", "r2", "r3"]);
  });

  it("identifies leaves in a branching tree", () => {
    const runs = [
      makeRun({ id: "r1", best_metric: 1, depth: 0 }),
      makeRun({ id: "r2", forked_from: "r1", best_metric: 2, depth: 1 }),
      makeRun({ id: "r3", forked_from: "r1", best_metric: 3, depth: 1 }),
    ];
    const dag = buildRunDag(runs, "higher_is_better");
    expect(dag.leaves).toHaveLength(2);
    const leafIds = dag.leaves.map(n => n.run.id).sort();
    expect(leafIds).toEqual(["r2", "r3"]);
  });

  it("finds best path respecting higher_is_better", () => {
    const runs = [
      makeRun({ id: "r1", best_metric: 1, depth: 0 }),
      makeRun({ id: "r2", forked_from: "r1", best_metric: 5, depth: 1 }),
      makeRun({ id: "r3", forked_from: "r1", best_metric: 3, depth: 1 }),
    ];
    const dag = buildRunDag(runs, "higher_is_better");
    expect(dag.bestPath.map(n => n.run.id)).toEqual(["r1", "r2"]);
  });

  it("finds best path respecting lower_is_better", () => {
    const runs = [
      makeRun({ id: "r1", best_metric: 5, depth: 0 }),
      makeRun({ id: "r2", forked_from: "r1", best_metric: 2, depth: 1 }),
      makeRun({ id: "r3", forked_from: "r1", best_metric: 3, depth: 1 }),
    ];
    const dag = buildRunDag(runs, "lower_is_better");
    expect(dag.bestPath.map(n => n.run.id)).toEqual(["r1", "r2"]);
  });
});

describe("computeBestPathSteps", () => {
  it("computes metric deltas between steps", () => {
    const runs = [
      makeRun({ id: "r1", best_metric: 1, depth: 0, synthesis: "Initial" }),
      makeRun({ id: "r2", forked_from: "r1", best_metric: 3, depth: 1, synthesis: "Improved" }),
    ];
    const dag = buildRunDag(runs, "higher_is_better");
    const steps = computeBestPathSteps(dag.bestPath);
    expect(steps).toHaveLength(2);
    expect(steps[0].metricDelta).toBeNull();
    expect(steps[1].metricDelta).toBe(2);
    expect(steps[1].parentRunId).toBe("r1");
  });
});
