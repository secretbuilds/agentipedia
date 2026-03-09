"use client";

import { useMemo } from "react";
import {
  ComposedChart,
  Scatter,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import type { Experiment } from "@/types/experiment";

type ProgressionChartProps = {
  readonly experiments: readonly Experiment[];
  readonly metricName: string;
  readonly metricDirection: string;
};

type ChartPoint = {
  readonly sequence: number;
  readonly metric_value: number;
  readonly status: string;
  readonly commit_hash: string;
  readonly description: string;
  readonly memory_gb: number;
};

const STATUS_FILL: Record<string, string> = {
  keep: "#4ade80",
  discard: "#737373",
  crash: "#f87171",
};

function CustomTooltip({
  active,
  payload,
}: {
  readonly active?: boolean;
  readonly payload?: readonly { readonly payload: ChartPoint }[];
}) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const data = payload[0].payload;

  return (
    <div className="rounded-lg border border-neutral-700 bg-neutral-900 p-3 text-xs shadow-lg">
      <p className="font-mono text-neutral-200">
        {data.commit_hash.slice(0, 8)}
      </p>
      <p className="text-neutral-400">{data.description}</p>
      <p className="mt-1 text-neutral-200">
        Metric: <span className="font-mono">{data.metric_value.toFixed(4)}</span>
      </p>
      <p className="text-neutral-400">
        Memory: <span className="font-mono">{data.memory_gb.toFixed(1)} GB</span>
      </p>
      <p className="capitalize text-neutral-400">
        Status: <span style={{ color: STATUS_FILL[data.status] }}>{data.status}</span>
      </p>
    </div>
  );
}

export function ProgressionChart({
  experiments,
  metricName,
  metricDirection,
}: ProgressionChartProps) {
  const { allPoints, keepLine, baseline } = useMemo(() => {
    const points: ChartPoint[] = experiments.map((exp) => ({
      sequence: exp.sequence,
      metric_value: exp.metric_value,
      status: exp.status,
      commit_hash: exp.commit_hash,
      description: exp.description,
      memory_gb: exp.memory_gb,
    }));

    const keepPoints = points.filter((p) => p.status === "keep");

    // Find baseline: commit === "baseline" or first experiment
    const baselineExp = experiments.find(
      (e) => e.commit_hash.toLowerCase() === "baseline",
    );
    const baselineValue = baselineExp?.metric_value ?? experiments[0]?.metric_value ?? null;

    return {
      allPoints: points,
      keepLine: keepPoints,
      baseline: baselineValue,
    };
  }, [experiments]);

  if (experiments.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold text-neutral-100">
        Metric Progression
      </h2>
      <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart
            data={allPoints}
            margin={{ top: 10, right: 20, bottom: 20, left: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
            <XAxis
              dataKey="sequence"
              stroke="#525252"
              tick={{ fill: "#a3a3a3", fontSize: 12 }}
              label={{
                value: "Experiment #",
                position: "insideBottom",
                offset: -10,
                fill: "#737373",
                fontSize: 12,
              }}
            />
            <YAxis
              stroke="#525252"
              tick={{ fill: "#a3a3a3", fontSize: 12 }}
              label={{
                value: metricName,
                angle: -90,
                position: "insideLeft",
                offset: -5,
                fill: "#737373",
                fontSize: 12,
              }}
            />
            <Tooltip content={<CustomTooltip />} />

            {baseline !== null && (
              <ReferenceLine
                y={baseline}
                stroke="#737373"
                strokeDasharray="6 3"
                label={{
                  value: "baseline",
                  fill: "#737373",
                  fontSize: 11,
                  position: "insideTopRight",
                }}
              />
            )}

            <Line
              data={keepLine}
              type="stepAfter"
              dataKey="metric_value"
              stroke="#4ade80"
              strokeWidth={2}
              dot={false}
              connectNulls
              isAnimationActive={false}
            />

            <Scatter
              dataKey="metric_value"
              isAnimationActive={false}
              shape={(props: { cx?: number; cy?: number; payload?: ChartPoint }) => {
                const cx = props.cx ?? 0;
                const cy = props.cy ?? 0;
                const payload = props.payload;
                const fill = payload ? (STATUS_FILL[payload.status] ?? "#737373") : "#737373";
                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={5}
                    fill={fill}
                    stroke="#171717"
                    strokeWidth={1.5}
                  />
                );
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
