import { notFound } from "next/navigation";
import Link from "next/link";
import { getRunById, getExperimentsByRunId } from "@/lib/queries/run-queries";
import { UserAvatar } from "@/components/shared/user-avatar";
import { TimeAgo } from "@/components/shared/time-ago";
import { MetricDisplay } from "@/components/shared/metric-display";
import { StatusDot } from "@/components/shared/status-dot";
import { DomainBadge } from "@/components/shared/domain-badge";
import { ExperimentChart } from "@/components/run/experiment-chart";
import { ExperimentTable } from "@/components/run/experiment-table";
import { formatMetric } from "@/lib/utils/format";

type Params = Promise<{ runId: string }>;

export default async function RunDetailPage({
  params,
}: {
  params: Params;
}) {
  const { runId } = await params;
  const [run, experiments] = await Promise.all([
    getRunById(runId),
    getExperimentsByRunId(runId),
  ]);

  if (!run) {
    notFound();
  }

  const hypothesis = run.hypothesis as {
    id: string;
    title: string;
    metric_name: string;
    metric_direction: string;
    domain: string;
  };

  const user = run.user as {
    id: string;
    x_handle: string;
    x_display_name: string;
    x_avatar_url: string;
  };

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          Feed
        </Link>
        <span>/</span>
        <Link
          href={`/hypotheses/${hypothesis.id}`}
          className="hover:text-foreground"
        >
          {hypothesis.title}
        </Link>
        <span>/</span>
        <span>Run by @{user.x_handle}</span>
      </div>

      {/* Header */}
      <div className="mt-4 border-b border-border pb-6">
        <div className="flex items-center gap-2">
          <DomainBadge domain={hypothesis.domain} />
        </div>
        <h1 className="mt-2 text-xl font-bold">{run.goal}</h1>

        <div className="mt-3 flex items-center gap-3">
          <UserAvatar
            handle={user.x_handle}
            displayName={user.x_display_name}
            avatarUrl={user.x_avatar_url}
            size="sm"
          />
          <TimeAgo
            date={run.created_at}
            className="text-xs text-muted-foreground"
          />
        </div>

        {/* Stats grid */}
        <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg border border-border p-4 text-sm md:grid-cols-5">
          <div>
            <span className="text-xs text-muted-foreground">Best</span>
            <p className="mt-0.5 font-mono font-medium">
              {formatMetric(run.best_metric)}
            </p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Baseline</span>
            <p className="mt-0.5 font-mono font-medium">
              {formatMetric(run.baseline_metric)}
            </p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Improvement</span>
            <p className="mt-0.5 font-medium text-green-400">
              +{run.improvement_pct.toFixed(1)}%
            </p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Hardware</span>
            <p className="mt-0.5 font-medium">{run.hardware}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Time</span>
            <p className="mt-0.5 font-medium">{run.time_budget}</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span>{run.model_size}</span>
          <span className="flex items-center gap-1">
            <StatusDot status="keep" /> {run.num_kept} kept
          </span>
          <span className="flex items-center gap-1">
            <StatusDot status="discard" /> {run.num_discarded} discarded
          </span>
          {run.num_crashed > 0 && (
            <span className="flex items-center gap-1">
              <StatusDot status="crash" /> {run.num_crashed} crashed
            </span>
          )}
        </div>

        <div className="mt-3 flex gap-3 text-xs">
          <a
            href={run.results_tsv_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground underline hover:text-foreground"
          >
            Download results.tsv
          </a>
          <a
            href={run.code_file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground underline hover:text-foreground"
          >
            Download {run.code_filename}
          </a>
        </div>
      </div>

      {/* Experiment progression chart */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold">Experiment Progression</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {hypothesis.metric_name} over {experiments.length} experiments.
          Green = kept, Gray = discarded, Red = crashed.
        </p>
        <div className="mt-4">
          <ExperimentChart
            experiments={experiments}
            metricName={hypothesis.metric_name}
          />
        </div>
      </div>

      {/* Experiment table */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold">Experiments</h2>
        <div className="mt-4">
          <ExperimentTable
            experiments={experiments}
            metricName={hypothesis.metric_name}
          />
        </div>
      </div>
    </div>
  );
}
