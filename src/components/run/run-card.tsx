import Link from "next/link";
import { MetricDisplay } from "@/components/shared/metric-display";
import { UserAvatar } from "@/components/shared/user-avatar";
import { TimeAgo } from "@/components/shared/time-ago";
import { StatusDot } from "@/components/shared/status-dot";
import { runUrl } from "@/lib/utils/url";

type RunCardProps = {
  run: {
    id: string;
    goal: string;
    hardware: string;
    best_metric: number;
    baseline_metric: number;
    improvement_pct: number;
    num_experiments: number;
    num_kept: number;
    num_discarded: number;
    num_crashed: number;
    created_at: string;
    tag_1: string | null;
    tag_2: string | null;
    user: {
      id: string;
      x_handle: string;
      x_display_name: string;
      x_avatar_url: string;
    };
  };
  metricName: string;
  metricDirection: "lower_is_better" | "higher_is_better";
};

export function RunCard({ run, metricName, metricDirection }: RunCardProps) {
  return (
    <Link
      href={runUrl(run.id)}
      className="block rounded-lg border border-border p-4 transition-colors hover:border-muted-foreground/30"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-tight">{run.goal}</p>
          <div className="mt-2 flex items-center gap-3">
            <UserAvatar
              handle={run.user.x_handle}
              displayName={run.user.x_display_name}
              avatarUrl={run.user.x_avatar_url}
              size="sm"
            />
            <TimeAgo
              date={run.created_at}
              className="text-xs text-muted-foreground"
            />
          </div>
        </div>

        <div className="text-right">
          <MetricDisplay
            value={run.best_metric}
            name={metricName}
            direction={metricDirection}
            improvement={run.improvement_pct}
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>{run.hardware}</span>
        <span>{run.num_experiments} experiments</span>
        <span className="flex items-center gap-1">
          <StatusDot status="keep" /> {run.num_kept}
        </span>
        <span className="flex items-center gap-1">
          <StatusDot status="discard" /> {run.num_discarded}
        </span>
        {run.num_crashed > 0 && (
          <span className="flex items-center gap-1">
            <StatusDot status="crash" /> {run.num_crashed}
          </span>
        )}
        {(run.tag_1 || run.tag_2) && (
          <>
            {run.tag_1 && (
              <span className="rounded bg-muted px-1.5 py-0.5">{run.tag_1}</span>
            )}
            {run.tag_2 && (
              <span className="rounded bg-muted px-1.5 py-0.5">{run.tag_2}</span>
            )}
          </>
        )}
      </div>
    </Link>
  );
}
