import Link from "next/link";
import { DomainBadge } from "@/components/shared/domain-badge";
import { MetricDisplay } from "@/components/shared/metric-display";
import { UserAvatar } from "@/components/shared/user-avatar";
import { TimeAgo } from "@/components/shared/time-ago";
import { hypothesisUrl } from "@/lib/utils/url";

type HypothesisCardProps = {
  hypothesis: {
    id: string;
    title: string;
    description: string;
    domain: string;
    dataset_name: string;
    metric_name: string;
    metric_direction: string;
    baseline_to_beat: number | null;
    tag_1: string | null;
    tag_2: string | null;
    status: string;
    created_at: string;
    author_handle: string;
    author_display_name: string;
    author_avatar_url: string;
    run_count: number;
    best_metric_value: number | null;
    best_run_user_handle: string | null;
  };
};

export function HypothesisCard({ hypothesis }: HypothesisCardProps) {
  const h = hypothesis;

  return (
    <Link
      href={hypothesisUrl(h.id)}
      className="block rounded-lg border border-border p-5 transition-colors hover:border-muted-foreground/30"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <DomainBadge domain={h.domain} />
            {h.status === "closed" && (
              <span className="text-xs text-muted-foreground">Closed</span>
            )}
          </div>
          <h3 className="mt-2 text-base font-semibold leading-tight">
            {h.title}
          </h3>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {h.description}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <span>{h.dataset_name}</span>
        <MetricDisplay
          value={h.best_metric_value}
          name={h.metric_name}
          direction={h.metric_direction as "lower_is_better" | "higher_is_better"}
        />
        <span>
          {h.run_count} {h.run_count === 1 ? "run" : "runs"}
        </span>
        {h.best_run_user_handle && (
          <span>Best by @{h.best_run_user_handle}</span>
        )}
      </div>

      <div className="mt-3 flex items-center gap-3">
        <UserAvatar
          handle={h.author_handle}
          displayName={h.author_display_name}
          avatarUrl={h.author_avatar_url}
          size="sm"
        />
        <TimeAgo date={h.created_at} className="text-xs text-muted-foreground" />
        {(h.tag_1 || h.tag_2) && (
          <div className="flex gap-1">
            {h.tag_1 && (
              <span className="rounded bg-muted px-1.5 py-0.5 text-xs">
                {h.tag_1}
              </span>
            )}
            {h.tag_2 && (
              <span className="rounded bg-muted px-1.5 py-0.5 text-xs">
                {h.tag_2}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
