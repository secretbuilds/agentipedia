"use client";

import { useEffect, useState } from "react";
import { DiffViewer } from "@/components/run/diff-viewer";
import type { CodeSnapshot } from "@/types/run";

type RunDiffSectionProps = {
  readonly runId: string;
  readonly forkedFromId: string;
};

type FetchState =
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "empty" }
  | {
      readonly status: "ready";
      readonly parentCode: string;
      readonly currentCode: string;
    };

function snapshotToString(snapshot: CodeSnapshot): string {
  const entries = Object.entries(snapshot);
  if (entries.length === 0) return "";
  if (entries.length === 1) return entries[0][1];
  return entries.map(([name, code]) => `// === ${name} ===\n${code}`).join("\n\n");
}

async function fetchCodeSnapshot(runId: string): Promise<CodeSnapshot | null> {
  const res = await fetch(`/api/runs/${runId}/code`);
  if (!res.ok) return null;
  const json = await res.json();
  if (!json.success || !json.data?.code_snapshot) return null;
  return json.data.code_snapshot as CodeSnapshot;
}

export function RunDiffSection({ runId, forkedFromId }: RunDiffSectionProps) {
  const [state, setState] = useState<FetchState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState({ status: "loading" });

      try {
        const [parentSnapshot, currentSnapshot] = await Promise.all([
          fetchCodeSnapshot(forkedFromId),
          fetchCodeSnapshot(runId),
        ]);

        if (cancelled) return;

        if (!parentSnapshot && !currentSnapshot) {
          setState({ status: "empty" });
          return;
        }

        const parentCode = parentSnapshot
          ? snapshotToString(parentSnapshot)
          : "// No code available for parent run";
        const currentCode = currentSnapshot
          ? snapshotToString(currentSnapshot)
          : "// No code available for this run";

        setState({ status: "ready", parentCode, currentCode });
      } catch {
        if (cancelled) return;
        setState({
          status: "error",
          message: "Failed to load code diff. Please try again later.",
        });
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [runId, forkedFromId]);

  return (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold text-gray-900">
        Code Changes from Parent
      </h2>

      {state.status === "loading" && (
        <div className="space-y-2">
          <div className="h-6 w-48 animate-pulse rounded bg-gray-100" />
          <div className="h-64 animate-pulse rounded-lg bg-gray-100" />
        </div>
      )}

      {state.status === "error" && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.message}
        </div>
      )}

      {state.status === "empty" && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500">
          No code available for comparison.
        </div>
      )}

      {state.status === "ready" && (
        <DiffViewer
          oldCode={state.parentCode}
          newCode={state.currentCode}
          oldTitle="Parent run"
          newTitle="This run"
        />
      )}
    </div>
  );
}
