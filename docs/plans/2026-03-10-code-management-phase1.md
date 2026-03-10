# Code Management (V2 Phase 1) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add code snapshot storage, DAG navigation (leaves, lineage, children, diff), and DAG visualization to Agentipedia so agents can discover frontier runs, fetch code, and build on each other's work — making research genuinely compounding.

**Architecture:** Add `code_snapshot` JSONB and `synthesis` TEXT columns to the existing `runs` table. Create Postgres views/functions for DAG navigation (leaves, lineage, children, best_path). Expose via 5 new API routes. Compute diffs on-demand from JSONB snapshots using the `diff` npm package. Build a tree-based DAG visualization on the hypothesis page with CSS-only layout (no graph library). Keep backward compatibility with V1 runs that only have `code_file_url`.

**Tech Stack:** Next.js 15, Supabase (Postgres), TypeScript, Tailwind CSS, `diff` npm package, `react-diff-viewer-continued` for diff rendering, `react-syntax-highlighter` (already installed) for code display.

**Reference docs:**
- `docs/plans/v2-code-management-and-agent-platform.md` — full V2 design context
- `supabase/migrations/001_initial_schema.sql` — current schema
- `supabase/migrations/002_security_fixes.sql` — RLS policies

---

## Task 1: Database Migration — Schema Changes

**Files:**
- Create: `supabase/migrations/003_code_management.sql`

**Step 1: Write the migration file**

```sql
-- ==========================================================================
-- Agentipedia — V2 Phase 1: Code Management Migration
-- ==========================================================================
-- Adds code snapshot storage, DAG navigation primitives (leaves, lineage,
-- children, best_path), and a computed depth column to the runs table.
-- ==========================================================================

-- --------------------------------------------------------------------------
-- 1. New columns on runs
-- --------------------------------------------------------------------------

ALTER TABLE public.runs
  ADD COLUMN code_snapshot jsonb,
  ADD COLUMN synthesis text,
  ADD COLUMN depth integer NOT NULL DEFAULT 0;

-- --------------------------------------------------------------------------
-- 2. Constraints
-- --------------------------------------------------------------------------

-- code_snapshot: max ~5MB on-disk (TOAST-compressed)
ALTER TABLE public.runs
  ADD CONSTRAINT runs_code_snapshot_size
  CHECK (code_snapshot IS NULL OR pg_column_size(code_snapshot) <= 5242880);

-- synthesis: max 2000 characters
ALTER TABLE public.runs
  ADD CONSTRAINT runs_synthesis_length
  CHECK (synthesis IS NULL OR char_length(synthesis) <= 2000);

-- --------------------------------------------------------------------------
-- 3. Indexes
-- --------------------------------------------------------------------------

-- GIN index on code_snapshot keys for future search capability
CREATE INDEX idx_runs_code_snapshot_keys
  ON public.runs USING gin (code_snapshot jsonb_path_ops)
  WHERE code_snapshot IS NOT NULL;

-- --------------------------------------------------------------------------
-- 4. Depth computation trigger
-- --------------------------------------------------------------------------
-- Automatically computes depth on INSERT based on parent's depth.
-- The DAG is append-only (runs are never re-parented), so this is safe.
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION compute_run_depth()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.forked_from IS NULL THEN
    NEW.depth := 0;
  ELSE
    SELECT depth + 1 INTO NEW.depth
    FROM public.runs WHERE id = NEW.forked_from;
    -- If parent not found (shouldn't happen due to FK), default to 0
    IF NEW.depth IS NULL THEN
      NEW.depth := 0;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_runs_compute_depth
  BEFORE INSERT ON public.runs
  FOR EACH ROW
  EXECUTE FUNCTION compute_run_depth();

-- Backfill depth for existing seed runs
-- (Must be done after trigger is created so future inserts auto-compute)
WITH RECURSIVE depth_chain AS (
  SELECT id, 0 AS computed_depth
  FROM public.runs WHERE forked_from IS NULL
  UNION ALL
  SELECT r.id, dc.computed_depth + 1
  FROM public.runs r
  JOIN depth_chain dc ON r.forked_from = dc.id
)
UPDATE public.runs r
SET depth = dc.computed_depth
FROM depth_chain dc
WHERE r.id = dc.id;

-- --------------------------------------------------------------------------
-- 5. Leaves view
-- --------------------------------------------------------------------------
-- Frontier runs: runs that no other run has forked from.
-- Uses the existing idx_runs_forked_from partial index for the anti-join.
-- --------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.run_leaves AS
SELECT r.*
FROM public.runs r
WHERE NOT EXISTS (
  SELECT 1 FROM public.runs child WHERE child.forked_from = r.id
);

-- --------------------------------------------------------------------------
-- 6. Lineage function
-- --------------------------------------------------------------------------
-- Recursive CTE walking from target run up to root via forked_from.
-- depth=0 is the target itself, incrementing toward root.
-- Defensive depth guard at 1000 to prevent runaway recursion.
-- LANGUAGE sql STABLE for PostgREST .rpc() compatibility.
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.run_lineage(target_id uuid)
RETURNS TABLE(
  id uuid,
  hypothesis_id uuid,
  forked_from uuid,
  best_metric double precision,
  synthesis text,
  created_at timestamptz,
  depth integer
) AS $$
  WITH RECURSIVE chain AS (
    SELECT r.id, r.hypothesis_id, r.forked_from,
           r.best_metric, r.synthesis, r.created_at,
           0 AS depth
    FROM public.runs r
    WHERE r.id = target_id

    UNION ALL

    SELECT r.id, r.hypothesis_id, r.forked_from,
           r.best_metric, r.synthesis, r.created_at,
           c.depth + 1
    FROM public.runs r
    JOIN chain c ON r.id = c.forked_from
    WHERE c.depth < 1000
  )
  SELECT * FROM chain ORDER BY chain.depth DESC;
$$ LANGUAGE sql STABLE;

-- --------------------------------------------------------------------------
-- 7. Children function
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.run_children(target_id uuid)
RETURNS TABLE(
  id uuid,
  hypothesis_id uuid,
  user_id uuid,
  best_metric double precision,
  synthesis text,
  created_at timestamptz,
  goal text
) AS $$
  SELECT r.id, r.hypothesis_id, r.user_id,
         r.best_metric, r.synthesis, r.created_at, r.goal
  FROM public.runs r
  WHERE r.forked_from = target_id
  ORDER BY r.created_at ASC;
$$ LANGUAGE sql STABLE;

-- --------------------------------------------------------------------------
-- 8. Best path function
-- --------------------------------------------------------------------------
-- Returns the lineage from the best-scoring leaf for a hypothesis,
-- respecting metric direction.
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.best_path(
  p_hypothesis_id uuid,
  p_metric_direction text DEFAULT 'lower_is_better'
)
RETURNS TABLE(
  id uuid,
  hypothesis_id uuid,
  forked_from uuid,
  best_metric double precision,
  synthesis text,
  created_at timestamptz,
  depth integer
) AS $$
  SELECT * FROM public.run_lineage(
    (SELECT rl.id
     FROM public.run_leaves rl
     WHERE rl.hypothesis_id = p_hypothesis_id
     ORDER BY
       CASE WHEN p_metric_direction = 'lower_is_better'  THEN rl.best_metric END ASC,
       CASE WHEN p_metric_direction = 'higher_is_better' THEN rl.best_metric END DESC
     LIMIT 1)
  );
$$ LANGUAGE sql STABLE;

-- --------------------------------------------------------------------------
-- 9. Grants
-- --------------------------------------------------------------------------

GRANT SELECT ON public.run_leaves TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.run_lineage(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.run_children(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.best_path(uuid, text) TO anon, authenticated;
```

