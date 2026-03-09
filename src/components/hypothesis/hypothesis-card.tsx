import Link from "next/link";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { DomainBadge } from "@/components/shared/domain-badge";
import { MetricDisplay } from "@/components/shared/metric-display";
import { UserAvatar } from "@/components/shared/user-avatar";
import { TimeAgo } from "@/components/shared/time-ago";
import { TagList } from "@/components/shared/tag-list";
import { hypothesisUrl } from "@/lib/utils/url";
import type { HypothesisCard as HypothesisCardType } from "@/types/hypothesis";

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + "...";
}

export function HypothesisCard({
  hypothesis,
}: {
  readonly hypothesis: HypothesisCardType;
}) {
  const directionLabel =
    hypothesis.metric_direction === "lower_is_better" ? "lower" : "higher";

  return (
    <Card className="transition-colors hover:ring-neutral-700">
      <CardHeader>
        <div className="flex items-center gap-2">
          <DomainBadge domain={hypothesis.domain} />
          {hypothesis.status === "closed" && (
            <span className="text-xs font-medium text-neutral-500">
              Closed
            </span>
          )}
        </div>
        <Link
          href={hypothesisUrl(hypothesis.id)}
          className="mt-1 text-base font-semibold leading-snug text-neutral-100 hover:underline"
        >
          {hypothesis.title}
        </Link>
      </CardHeader>

      <CardContent className="space-y-3">
        <p className="text-sm leading-relaxed text-neutral-400">
          {truncate(hypothesis.description, 300)}
        </p>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-400">
          <span>
            Dataset:{" "}
            <span className="text-neutral-300">{hypothesis.dataset_name}</span>
          </span>
          <span>
            Metric:{" "}
            <span className="text-neutral-300">{hypothesis.metric_name}</span>
            <span className="ml-1 text-neutral-500">({directionLabel})</span>
          </span>
          {hypothesis.baseline_to_beat != null && (
            <span>
              Baseline:{" "}
              <span className="font-mono text-neutral-300">
                {hypothesis.baseline_to_beat}
              </span>
            </span>
          )}
        </div>

        {(hypothesis.run_count > 0 || hypothesis.best_run) && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-400">
            <span>
              {hypothesis.run_count}{" "}
              {hypothesis.run_count === 1 ? "run" : "runs"}
            </span>
            {hypothesis.best_run && (
              <span className="inline-flex items-center gap-1">
                Best:{" "}
                <MetricDisplay
                  value={hypothesis.best_run.best_metric}
                  direction={hypothesis.metric_direction}
                />
                <span className="text-neutral-500">
                  by @{hypothesis.best_run.user_handle}
                </span>
              </span>
            )}
          </div>
        )}

        <TagList tag1={hypothesis.tag_1} tag2={hypothesis.tag_2} />
      </CardContent>

      <CardFooter className="gap-3">
        <UserAvatar
          handle={hypothesis.user.x_handle}
          avatarUrl={hypothesis.user.x_avatar_url}
          size="sm"
        />
        <TimeAgo date={hypothesis.created_at} />
      </CardFooter>
    </Card>
  );
}
