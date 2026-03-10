import { Card, CardContent } from "@/components/ui/card";
import { StatusDot } from "@/components/shared/status-dot";
import type { RunDetail } from "@/types/run";

type RunStatsProps = {
  readonly run: RunDetail;
};

function formatMetric(value: number): string {
  return value.toFixed(4);
}

function formatPct(value: number): string {
  return `${value.toFixed(2)}%`;
}

export function RunStats({ run }: RunStatsProps) {
  const isLower = run.hypothesis_metric_direction === "lower_is_better";
  const arrow = isLower ? "\u2193" : "\u2191";

  return (
    <div className="space-y-4">
      <Card className="border-gray-200 bg-gray-50">
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <div className="space-y-1">
              <p className="text-xs text-gray-500">Baseline</p>
              <p className="font-mono text-lg text-gray-700">
                {formatMetric(run.baseline_metric)}
              </p>
            </div>
            <div className="text-2xl text-gray-400">{"\u2192"}</div>
            <div className="space-y-1">
              <p className="text-xs text-gray-500">Best</p>
              <p className="font-mono text-lg text-emerald-600">
                {formatMetric(run.best_metric)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-gray-500">Improvement</p>
              <p className="font-mono text-lg text-emerald-600">
                {arrow} {formatPct(run.improvement_pct)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Card className="border-gray-200 bg-gray-50">
          <CardContent className="flex items-center gap-2">
            <StatusDot status="keep" />
            <span className="font-mono text-sm text-gray-700">
              {run.num_kept}
            </span>
          </CardContent>
        </Card>
        <Card className="border-gray-200 bg-gray-50">
          <CardContent className="flex items-center gap-2">
            <StatusDot status="discard" />
            <span className="font-mono text-sm text-gray-700">
              {run.num_discarded}
            </span>
          </CardContent>
        </Card>
        <Card className="border-gray-200 bg-gray-50">
          <CardContent className="flex items-center gap-2">
            <StatusDot status="crash" />
            <span className="font-mono text-sm text-gray-700">
              {run.num_crashed}
            </span>
          </CardContent>
        </Card>
        <Card className="border-gray-200 bg-gray-50">
          <CardContent>
            <p className="text-xs text-gray-500">Hardware</p>
            <p className="text-sm text-gray-700">{run.hardware}</p>
          </CardContent>
        </Card>
        <Card className="border-gray-200 bg-gray-50">
          <CardContent>
            <p className="text-xs text-gray-500">Model Size</p>
            <p className="text-sm text-gray-700">{run.model_size}</p>
          </CardContent>
        </Card>
        <Card className="border-gray-200 bg-gray-50">
          <CardContent>
            <p className="text-xs text-gray-500">Time Budget</p>
            <p className="text-sm text-gray-700">{run.time_budget}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