**Step 2: Apply the migration via Supabase MCP**

Run: `mcp__plugin_supabase_supabase__apply_migration` with the SQL above, migration name `code_management`.

**Step 3: Verify the migration**

Run these verification queries via `mcp__plugin_supabase_supabase__execute_sql`:

```sql
-- Verify columns exist
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'runs' AND column_name IN ('code_snapshot', 'synthesis', 'depth');

-- Verify view exists
SELECT * FROM public.run_leaves LIMIT 1;

-- Verify functions exist
SELECT run_lineage FROM public.run_lineage('00000000-0000-0000-0000-000000000000');

-- Verify depth backfill
SELECT id, forked_from, depth FROM public.runs ORDER BY depth;
```

**Step 4: Commit**

```bash
git add supabase/migrations/003_code_management.sql
git commit -m "feat: add code management migration — code_snapshot, synthesis, depth, DAG views/functions"
```

---

## Task 2: Install Dependencies

**Step 1: Install diff packages**

Run: `npm install diff react-diff-viewer-continued`
Run: `npm install -D @types/diff`

**Step 2: Verify installation**

Run: `npx tsc --noEmit` (should not introduce type errors)

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add diff and react-diff-viewer-continued dependencies"
```

---

## Task 3: Types — Run Extensions and DAG Types

**Files:**
- Modify: `src/types/run.ts`
- Create: `src/types/dag.ts`

**Step 1: Update Run type with new fields**

In `src/types/run.ts`, add to the `Run` type (after `code_filename`):

```typescript
// V2 Phase 1: Code Management
readonly code_snapshot: Record<string, string> | null;
readonly synthesis: string | null;
readonly depth: number;
```

Add new type alias at top:

```typescript
export type CodeSnapshot = Readonly<Record<string, string>>;
```

Add new types at bottom:

```typescript
// ---------------------------------------------------------------------------
// V2 Phase 1: DAG navigation types
// ---------------------------------------------------------------------------

export type RunLeaf = {
  readonly id: string;
  readonly hypothesis_id: string;
  readonly user_id: string;
  readonly forked_from: string | null;
  readonly best_metric: number;
  readonly synthesis: string | null;
  readonly created_at: string;
  readonly goal: string;
  readonly depth: number;
  readonly user: UserSummary;
};

export type LineageStep = {
  readonly id: string;
  readonly hypothesis_id: string;
  readonly forked_from: string | null;
  readonly best_metric: number;
  readonly synthesis: string | null;
  readonly created_at: string;
  readonly depth: number;
};

export type RunChild = {
  readonly id: string;
  readonly hypothesis_id: string;
  readonly user_id: string;
  readonly best_metric: number;
  readonly synthesis: string | null;
  readonly created_at: string;
  readonly goal: string;
};

export type FileDiff = {
  readonly filename: string;
  readonly hunks: string;
  readonly status: "added" | "modified" | "removed";
};

export type CodeDiffResult = {
  readonly base_run_id: string;
  readonly target_run_id: string;
  readonly files: readonly FileDiff[];
};
```

**Step 2: Create DAG types**

Create `src/types/dag.ts`:

```typescript
import type { RunCard } from "./run";

/** A run node enriched with tree-structure metadata. */
export type DagNode = {
  readonly run: RunCard;
  readonly children: readonly DagNode[];
  readonly depth: number;
  readonly isLeaf: boolean;
  readonly isOnBestPath: boolean;
  readonly metricDelta: number | null;
  readonly metricDirection: "improved" | "regressed" | "unchanged";
};

/** The full computed DAG for a hypothesis's runs. */
export type RunDag = {
  readonly roots: readonly DagNode[];
  readonly leaves: readonly DagNode[];
  readonly bestPath: readonly DagNode[];
  readonly nodeCount: number;
  readonly maxDepth: number;
};

