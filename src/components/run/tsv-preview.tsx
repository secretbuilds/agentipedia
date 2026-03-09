"use client";

import { cn } from "@/lib/utils";
import { StatusDot } from "@/components/shared/status-dot";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { TsvStats, ParsedTsvRow } from "@/types/experiment";

type TsvPreviewProps = {
  readonly stats: TsvStats | null;
  readonly rows: readonly ParsedTsvRow[];
  readonly errors: readonly string[];
  readonly metricColumnName: string;
};

function formatPct(value: number): string {
  return `${value.toFixed(2)}%`;
}

function getPreviewRows(rows: readonly ParsedTsvRow[]): readonly ParsedTsvRow[] {
  if (rows.length <= 10) {
    return rows;
  }
  const first = rows.slice(0, 5);
  const last = rows.slice(-5);
  return [...first, ...last];
}

export function TsvPreview({
  stats,
  rows,
  errors,
  metricColumnName,
}: TsvPreviewProps) {
  if (errors.length > 0) {
    return (
      <div className="space-y-2 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
        <p className="text-sm font-medium text-red-400">
          TSV validation errors
        </p>
        <ul className="list-inside list-disc space-y-1 text-sm text-red-300">
          {errors.map((err) => (
            <li key={err}>{err}</li>
          ))}
        </ul>
      </div>
    );
  }

  if (!stats || rows.length === 0) {
    return null;
  }

  const previewRows = getPreviewRows(rows);
  const showEllipsis = rows.length > 10;

  return (
    <div className="space-y-4 rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
      <div className="space-y-3">
        <p className="text-sm font-medium text-neutral-200">TSV Summary</p>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-md bg-neutral-800/50 p-3">
            <p className="text-xs text-neutral-400">Baseline</p>
            <p className="font-mono text-sm text-neutral-100">
              {stats.baseline_metric.toFixed(4)}
            </p>
          </div>
          <div className="rounded-md bg-neutral-800/50 p-3">
            <p className="text-xs text-neutral-400">Best</p>
            <p className="font-mono text-sm text-neutral-100">
              {stats.best_metric.toFixed(4)}
            </p>
          </div>
          <div className="rounded-md bg-neutral-800/50 p-3">
            <p className="text-xs text-neutral-400">Improvement</p>
            <p className="font-mono text-sm text-green-400">
              {formatPct(stats.improvement_pct)}
            </p>
          </div>
          <div className="rounded-md bg-neutral-800/50 p-3">
            <p className="text-xs text-neutral-400">Experiments</p>
            <p className="font-mono text-sm text-neutral-100">
              {stats.num_experiments}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 text-sm">
          <StatusDot status="keep" />
          <span className="text-neutral-400">{stats.num_kept}</span>
          <StatusDot status="discard" />
          <span className="text-neutral-400">{stats.num_discarded}</span>
          <StatusDot status="crash" />
          <span className="text-neutral-400">{stats.num_crashed}</span>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-neutral-200">
          Preview ({rows.length} rows)
        </p>
        <div className="overflow-x-auto rounded-md border border-neutral-800">
          <Table>
            <TableHeader>
              <TableRow className="border-neutral-800">
                <TableHead className="text-neutral-400">commit</TableHead>
                <TableHead className="text-neutral-400">
                  {metricColumnName || "metric"}
                </TableHead>
                <TableHead className="text-neutral-400">memory_gb</TableHead>
                <TableHead className="text-neutral-400">status</TableHead>
                <TableHead className="text-neutral-400">description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {previewRows.map((row, idx) => {
                const isEllipsisPoint = showEllipsis && idx === 5;
                return (
                  <TableRow
                    key={`${row.commit}-${idx}`}
                    className={cn(
                      "border-neutral-800",
                      isEllipsisPoint && "border-t-2 border-t-neutral-700",
                    )}
                  >
                    <TableCell className="font-mono text-xs text-neutral-300">
                      {row.commit.slice(0, 8)}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-neutral-200">
                      {row.metric_value.toFixed(4)}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-neutral-400">
                      {row.memory_gb.toFixed(1)}
                    </TableCell>
                    <TableCell>
                      <StatusDot status={row.status} />
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs text-neutral-400">
                      {row.description}
                    </TableCell>
                  </TableRow>
                );
              })}
              {showEllipsis && (
                <TableRow className="border-neutral-800">
                  <TableCell
                    colSpan={5}
                    className="text-center text-xs text-neutral-500"
                  >
                    ... {rows.length - 10} rows hidden ...
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
