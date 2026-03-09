"use client";

import { useActionState, useState, useCallback } from "react";
import { submitRun, type RunActionState } from "@/lib/actions/run-actions";
import { parseTsv } from "@/lib/parsers/tsv-parser";
import { validateTsvRows } from "@/lib/parsers/tsv-validator";
import { extractTsvStats } from "@/lib/parsers/tsv-stats";
import { ALLOWED_CODE_EXTENSIONS, MAX_TSV_SIZE, MAX_CODE_SIZE } from "@/lib/utils/constants";

type SubmitRunFormProps = {
  hypothesisId: string;
  metricDirection: "lower_is_better" | "higher_is_better";
  metricName: string;
};

const initialState: RunActionState = { success: false };

export function SubmitRunForm({
  hypothesisId,
  metricDirection,
  metricName,
}: SubmitRunFormProps) {
  const boundSubmitRun = submitRun.bind(null, hypothesisId);
  const [state, formAction, pending] = useActionState(
    boundSubmitRun,
    initialState
  );

  const [tsvPreview, setTsvPreview] = useState<{
    rows: number;
    baseline: number | null;
    best: number | null;
    improvement: number | null;
  } | null>(null);
  const [tsvError, setTsvError] = useState<string | null>(null);

  const handleTsvChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      setTsvPreview(null);
      setTsvError(null);
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > MAX_TSV_SIZE) {
        setTsvError("File exceeds 5 MB limit");
        return;
      }

      const text = await file.text();
      const parsed = parseTsv(text);
      if (parsed.errors.length > 0) {
        setTsvError(parsed.errors[0]);
        return;
      }

      const validation = validateTsvRows(parsed.rows, parsed.headers);
      if (validation.errors.length > 0) {
        setTsvError(validation.errors[0]);
        return;
      }

      const stats = extractTsvStats(validation.rows, metricDirection);
      setTsvPreview({
        rows: validation.rows.length,
        baseline: stats.baseline_metric,
        best: stats.best_metric,
        improvement: stats.improvement_pct,
      });
    },
    [metricDirection]
  );

  return (
    <form action={formAction} className="space-y-6">
      {state.message && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
          {state.message}
        </div>
      )}

      <div>
        <label htmlFor="goal" className="block text-sm font-medium">
          Goal / approach
        </label>
        <textarea
          id="goal"
          name="goal"
          required
          rows={3}
          placeholder="What approach did you take? e.g., Added GQA attention mechanism..."
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        {state.errors?.goal && (
          <p className="mt-1 text-xs text-red-400">{state.errors.goal[0]}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="hardware" className="block text-sm font-medium">
            Hardware
          </label>
          <input
            id="hardware"
            name="hardware"
            type="text"
            required
            placeholder="1x A100 80GB"
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="time_budget" className="block text-sm font-medium">
            Time budget
          </label>
          <input
            id="time_budget"
            name="time_budget"
            type="text"
            required
            placeholder="4 hours"
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label htmlFor="model_size" className="block text-sm font-medium">
          Model size
        </label>
        <input
          id="model_size"
          name="model_size"
          type="text"
          required
          placeholder="124M params"
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
      </div>

      {/* File uploads */}
      <div>
        <label htmlFor="results_tsv" className="block text-sm font-medium">
          results.tsv
        </label>
        <input
          id="results_tsv"
          name="results_tsv"
          type="file"
          required
          accept=".tsv,.txt"
          onChange={handleTsvChange}
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-muted file:px-3 file:py-1 file:text-xs file:font-medium"
        />
        {tsvError && (
          <p className="mt-1 text-xs text-red-400">{tsvError}</p>
        )}
        {tsvPreview && (
          <div className="mt-2 rounded border border-border p-3 text-xs">
            <p>
              {tsvPreview.rows} experiments | Baseline:{" "}
              {tsvPreview.baseline !== null ? tsvPreview.baseline.toFixed(4) : "N/A"}{" "}
              | Best: {tsvPreview.best !== null ? tsvPreview.best.toFixed(4) : "N/A"}{" "}
              ({metricName})
              {tsvPreview.improvement !== null && (
                <span className="ml-1 text-green-400">
                  +{tsvPreview.improvement.toFixed(1)}% improvement
                </span>
              )}
            </p>
          </div>
        )}
      </div>

      <div>
        <label htmlFor="code_file" className="block text-sm font-medium">
          Code file
        </label>
        <input
          id="code_file"
          name="code_file"
          type="file"
          required
          accept={ALLOWED_CODE_EXTENSIONS.join(",")}
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-muted file:px-3 file:py-1 file:text-xs file:font-medium"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          The evolved code file (max {MAX_CODE_SIZE / 1024 / 1024} MB)
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="tag_1" className="block text-sm font-medium">
            Tag 1 (optional)
          </label>
          <input
            id="tag_1"
            name="tag_1"
            type="text"
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="tag_2" className="block text-sm font-medium">
            Tag 2 (optional)
          </label>
          <input
            id="tag_2"
            name="tag_2"
            type="text"
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
      </div>

      <input type="hidden" name="forked_from" value="" />

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-black transition-colors hover:bg-gray-200 disabled:opacity-50"
      >
        {pending ? "Submitting..." : "Submit Run"}
      </button>
    </form>
  );
}