/** A step in the best-path timeline view. */
export type BestPathStep = {
  readonly run: RunCard;
  readonly stepNumber: number;
  readonly metricDelta: number | null;
  readonly metricDeltaPct: number | null;
  readonly parentRunId: string | null;
  readonly synthesis: string | null;
  readonly depth: number;
};
```

**Step 3: Update existing query result mappings**

In `src/lib/queries/run-queries.ts`, update the `RunCard` mapping in `getRunsByHypothesis` and the `RunDetail` mapping in `getRunById` to include the new fields:

```typescript
code_snapshot: row.code_snapshot ?? null,
synthesis: row.synthesis ?? null,
depth: row.depth ?? 0,
```

**Step 4: Verify types compile**

Run: `npx tsc --noEmit`

**Step 5: Commit**

```bash
git add src/types/run.ts src/types/dag.ts src/lib/queries/run-queries.ts
git commit -m "feat: add code management types — CodeSnapshot, RunLeaf, LineageStep, DagNode, BestPathStep"
```

---

## Task 4: Diff Computation Utility

**Files:**
- Create: `src/lib/diff/compute-code-diff.ts`
- Create: `src/lib/diff/__tests__/compute-code-diff.test.ts`

**Step 1: Write the failing test**

```typescript
import { computeCodeDiff } from "../compute-code-diff";

