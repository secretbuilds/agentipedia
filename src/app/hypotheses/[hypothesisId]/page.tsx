import { notFound } from "next/navigation";
import Link from "next/link";
import { getHypothesisById } from "@/lib/queries/hypothesis-queries";
import { getRunsByHypothesis } from "@/lib/queries/run-queries";
import { getCurrentUser } from "@/lib/queries/user-queries";
import { DomainBadge } from "@/components/shared/domain-badge";
import { MetricDisplay } from "@/components/shared/metric-display";
import { UserAvatar } from "@/components/shared/user-avatar";
import { TimeAgo } from "@/components/shared/time-ago";
import { EmptyState } from "@/components/shared/empty-state";
import { RunCard } from "@/components/run/run-card";

type Params = Promise<{ hypothesisId: string }>;

export default async function HypothesisDetailPage({
  params,
}: {
  params: Params;
}) {
  const { hypothesisId } = await params;
  const [hypothesis, runs, currentUser] = await Promise.all([
    getHypothesisById(hypothesisId),
    getRunsByHypothesis(hypothesisId),
    getCurrentUser(),
  ]);

  if (!hypothesis) {
    notFound();
  }

  const h = hypothesis;
  const isOwner = currentUser?.id === h.user_id;

  return (
    <div>
      {/* Header */}
      <div className="border-b border-border pb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <DomainBadge domain={h.domain} />
              <span
                className={`text-xs ${
                  h.status === "open" ? "text-green-400" : "text-muted-foreground"
                }`}
              >
                {h.status === "open" ? "Open" : "Closed"}
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-bold">{h.title}</h1>
          </div>
          {isOwner && (
            <Link
              href={`/hypotheses/${h.id}/edit`}
              className="rounded-lg border border-border px-3 py-1.5 text-sm transition-colors hover:bg-muted"
            >
              Edit
            </Link>
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
        </div>

        <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
          {h.description}
        </p>

        {/* Challenge info */}
        <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg border border-border p-4 text-sm md:grid-cols-4">
          <div>
            <span className="text-xs text-muted-foreground">Dataset</span>
            <p className="mt-0.5 font-medium">
              <a
                href={h.dataset_url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-muted-foreground/30 hover:decoration-foreground"
              >
                {h.dataset_name}
              </a>
            </p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Metric</span>
            <MetricDisplay
              value={h.baseline_to_beat}
              name={h.metric_name}
              direction={h.metric_direction as "lower_is_better" | "higher_is_better"}
            />
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Runs</span>
            <p className="mt-0.5 font-medium">{h.run_count}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Best</span>
            <p className="mt-0.5 font-mono font-medium">
              {h.best_metric_value !== null ? h.best_metric_value : "\u2014"}
            </p>
          </div>
        </div>

        {(h.starter_code_url || h.hardware_recommendation) && (
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
            {h.starter_code_url && (
              <a
                href={h.starter_code_url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground"
              >
                Starter code
              </a>
            )}
            {h.hardware_recommendation && (
              <span>HW: {h.hardware_recommendation}</span>
            )}
          </div>
        )}
      </div>

      {/* Runs section */}
      <div className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Runs ({runs.length})
          </h2>
          {h.status === "open" && currentUser && (
            <Link
              href={`/hypotheses/${h.id}/submit-run`}
              className="rounded-lg bg-white px-4 py-1.5 text-sm font-medium text-black transition-colors hover:bg-gray-200"
            >
              Submit Run
            </Link>
          )}
        </div>

        {runs.length === 0 ? (
          <EmptyState
            title="No runs yet"
            description="Be the first to submit experiment results for this hypothesis."
            actionLabel={h.status === "open" ? "Submit Run" : undefined}
            actionHref={
              h.status === "open" ? `/hypotheses/${h.id}/submit-run` : undefined
            }
          />
        ) : (
          <div className="mt-4 space-y-3">
            {runs.map((run) => (
              <RunCard
                key={run.id}
                run={run}
                metricName={h.metric_name}
                metricDirection={h.metric_direction as "lower_is_better" | "higher_is_better"}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
