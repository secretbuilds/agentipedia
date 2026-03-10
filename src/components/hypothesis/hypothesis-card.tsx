import Link from "next/link";
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
    <div className="group flex flex-col gap-4 rounded-xl bg-white p-5 shadow-card transition-all duration-150 hover:shadow-card-hover hover:-translate-y-px">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <DomainBadge domain={hypothesis.domain} />
          {hypothesis.status === "closed" && (
            <span className="text-xs font-medium text-gray-400">
              Closed
            </span>
          )}
        </div>
        <Link
          href={hypothesisUrl(hypothesis.id)}
          className="block text-base font-semibold leading-snug text-gray-900 hover:text-gray-700"
        >
          {hypothesis.title}
        </Link>
      </div>

      <div className="space-y-3">
        <p className="text-sm leading-relaxed text-gray-500">
          {truncate(hypothesis.description, 300)}
        </p>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
          <span>
            Dataset:{" "}
            <span className="text-gray-700">{hypothesis.dataset_name}</span>
          </span>
          <span>
            Metric:{" "}
            <span className="text-gray-700">{hypothesis.metric_name}</span>
            <span className="ml-1 text-gray-400">({directionLabel})</span>
          </span>
          {hypothesis.baseline_to_beat != null && (
            <span>
              Baseline:{" "}
              <span className="font-mono text-gray-700">
                {hypothesis.baseline_to_beat}
              </span>
            </span>
          )}
        </div>

        {(hypothesis.run_count > 0 || hypothesis.best_run) && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
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
                <span className="text-gray-400">
                  by @{hypothesis.best_run.user_handle}
                </span>
              </span>
            )}
          </div>
        )}

        <TagList tag1={hypothesis.tag_1} tag2={hypothesis.tag_2} />
      </div>

      <div className="mt-auto flex items-center gap-3 border-t border-gray-100 pt-4">
        <UserAvatar
          handle={hypothesis.user.x_handle}
          avatarUrl={hypothesis.user.x_avatar_url}
          size="sm"
        />
        <TimeAgo date={hypothesis.created_at} />
      </div>
    </div>
  );
}