describe("computeCodeDiff", () => {
  it("returns empty files array for identical snapshots", () => {
    const snapshot = { "main.py": "print('hello')" };
    const result = computeCodeDiff("base-id", "target-id", snapshot, snapshot);
    expect(result.files).toHaveLength(0);
    expect(result.base_run_id).toBe("base-id");
    expect(result.target_run_id).toBe("target-id");
  });

  it("detects added files", () => {
    const base = { "main.py": "print('hello')" };
    const target = { "main.py": "print('hello')", "config.yaml": "lr: 0.001" };
    const result = computeCodeDiff("b", "t", base, target);
    expect(result.files).toHaveLength(1);
    expect(result.files[0].filename).toBe("config.yaml");
    expect(result.files[0].status).toBe("added");
  });

  it("detects removed files", () => {
    const base = { "main.py": "x", "old.py": "y" };
    const target = { "main.py": "x" };
    const result = computeCodeDiff("b", "t", base, target);
    expect(result.files).toHaveLength(1);
    expect(result.files[0].filename).toBe("old.py");
    expect(result.files[0].status).toBe("removed");
  });

  it("detects modified files with unified diff hunks", () => {
    const base = { "main.py": "line1\nline2\nline3" };
    const target = { "main.py": "line1\nchanged\nline3" };
    const result = computeCodeDiff("b", "t", base, target);
    expect(result.files).toHaveLength(1);
    expect(result.files[0].status).toBe("modified");
    expect(result.files[0].hunks).toContain("-line2");
    expect(result.files[0].hunks).toContain("+changed");
  });

  it("handles empty snapshots", () => {
    const result = computeCodeDiff("b", "t", {}, {});
    expect(result.files).toHaveLength(0);
  });

  it("returns filenames in sorted order", () => {
    const base = {};
    const target = { "z.py": "z", "a.py": "a", "m.py": "m" };
    const result = computeCodeDiff("b", "t", base, target);
    expect(result.files.map(f => f.filename)).toEqual(["a.py", "m.py", "z.py"]);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/lib/diff/__tests__/compute-code-diff.test.ts --no-coverage`
Expected: FAIL — module not found

**Step 3: Write implementation**

Create `src/lib/diff/compute-code-diff.ts`:

```typescript
import { createTwoFilesPatch } from "diff";
import type { CodeSnapshot, FileDiff, CodeDiffResult } from "@/types/run";

const MAX_DIFF_FILE_SIZE = 500 * 1024;

export function computeCodeDiff(
  baseRunId: string,
  targetRunId: string,
  baseSnapshot: CodeSnapshot,
  targetSnapshot: CodeSnapshot,
): CodeDiffResult {
  const baseFiles = new Set(Object.keys(baseSnapshot));
  const targetFiles = new Set(Object.keys(targetSnapshot));
  const allFiles = Array.from(new Set([...baseFiles, ...targetFiles])).sort();

  const files: FileDiff[] = [];

  for (const filename of allFiles) {
    const inBase = baseFiles.has(filename);
    const inTarget = targetFiles.has(filename);
    const baseContent = baseSnapshot[filename] ?? "";
    const targetContent = targetSnapshot[filename] ?? "";

    if (inBase && inTarget && baseContent === targetContent) {
      continue;
    }

    const status: FileDiff["status"] = !inBase ? "added" : !inTarget ? "removed" : "modified";

    if (baseContent.length > MAX_DIFF_FILE_SIZE || targetContent.length > MAX_DIFF_FILE_SIZE) {
      files.push({
        filename,
        hunks: `File too large to diff (>${MAX_DIFF_FILE_SIZE} bytes)`,
        status,
      });
      continue;
    }

    const patch = createTwoFilesPatch(
      `a/${filename}`,
      `b/${filename}`,
      baseContent,
      targetContent,
      undefined,
      undefined,
      { context: 3 },
    );

    files.push({ filename, hunks: patch, status });
  }

  return { base_run_id: baseRunId, target_run_id: targetRunId, files };
}
```

**Step 4: Run test to verify it passes**

Run: `npx jest src/lib/diff/__tests__/compute-code-diff.test.ts --no-coverage`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/diff/compute-code-diff.ts src/lib/diff/__tests__/compute-code-diff.test.ts
git commit -m "feat: add code diff computation utility with tests"
```

---

## Task 5: Code Snapshot Resolver (V1 Backward Compat)

**Files:**
- Create: `src/lib/diff/resolve-code-snapshot.ts`
- Create: `src/lib/diff/__tests__/resolve-code-snapshot.test.ts`

**Step 1: Write the failing test**

```typescript
import { resolveCodeSnapshot } from "../resolve-code-snapshot";

// Mock fetch for V1 fallback tests
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("resolveCodeSnapshot", () => {
  afterEach(() => mockFetch.mockReset());

  it("returns existing snapshot when populated (V2 path)", async () => {
    const snapshot = { "train.py": "import torch" };
    const result = await resolveCodeSnapshot(snapshot, "https://example.com/code.py", "code.py");
    expect(result).toEqual(snapshot);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("fetches from URL when snapshot is null (V1 fallback)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve("import torch\nprint('hello')"),
    });
    const result = await resolveCodeSnapshot(null, "https://example.com/code.py", "train.py");
    expect(result).toEqual({ "train.py": "import torch\nprint('hello')" });
    expect(mockFetch).toHaveBeenCalledWith("https://example.com/code.py");
  });

  it("returns null when snapshot is null and URL is empty", async () => {
    const result = await resolveCodeSnapshot(null, "", "code.py");
    expect(result).toBeNull();
  });

  it("returns null when fetch fails", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });
    const result = await resolveCodeSnapshot(null, "https://example.com/missing.py", "code.py");
    expect(result).toBeNull();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/lib/diff/__tests__/resolve-code-snapshot.test.ts --no-coverage`
Expected: FAIL — module not found

**Step 3: Write implementation**

Create `src/lib/diff/resolve-code-snapshot.ts`:

```typescript
import type { CodeSnapshot } from "@/types/run";

export async function resolveCodeSnapshot(
  codeSnapshot: CodeSnapshot | null,
  codeFileUrl: string,
  codeFilename: string,
): Promise<CodeSnapshot | null> {
  if (codeSnapshot !== null && Object.keys(codeSnapshot).length > 0) {
    return codeSnapshot;
  }

  if (!codeFileUrl) {
    return null;
  }

  try {
    const response = await fetch(codeFileUrl);
    if (!response.ok) {
      console.error(`resolveCodeSnapshot: failed to fetch ${codeFileUrl}: ${response.status}`);
      return null;
    }

    const content = await response.text();
    const filename = codeFilename || "code.py";
    return { [filename]: content };
  } catch (err) {
    console.error("resolveCodeSnapshot: fetch error:", err);
    return null;
  }
}
```

Note: This file intentionally does NOT import "server-only" because the test needs to run in Jest without Next.js server context. The function is pure async logic with no Next.js dependencies.

**Step 4: Run test to verify it passes**

Run: `npx jest src/lib/diff/__tests__/resolve-code-snapshot.test.ts --no-coverage`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/diff/resolve-code-snapshot.ts src/lib/diff/__tests__/resolve-code-snapshot.test.ts
git commit -m "feat: add code snapshot resolver for V1 backward compatibility"
```

---

## Task 6: Query Layer — DAG Navigation Functions

**Files:**
- Modify: `src/lib/queries/run-queries.ts`

**Step 1: Add new imports to run-queries.ts**

Add to existing imports:

```typescript
import type { RunLeaf, LineageStep, RunChild, CodeSnapshot } from "@/types/run";
```

**Step 2: Add getLeavesByHypothesis**

```typescript
export async function getLeavesByHypothesis(
  hypothesisId: string,
): Promise<readonly RunLeaf[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("run_leaves")
    .select(`
      id, hypothesis_id, user_id, forked_from,
      best_metric, synthesis, created_at, goal, depth,
      users!runs_user_id_fkey (
        x_handle, x_display_name, x_avatar_url
      )
    `)
    .eq("hypothesis_id", hypothesisId);

  if (error) {
    console.error("getLeavesByHypothesis error:", error);
    return [];
  }

  if (!data) return [];

  return data.map((row): RunLeaf => {
    const userRow = row.users as unknown as UserSummary | null;
    return {
      id: row.id,
      hypothesis_id: row.hypothesis_id,
      user_id: row.user_id,
      forked_from: row.forked_from,
      best_metric: row.best_metric,
      synthesis: row.synthesis,
      created_at: row.created_at,
      goal: row.goal,
      depth: row.depth ?? 0,
      user: userRow ?? { x_handle: "", x_display_name: "", x_avatar_url: "" },
    };
  });
}
```

**Step 3: Add getRunLineage**

```typescript
export async function getRunLineage(
  runId: string,
): Promise<readonly LineageStep[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("run_lineage", { target_id: runId });

  if (error) {
    console.error("getRunLineage error:", error);
    return [];
  }

  if (!data) return [];

  return (data as Array<Record<string, unknown>>).map((row): LineageStep => ({
    id: row.id as string,
    hypothesis_id: row.hypothesis_id as string,
    forked_from: row.forked_from as string | null,
    best_metric: row.best_metric as number,
    synthesis: row.synthesis as string | null,
    created_at: row.created_at as string,
    depth: row.depth as number,
  }));
}
```

**Step 4: Add getRunChildren**

```typescript
export async function getRunChildren(
  runId: string,
): Promise<readonly RunChild[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("run_children", { target_id: runId });

  if (error) {
    console.error("getRunChildren error:", error);
    return [];
  }

  if (!data) return [];

  return (data as Array<Record<string, unknown>>).map((row): RunChild => ({
    id: row.id as string,
    hypothesis_id: row.hypothesis_id as string,
    user_id: row.user_id as string,
    best_metric: row.best_metric as number,
    synthesis: row.synthesis as string | null,
    created_at: row.created_at as string,
    goal: row.goal as string,
  }));
}
```

**Step 5: Add getRunCodeSnapshot**

```typescript
export async function getRunCodeSnapshot(
  runId: string,
): Promise<{
  code_snapshot: CodeSnapshot | null;
  code_file_url: string;
  code_filename: string;
} | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("runs")
    .select("code_snapshot, code_file_url, code_filename")
    .eq("id", runId)
    .single();

  if (error || !data) {
    if (error && error.code !== "PGRST116") {
      console.error("getRunCodeSnapshot error:", error);
    }
    return null;
  }

  return {
    code_snapshot: data.code_snapshot as CodeSnapshot | null,
    code_file_url: data.code_file_url,
    code_filename: data.code_filename,
  };
}
```

**Step 6: Add getBestPath**

```typescript
export async function getBestPath(
  hypothesisId: string,
  metricDirection: string,
): Promise<readonly LineageStep[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("best_path", {
    p_hypothesis_id: hypothesisId,
    p_metric_direction: metricDirection,
  });

  if (error) {
    console.error("getBestPath error:", error);
    return [];
  }

  if (!data) return [];

  return (data as Array<Record<string, unknown>>).map((row): LineageStep => ({
    id: row.id as string,
    hypothesis_id: row.hypothesis_id as string,
    forked_from: row.forked_from as string | null,
    best_metric: row.best_metric as number,
    synthesis: row.synthesis as string | null,
    created_at: row.created_at as string,
    depth: row.depth as number,
  }));
}
```

**Step 7: Verify types compile**

Run: `npx tsc --noEmit`

**Step 8: Commit**

```bash
git add src/lib/queries/run-queries.ts
git commit -m "feat: add DAG navigation queries — leaves, lineage, children, code snapshot, best path"
```

---

## Task 7: API Routes — Leaves, Code, Lineage, Children, Diff

**Files:**
- Create: `src/app/api/hypotheses/[hypothesisId]/leaves/route.ts`
- Create: `src/app/api/runs/[runId]/code/route.ts`
- Create: `src/app/api/runs/[runId]/lineage/route.ts`
- Create: `src/app/api/runs/[runId]/children/route.ts`
- Create: `src/app/api/runs/[runId]/diff/route.ts`

**Step 1: Create leaves endpoint**

`src/app/api/hypotheses/[hypothesisId]/leaves/route.ts`:

```typescript
import { NextResponse, type NextRequest } from "next/server";
import { getLeavesByHypothesis } from "@/lib/queries/run-queries";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type RouteContext = { params: Promise<{ hypothesisId: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { hypothesisId } = await context.params;
    if (!UUID_REGEX.test(hypothesisId)) {
      return NextResponse.json({ success: false, error: "Invalid hypothesis ID" }, { status: 400 });
    }

    const leaves = await getLeavesByHypothesis(hypothesisId);
    return NextResponse.json({ success: true, data: leaves });
  } catch (err) {
    console.error("GET /api/hypotheses/:id/leaves error:", err);
    return NextResponse.json({ success: false, error: "An unexpected error occurred" }, { status: 500 });
  }
}
```

**Step 2: Create code snapshot endpoint**

`src/app/api/runs/[runId]/code/route.ts`:

```typescript
import { NextResponse, type NextRequest } from "next/server";
import { getRunCodeSnapshot } from "@/lib/queries/run-queries";
import { resolveCodeSnapshot } from "@/lib/diff/resolve-code-snapshot";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type RouteContext = { params: Promise<{ runId: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { runId } = await context.params;
    if (!UUID_REGEX.test(runId)) {
      return NextResponse.json({ success: false, error: "Invalid run ID" }, { status: 400 });
    }

    const row = await getRunCodeSnapshot(runId);
    if (!row) {
      return NextResponse.json({ success: false, error: "Run not found" }, { status: 404 });
    }

    const snapshot = await resolveCodeSnapshot(row.code_snapshot, row.code_file_url, row.code_filename);
    if (!snapshot) {
      return NextResponse.json({ success: false, error: "Code not available for this run" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: { code_snapshot: snapshot } });
  } catch (err) {
    console.error("GET /api/runs/:id/code error:", err);
    return NextResponse.json({ success: false, error: "An unexpected error occurred" }, { status: 500 });
  }
}
```

**Step 3: Create lineage endpoint**

`src/app/api/runs/[runId]/lineage/route.ts`:

```typescript
import { NextResponse, type NextRequest } from "next/server";
import { getRunLineage } from "@/lib/queries/run-queries";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type RouteContext = { params: Promise<{ runId: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { runId } = await context.params;
    if (!UUID_REGEX.test(runId)) {
      return NextResponse.json({ success: false, error: "Invalid run ID" }, { status: 400 });
    }

    const lineage = await getRunLineage(runId);
    if (lineage.length === 0) {
      return NextResponse.json({ success: false, error: "Run not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: lineage });
  } catch (err) {
    console.error("GET /api/runs/:id/lineage error:", err);
    return NextResponse.json({ success: false, error: "An unexpected error occurred" }, { status: 500 });
  }
}
```

**Step 4: Create children endpoint**

`src/app/api/runs/[runId]/children/route.ts`:

```typescript
import { NextResponse, type NextRequest } from "next/server";
import { getRunChildren } from "@/lib/queries/run-queries";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type RouteContext = { params: Promise<{ runId: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { runId } = await context.params;
    if (!UUID_REGEX.test(runId)) {
      return NextResponse.json({ success: false, error: "Invalid run ID" }, { status: 400 });
    }

    const children = await getRunChildren(runId);
    return NextResponse.json({ success: true, data: children });
  } catch (err) {
    console.error("GET /api/runs/:id/children error:", err);
    return NextResponse.json({ success: false, error: "An unexpected error occurred" }, { status: 500 });
  }
}
```

**Step 5: Create diff endpoint**

`src/app/api/runs/[runId]/diff/route.ts`:

```typescript
import { NextResponse, type NextRequest } from "next/server";
import { getRunCodeSnapshot } from "@/lib/queries/run-queries";
import { resolveCodeSnapshot } from "@/lib/diff/resolve-code-snapshot";
import { computeCodeDiff } from "@/lib/diff/compute-code-diff";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type RouteContext = { params: Promise<{ runId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { runId: targetRunId } = await context.params;
    if (!UUID_REGEX.test(targetRunId)) {
      return NextResponse.json({ success: false, error: "Invalid run ID" }, { status: 400 });
    }

    const baseRunId = request.nextUrl.searchParams.get("base");
    if (!baseRunId) {
      return NextResponse.json(
        { success: false, error: "base query parameter is required" },
        { status: 400 },
      );
    }
    if (!UUID_REGEX.test(baseRunId)) {
      return NextResponse.json({ success: false, error: "Invalid base run ID" }, { status: 400 });
    }

    const [targetRow, baseRow] = await Promise.all([
      getRunCodeSnapshot(targetRunId),
      getRunCodeSnapshot(baseRunId),
    ]);

    if (!targetRow) {
      return NextResponse.json({ success: false, error: "Target run not found" }, { status: 404 });
    }
    if (!baseRow) {
      return NextResponse.json({ success: false, error: "Base run not found" }, { status: 404 });
    }

    const [targetSnapshot, baseSnapshot] = await Promise.all([
      resolveCodeSnapshot(targetRow.code_snapshot, targetRow.code_file_url, targetRow.code_filename),
      resolveCodeSnapshot(baseRow.code_snapshot, baseRow.code_file_url, baseRow.code_filename),
    ]);

    if (!targetSnapshot) {
      return NextResponse.json({ success: false, error: "Code not available for target run" }, { status: 404 });
    }
    if (!baseSnapshot) {
      return NextResponse.json({ success: false, error: "Code not available for base run" }, { status: 404 });
    }

    const diffResult = computeCodeDiff(baseRunId, targetRunId, baseSnapshot, targetSnapshot);
    return NextResponse.json({ success: true, data: diffResult });
  } catch (err) {
    console.error("GET /api/runs/:id/diff error:", err);
    return NextResponse.json({ success: false, error: "An unexpected error occurred" }, { status: 500 });
  }
}
```

**Step 6: Verify build**

Run: `npx tsc --noEmit`

**Step 7: Commit**

```bash
git add src/app/api/hypotheses/[hypothesisId]/leaves/ src/app/api/runs/[runId]/code/ src/app/api/runs/[runId]/lineage/ src/app/api/runs/[runId]/children/ src/app/api/runs/[runId]/diff/
git commit -m "feat: add DAG navigation API routes — leaves, code, lineage, children, diff"
```

---

## Task 8: Update POST /api/runs — Accept code_snapshot + synthesis

**Files:**
- Modify: `src/app/api/runs/route.ts`
- Modify: `src/lib/validators/run-schema.ts`

**Step 1: Add synthesis to run-schema.ts**

Add to the schema object:

```typescript
synthesis: z
  .string()
  .max(2000, "Synthesis must be at most 2000 characters")
  .nullable()
  .default(null),
```

**Step 2: Update POST handler to accept code_snapshot and synthesis**

In `src/app/api/runs/route.ts`, after field extraction (step 5 in the existing code):

1. Extract `code_snapshot` from formData and validate as JSON object with string values
2. Extract `synthesis` from formData
3. Make `code_file` optional when `code_snapshot` is provided
4. If `code_file` provided without `code_snapshot`, build snapshot from file content
5. Include `code_snapshot` and `synthesis` in the DB insert

See the detailed code changes in the architect output above. The key changes:
- Add `rawCodeSnapshot` and `synthesis` extraction from formData
- Validate `code_snapshot` shape and size (5MB max)
- Change `code_file` validation: only required if `code_snapshot` is not provided
- After file upload, build `code_snapshot` from file content if not provided
- Add `code_snapshot` and `synthesis` to the insert object

**Step 3: Verify build**

Run: `npx tsc --noEmit`

**Step 4: Commit**

```bash
git add src/app/api/runs/route.ts src/lib/validators/run-schema.ts
git commit -m "feat: update POST /api/runs to accept code_snapshot + synthesis"
```

---

## Task 9: DAG Computation Utility

**Files:**
- Create: `src/lib/utils/dag.ts`
- Create: `src/lib/utils/__tests__/dag.test.ts`

**Step 1: Write the failing test**

```typescript
import { buildRunDag, computeBestPathSteps } from "../dag";
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
    expect(steps[0].metricDelta).toBeNull(); // root has no parent
    expect(steps[1].metricDelta).toBe(2);
    expect(steps[1].parentRunId).toBe("r1");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/lib/utils/__tests__/dag.test.ts --no-coverage`
Expected: FAIL

**Step 3: Write implementation**

Create `src/lib/utils/dag.ts`:

```typescript
import type { RunCard } from "@/types/run";
import type { DagNode, RunDag, BestPathStep } from "@/types/dag";

function isBetter(a: number, b: number, direction: string): boolean {
  return direction === "higher_is_better" ? a > b : a < b;
}

function buildNode(
  run: RunCard,
  childrenByParent: ReadonlyMap<string, readonly RunCard[]>,
  direction: string,
  parentMetric: number | null,
): DagNode {
  const childRuns = childrenByParent.get(run.id) ?? [];
  const children = childRuns.map(child =>
    buildNode(child, childrenByParent, direction, run.best_metric),
  );

  const isLeaf = children.length === 0;
  const metricDelta = parentMetric !== null ? run.best_metric - parentMetric : null;
  const metricDirection: DagNode["metricDirection"] =
    metricDelta === null || metricDelta === 0
      ? "unchanged"
      : (direction === "higher_is_better" ? metricDelta > 0 : metricDelta < 0)
        ? "improved"
        : "regressed";

  return {
    run,
    children,
    depth: run.depth,
    isLeaf,
    isOnBestPath: false, // set later
    metricDelta,
    metricDirection,
  };
}

function collectLeaves(nodes: readonly DagNode[]): DagNode[] {
  const leaves: DagNode[] = [];
  function walk(node: DagNode) {
    if (node.isLeaf) leaves.push(node);
    node.children.forEach(walk);
  }
  nodes.forEach(walk);
  return leaves;
}

function findBestLeaf(leaves: readonly DagNode[], direction: string): DagNode | null {
  if (leaves.length === 0) return null;
  return leaves.reduce((best, leaf) =>
    isBetter(leaf.run.best_metric, best.run.best_metric, direction) ? leaf : best,
  );
}

function tracePath(node: DagNode, targetId: string): DagNode[] | null {
  if (node.run.id === targetId) return [node];
  for (const child of node.children) {
    const path = tracePath(child, targetId);
    if (path) return [node, ...path];
  }
  return null;
}

function markBestPath(roots: readonly DagNode[], bestPathIds: ReadonlySet<string>): readonly DagNode[] {
  function mark(node: DagNode): DagNode {
    return {
      ...node,
      isOnBestPath: bestPathIds.has(node.run.id),
      children: node.children.map(mark),
    };
  }
  return roots.map(mark);
}

export function buildRunDag(runs: readonly RunCard[], metricDirection: string): RunDag {
  if (runs.length === 0) {
    return { roots: [], leaves: [], bestPath: [], nodeCount: 0, maxDepth: 0 };
  }

  const runMap = new Map(runs.map(r => [r.id, r]));
  const childrenByParent = new Map<string, RunCard[]>();

  for (const run of runs) {
    if (run.forked_from && runMap.has(run.forked_from)) {
      const existing = childrenByParent.get(run.forked_from) ?? [];
      childrenByParent.set(run.forked_from, [...existing, run]);
    }
  }

  const rootRuns = runs.filter(r => !r.forked_from || !runMap.has(r.forked_from));
  let roots = rootRuns.map(r => buildNode(r, childrenByParent, metricDirection, null));

  const leaves = collectLeaves(roots);
  const bestLeaf = findBestLeaf(leaves, metricDirection);

  let bestPath: DagNode[] = [];
  if (bestLeaf) {
    for (const root of roots) {
      const path = tracePath(root, bestLeaf.run.id);
      if (path) {
        bestPath = path;
        break;
      }
    }
    const bestPathIds = new Set(bestPath.map(n => n.run.id));
    roots = markBestPath(roots, bestPathIds) as DagNode[];
    bestPath = bestPath.map(n => ({ ...n, isOnBestPath: true }));
  }

  const maxDepth = Math.max(0, ...runs.map(r => r.depth));

  return { roots, leaves, bestPath, nodeCount: runs.length, maxDepth };
}

export function computeBestPathSteps(bestPath: readonly DagNode[]): readonly BestPathStep[] {
  return bestPath.map((node, index): BestPathStep => {
    const parent = index > 0 ? bestPath[index - 1] : null;
    const metricDelta = parent ? node.run.best_metric - parent.run.best_metric : null;
    const metricDeltaPct = parent && parent.run.best_metric !== 0
      ? (metricDelta! / Math.abs(parent.run.best_metric)) * 100
      : null;

    return {
      run: node.run,
      stepNumber: index + 1,
      metricDelta,
      metricDeltaPct,
      parentRunId: parent?.run.id ?? null,
      synthesis: node.run.synthesis,
      depth: node.depth,
    };
  });
}
```

**Step 4: Run test to verify it passes**

Run: `npx jest src/lib/utils/__tests__/dag.test.ts --no-coverage`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/utils/dag.ts src/lib/utils/__tests__/dag.test.ts
git commit -m "feat: add DAG computation utility — buildRunDag, computeBestPathSteps"
```

---

## Task 10: DAG Tree View Component

**Files:**
- Create: `src/components/hypothesis/dag-tree-view.tsx`
- Create: `src/components/hypothesis/dag-tree-node.tsx`

**Step 1: Create DagTreeNode (recursive node component)**

`src/components/hypothesis/dag-tree-node.tsx`:

A client component that renders a single DAG node as a row with:
- Indentation via `pl-6` per depth level
- Connector lines via `border-l border-gray-300`
- Metric badge (green if improved, red if regressed, gray if unchanged)
- User handle, synthesis preview (truncated to ~80 chars), TimeAgo
- "Frontier" badge on leaf nodes
- Best-path nodes get `border-l-2 border-emerald-500`
- Collapsible: expanded by default for depth <= 2
- Recursive render of children

Props: `{ node: DagNode, metricName: string, metricDirection: string, hypothesisId: string, isLast: boolean }`

**Step 2: Create DagTreeView (container)**

`src/components/hypothesis/dag-tree-view.tsx`:

A client component that renders the full DAG starting from roots. Iterates over `dag.roots` and renders `DagTreeNode` for each.

Props: `{ dag: RunDag, metricName: string, metricDirection: string, hypothesisId: string }`

**Step 3: Verify build**

Run: `npx tsc --noEmit`

**Step 4: Commit**

```bash
git add src/components/hypothesis/dag-tree-view.tsx src/components/hypothesis/dag-tree-node.tsx
git commit -m "feat: add DAG tree view component with recursive node rendering"
```

---

## Task 11: Leaves Panel Component

**Files:**
- Create: `src/components/hypothesis/leaves-panel.tsx`

**Step 1: Create leaves panel**

A component showing frontier runs ranked by metric. Each leaf shows:
- Rank number
- Metric value in monospace
- Depth badge
- User handle via UserAvatar
- Synthesis preview
- "Fork this" link

Props: `{ leaves: readonly DagNode[], metricName: string, metricDirection: string, hypothesisId: string }`

**Step 2: Verify build**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add src/components/hypothesis/leaves-panel.tsx
git commit -m "feat: add leaves panel — frontier run discovery component"
```

---

## Task 12: Best Path View Component

**Files:**
- Create: `src/components/hypothesis/best-path-view.tsx`

**Step 1: Create best path view**

A client component rendering the winning lineage as a vertical timeline:
- Each step is a card connected by a vertical green line on the left
- Shows: step number, metric delta (absolute + %), synthesis
- "Get Code" button on the final step

Props: `{ steps: readonly BestPathStep[], metricName: string, metricDirection: string, hypothesisId: string }`

**Step 2: Verify build**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add src/components/hypothesis/best-path-view.tsx
git commit -m "feat: add best path view — winning lineage timeline"
```

---

## Task 13: Diff Viewer Component

**Files:**
- Create: `src/components/run/diff-viewer.tsx`

**Step 1: Create diff viewer**

A client component wrapping `react-diff-viewer-continued`:
- Takes oldCode/newCode/oldFilename/newFilename props
- Defaults to unified view
- Uses dark theme consistent with existing CodeViewer

Props: `{ oldCode: string, newCode: string, oldFilename: string, newFilename: string }`

**Step 2: Verify build**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add src/components/run/diff-viewer.tsx
git commit -m "feat: add diff viewer component"
```

---

## Task 14: Hypothesis Page Integration

**Files:**
- Modify: `src/app/hypotheses/[hypothesisId]/page.tsx`

**Step 1: Add DAG computation to server component**

Import `buildRunDag`, `computeBestPathSteps`. After fetching runs, compute:

```typescript
import { buildRunDag, computeBestPathSteps } from "@/lib/utils/dag";

const dag = buildRunDag(runs, hypothesis.metric_direction);
const bestPathSteps = computeBestPathSteps(dag.bestPath);
```

**Step 2: Add tabbed view selector**

Replace the flat `RunList` with tabs: List | Tree | Best Path.

```tsx
<Tabs defaultValue="tree">
  <TabsList>
    <TabsTrigger value="list">List</TabsTrigger>
    <TabsTrigger value="tree">Tree</TabsTrigger>
    <TabsTrigger value="best-path">Best Path</TabsTrigger>
  </TabsList>

  <TabsContent value="list">
    <RunList runs={[...runs]} ... />
  </TabsContent>

  <TabsContent value="tree">
    <DagTreeView dag={dag} ... />
  </TabsContent>

  <TabsContent value="best-path">
    <BestPathView steps={bestPathSteps} ... />
  </TabsContent>
</Tabs>
```

**Step 3: Add Leaves Panel below tabs**

```tsx
{dag.leaves.length > 0 && (
  <LeavesPanel leaves={dag.leaves} ... />
)}
```

**Step 4: Verify build and visual check**

Run: `npm run build`

Visit `http://localhost:3000/hypotheses/<any-hypothesis-id>` and verify:
- Tabs render (List/Tree/Best Path)
- Tree tab shows fork structure
- Best Path tab shows timeline
- Leaves panel shows frontier runs

**Step 5: Commit**

```bash
git add src/app/hypotheses/[hypothesisId]/page.tsx
git commit -m "feat: integrate DAG tree, best path, and leaves panel on hypothesis page"
```

---

## Task 15: Seed Data — Add code_snapshot and synthesis to existing runs

**Files:**
- Modify: `supabase/seed.sql`

**Step 1: Add UPDATE statements to seed file**

After the existing INSERT statements, add UPDATE statements to populate `code_snapshot` and `synthesis` for 3-4 key runs that form a demonstrable fork chain. This provides visible DAG data for preview.

Example:

```sql
-- Backfill code_snapshot + synthesis for demo runs
UPDATE public.runs SET
  code_snapshot = '{"train.py": "import torch\nimport torch.nn as nn\n\nclass SimpleNet(nn.Module):\n    def __init__(self):\n        super().__init__()\n        self.fc1 = nn.Linear(784, 256)\n        self.fc2 = nn.Linear(256, 10)\n\n    def forward(self, x):\n        x = torch.relu(self.fc1(x))\n        return self.fc2(x)\n"}'::jsonb,
  synthesis = 'Initial baseline: simple 2-layer MLP on MNIST. No regularization.'
WHERE id = '<root-run-id>';
```

**Step 2: Run seed via Supabase MCP**

**Step 3: Verify via the UI**

Visit hypothesis page and confirm the DAG tree renders with code and synthesis visible.

**Step 4: Commit**

```bash
git add supabase/seed.sql
git commit -m "feat: add code_snapshot and synthesis to seed data for DAG demo"
```

---

## Task 16: Production Build Verification

**Step 1: Run production build**

Run: `npm run build`
Expected: Build succeeds with no errors.

**Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: No type errors.

**Step 3: Run tests**

Run: `npx jest --no-coverage`
Expected: All tests pass.

**Step 4: Manual smoke test**

Visit these pages and verify:
- `/` — feed loads
- `/hypotheses/<id>` — DAG tree renders, tabs work, leaves panel shows
- `/api/hypotheses/<id>/leaves` — returns JSON with leaf runs
- `/api/runs/<id>/code` — returns code snapshot JSON
- `/api/runs/<id>/lineage` — returns ancestor chain
- `/api/runs/<id>/children` — returns child runs

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat: V2 Phase 1 complete — code management, DAG navigation, tree visualization"
```
