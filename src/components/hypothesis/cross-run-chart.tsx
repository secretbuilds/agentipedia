"use client";

import {
  ComposedChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

type ChartRun = {
  readonly id: string;
  readonly best_metric: number;
  readonly created_at: string;
  readonly user: { readonly x_handle: string };
};

type CrossRunChartProps = {
  readonly runs: readonly ChartRun[];
  readonly metric_name: string;
  readonly metric_direction: string;
  readonly baseline_to_beat: number | null;
};

type ChartDatum = {
  readonly index: number;
  readonly best_metric: number;
  readonly handle: string;
};

function CustomTooltip({
  active,
  payload,
}: {
  readonly active?: boolean;
  readonly payload?: readonly { readonly payload: ChartDatum }[];
}) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0].payload;
  return (
    <div className="rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-xs shadow-lg">
      <p className="font-medium text-gray-700">@{data.handle}</p>
      <p className="text-gray-500">
        Metric: <span className="font-mono text-gray-700">{data.best_metric}</span>
      </p>
    </div>
  );
}

export function CrossRunChart({
  runs,
  metric_name,
  metric_direction,
  baseline_to_beat,
}: CrossRunChartProps) {
  // Sort runs by submission order (created_at ascending)
  const sorted = [...runs].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  const data: ChartDatum[] = sorted.map((run, i) => ({
    index: i + 1,
    best_metric: run.best_metric,
    handle: run.user.x_handle,
  }));

  if (data.length === 0) return null;

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
        Run Results
      </h2>
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
            <CartesianGrid stroke="#333" strokeDasharray="3 3" />
            <XAxis
              dataKey="index"
              type="number"
              domain={["dataMin", "dataMax"]}
              tickCount={Math.min(data.length, 10)}
              label={{
                value: "Submission Order",
                position: "insideBottom",
                offset: -5,
                style: { fill: "#737373", fontSize: 12 },
              }}
              stroke="#525252"
              tick={{ fill: "#a3a3a3", fontSize: 11 }}
            />
            <YAxis
              dataKey="best_metric"
              label={{
                value: metric_name,
                angle: -90,
                position: "insideLeft",
                offset: 0,
                style: { fill: "#737373", fontSize: 12 },
              }}
              stroke="#525252"
              tick={{ fill: "#a3a3a3", fontSize: 11 }}
            />
            <Tooltip content={<CustomTooltip />} />
            {baseline_to_beat != null && (
              <ReferenceLine
                y={baseline_to_beat}
                stroke="#f59e0b"
                strokeDasharray="6 4"
                label={{
                  value: "Baseline",
                  position:
                    metric_direction === "lower_is_better"
                      ? "insideTopRight"
                      : "insideBottomRight",
                  fill: "#f59e0b",
                  fontSize: 11,
                }}
              />
            )}
            <Scatter
              dataKey="best_metric"
              fill="#22d3ee"
              shape="circle"
              r={5}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
