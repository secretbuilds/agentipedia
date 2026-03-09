"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Dot,
} from "recharts";

type Experiment = {
  sequence: number;
  metric_value: number;
  status: string;
  description: string;
};

type ExperimentChartProps = {
  experiments: Experiment[];
  metricName: string;
};

const STATUS_COLORS: Record<string, string> = {
  keep: "#22c55e",
  discard: "#6b7280",
  crash: "#ef4444",
};

function CustomDot(props: {
  cx?: number;
  cy?: number;
  payload?: Experiment;
}) {
  const { cx, cy, payload } = props;
  if (!cx || !cy || !payload) return null;
  const color = STATUS_COLORS[payload.status] ?? "#6b7280";
  return <Dot cx={cx} cy={cy} r={4} fill={color} stroke={color} />;
}

export function ExperimentChart({
  experiments,
  metricName,
}: ExperimentChartProps) {
  if (experiments.length === 0) return null;

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={experiments}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis
            dataKey="sequence"
            stroke="#888"
            fontSize={12}
            label={{
              value: "Experiment #",
              position: "insideBottomRight",
              offset: -5,
              style: { fill: "#888", fontSize: 11 },
            }}
          />
          <YAxis
            stroke="#888"
            fontSize={12}
            label={{
              value: metricName,
              angle: -90,
              position: "insideLeft",
              style: { fill: "#888", fontSize: 11 },
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1a1a1a",
              border: "1px solid #333",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            formatter={(value) => [Number(value).toFixed(4), metricName]}
            labelFormatter={(label) => `Experiment #${label}`}
          />
          <Line
            type="monotone"
            dataKey="metric_value"
            stroke="#666"
            strokeWidth={1}
            dot={<CustomDot />}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
