"use client";

import { StatusDot } from "@/components/shared/status-dot";

type Experiment = {
  sequence: number;
  commit_hash: string;
  metric_value: number;
  memory_gb: number;
  status: string;
  description: string;
};

type ExperimentTableProps = {
  experiments: Experiment[];
  metricName: string;
};

export function ExperimentTable({
  experiments,
  metricName,
}: ExperimentTableProps) {
  if (experiments.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="px-3 py-2 text-left font-medium">#</th>
            <th className="px-3 py-2 text-left font-medium">Commit</th>
            <th className="px-3 py-2 text-right font-medium">{metricName}</th>
            <th className="px-3 py-2 text-right font-medium">Memory</th>
            <th className="px-3 py-2 text-center font-medium">Status</th>
            <th className="px-3 py-2 text-left font-medium">Description</th>
          </tr>
        </thead>
        <tbody>
          {experiments.map((exp) => (
            <tr
              key={exp.sequence}
              className="border-b border-border last:border-0 hover:bg-muted/30"
            >
              <td className="px-3 py-2 text-muted-foreground">
                {exp.sequence}
              </td>
              <td className="px-3 py-2 font-mono text-xs">
                {exp.commit_hash.slice(0, 8)}
              </td>
              <td className="px-3 py-2 text-right font-mono">
                {exp.metric_value.toFixed(4)}
              </td>
              <td className="px-3 py-2 text-right font-mono">
                {exp.memory_gb.toFixed(1)} GB
              </td>
              <td className="px-3 py-2 text-center">
                <StatusDot
                  status={exp.status as "keep" | "discard" | "crash"}
                  showLabel
                />
              </td>
              <td className="max-w-xs truncate px-3 py-2 text-muted-foreground">
                {exp.description}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
