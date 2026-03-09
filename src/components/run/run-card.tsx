import Link from "next/link";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { StatusDot } from "@/components/shared/status-dot";
import { UserAvatar } from "@/components/shared/user-avatar";
import { TimeAgo } from "@/components/shared/time-ago";
import { TagList } from "@/components/shared/tag-list";
import { runUrl } from "@/lib/utils/url";
import { formatPercentage } from "@/lib/utils/format";
import type { RunCard as RunCardType } from "@/types/run";

type RunCardProps = {
  readonly run: RunCardType;
  readonly metric_name: string;
  readonly metric_direction: string;
};

export function RunCard({ run, metric_name, metric_direction }: RunCardProps) {
  const directionLabel =
    metric_direction === "lower_is_better" ? "lower" : "higher";
  const improvementSign = run.improvement_pct >= 0 ? "+" : "";

  return (
    <Card className="transition-colors hover:ring-neutral-700">
      <CardHeader>
        <Link
          href={runUrl(run.id)}
          className="text-base font-semibold leading-snug text-neutral-100 hover:underline"
        >
          {run.goal}
        </Link>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Metric improvement */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className="text-neutral-400">
            {metric_name}:{" "}
            <span className="font-mono text-neutral-300">
              {run.baseline_metric}
            </span>
            <span className="mx-1 text-neutral-600">&rarr;</span>
            <span className="font-mono text-neutral-100">
              {run.best_metric}
            </span>
          </span>
          <span
            className={
              run.improvement_pct > 0
                ? "font-medium text-green-400"
                : run.improvement_pct < 0
                  ? "font-medium text-red-400"
                  : "text-neutral-500"
            }
          >
            {improvementSign}
            {formatPercentage(run.improvement_pct)} ({directionLabel})
          </span>
        </div>

        {/* Experiment status breakdown */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="text-neutral-500">
            {run.num_experiments} experiments:
          </span>
          {run.num_kept > 0 && (
            <span className="inline-flex items-center gap-1">
              <StatusDot status="keep" />
              <span className="text-neutral-400">{run.num_kept}</span>
            </span>
          )}
          {run.num_discarded > 0 && (
            <span className="inline-flex items-center gap-1">
              <StatusDot status="discard" />
              <span className="text-neutral-400">{run.num_discarded}</span>
            </span>
          )}
          {run.num_crashed > 0 && (
            <span className="inline-flex items-center gap-1">
              <StatusDot status="crash" />
              <span className="text-neutral-400">{run.num_crashed}</span>
            </span>
          )}
        </div>

        {/* Context line */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-neutral-500">
          {run.hardware && <span>{run.hardware}</span>}
          {run.model_size && <span>{run.model_size}</span>}
          {run.time_budget && <span>{run.time_budget}</span>}
        </div>

        <TagList tag1={run.tag_1} tag2={run.tag_2} />

        {run.forked_from && (
          <p className="text-xs text-neutral-500">
            Forked from{" "}
            <Link
              href={runUrl(run.forked_from)}
              className="text-neutral-400 hover:text-neutral-200 hover:underline"
            >
              {run.forked_from.slice(0, 8)}...
            </Link>
          </p>
        )}
      </CardContent>

      <CardFooter className="gap-3">
        <UserAvatar
          handle={run.user.x_handle}
          avatarUrl={run.user.x_avatar_url}
          size="sm"
        />
        <TimeAgo date={run.created_at} />
      </CardFooter>
    </Card>
  );
}
