"use client";

import Link from "next/link";
import type { BestPathStep } from "@/types/dag";
import { TimeAgo } from "@/components/shared/time-ago";

type BestPathViewProps = {
  readonly steps: readonly BestPathStep[];
  readonly metricName: string;
  readonly metricDirection: string;
  readonly hypothesisId: string;
};

function isImprovement(delta: number, direction: string): boolean {
  if (direction === "higher_is_better") return delta > 0;
  if (direction === "lower_is_better") return delta < 0;
  return false;
}

function formatDelta(delta: number): string {
  const sign = delta >= 0 ? "+" : "";
  return `${sign}${delta.toFixed(4)}`;
}

function formatDeltaPct(pct: number): string {
  const sign = pct >= 0 ? "+" : "";
  return `(${sign}${pct.toFixed(1)}%)`;
}

function getDeltaColor(
  delta: number,
  direction: string,
): string {
  if (delta === 0) return "text-gray-500";
  return isImprovement(delta, direction)
    ? "text-emerald-600"
    : "text-red-600";
}

function StepCard({
  step,
  isFirst,
  isLast,
  metricName,
  metricDirection,
  hypothesisId,
}: {
  readonly step: BestPathStep;
  readonly isFirst: boolean;
  readonly isLast: boolean;
  readonly metricName: string;
  readonly metricDirection: string;
  readonly hypothesisId: string;
}) {
  const { run, stepNumber, metricDelta, metricDeltaPct } = step;
  const displayText = step.synthesis ?? run.goal;

  return (
    <div className="relative pb-8 last:pb-0">
      {/* Vertical timeline line */}
      {!isLast && (
        <span
          className="absolute left-[7px] top-5 -ml-px h-full w-0.5 bg-emerald-400"
          aria-hidden="true"
        />
      )}

      <div className="relative flex items-start">
        {/* Emerald circle dot */}
        <span className="flex h-4 w-4 items-center justify-center">
          <span className="h-3.5 w-3.5 rounded-full border-2 border-emerald-400 bg-white" />
        </span>

        {/* Step card */}
        <div className="ml-6 flex-1 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          {/* Step header */}
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-sm font-bold text-gray-900">
              Step {stepNumber}
            </h3>
            <span className="text-xs font-medium text-gray-500">
              {metricName}:{" "}
              <span className="font-mono text-gray-800">
                {run.best_metric.toFixed(4)}
              </span>
            </span>
          </div>

          {/* Metric delta */}
          <div className="mt-1 text-xs">
            {isFirst ? (
              <span className="font-medium text-gray-500">
                Starting point
              </span>
            ) : metricDelta != null ? (
              <span
                className={`font-mono font-medium ${getDeltaColor(metricDelta, metricDirection)}`}
              >
                {formatDelta(metricDelta)}
                {metricDeltaPct != null && (
                  <> {formatDeltaPct(metricDeltaPct)}</>
                )}
              </span>
            ) : (
              <span className="text-gray-400">No delta available</span>
            )}
          </div>

          {/* Synthesis / goal text */}
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-gray-600">
            {displayText}
          </p>

          {/* Footer: user handle, date, link */}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
            <Link
              href={`/users/${run.user.x_handle}`}
              className="font-medium text-gray-700 hover:text-gray-900"
            >
              @{run.user.x_handle}
            </Link>
            <TimeAgo date={run.created_at} />
            <Link
              href={`/hypotheses/${hypothesisId}/runs/${run.id}`}
              className="font-medium text-blue-600 hover:text-blue-800"
            >
              View run
            </Link>
            {isLast && (
              <Link
                href={`/api/runs/${run.id}/code`}
                className="font-medium text-emerald-600 hover:text-emerald-800"
              >
                Get Code
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function BestPathView({
  steps,
  metricName,
  metricDirection,
  hypothesisId,
}: BestPathViewProps) {
  if (steps.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center">
        <p className="text-sm text-gray-500">
          No runs yet — submit the first one
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
        Best Path
      </h2>
      <div className="pl-1">
        {steps.map((step, index) => (
          <StepCard
            key={step.run.id}
            step={step}
            isFirst={index === 0}
            isLast={index === steps.length - 1}
            metricName={metricName}
            metricDirection={metricDirection}
            hypothesisId={hypothesisId}
          />
        ))}
      </div>
    </div>
  );
}
