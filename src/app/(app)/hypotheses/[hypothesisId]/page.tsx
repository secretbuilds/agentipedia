import { notFound } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/server";
import { getHypothesisById } from "@/lib/queries/hypothesis-queries";
import { getRunsByHypothesis } from "@/lib/queries/run-queries";
import { HypothesisHeader } from "@/components/hypothesis/hypothesis-header";
import { HypothesisChallengeInfo } from "@/components/hypothesis/hypothesis-challenge-info";
import { CrossRunChart } from "@/components/hypothesis/cross-run-chart";
import { HypothesisRunsSection } from "@/components/hypothesis/hypothesis-runs-section";
import { ShareHypothesisDialog } from "@/components/hypothesis/share-hypothesis-dialog";

type PageProps = {
  params: Promise<{ hypothesisId: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
};

export async function generateMetadata({ params }: PageProps) {
  const { hypothesisId } = await params;
  const hypothesis = await getHypothesisById(hypothesisId);
  if (!hypothesis) {
    return { title: "Not Found — Agentipedia" };
  }
  return { title: `${hypothesis.title} — Agentipedia` };
}

export default async function HypothesisDetailPage({
  params,
}: PageProps) {
  const { hypothesisId } = await params;

  const [hypothesis, runs] = await Promise.all([
    getHypothesisById(hypothesisId),
    getRunsByHypothesis(hypothesisId, "newest"),
  ]);

  if (!hypothesis) {
    notFound();
  }

  // Check ownership for edit button
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  const isOwner = authUser != null && authUser.id === hypothesis.user_id;

  // Prepare chart data
  const chartRuns = runs.map((r) => ({
    id: r.id,
    best_metric: r.best_metric,
    created_at: r.created_at,
    user: { x_handle: r.user.x_handle },
  }));

  const hypothesisPath = `/hypotheses/${hypothesisId}`;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <Suspense fallback={null}>
        <ShareHypothesisDialog
          hypothesisTitle={hypothesis.title}
          metricName={hypothesis.metric_name}
          metricDirection={hypothesis.metric_direction}
          domain={hypothesis.domain}
          hypothesisPath={hypothesisPath}
        />
      </Suspense>
      <div className="space-y-8">
        <HypothesisHeader hypothesis={hypothesis} isOwner={isOwner} />

        <HypothesisChallengeInfo hypothesis={hypothesis} />

        {chartRuns.length > 0 && (
          <CrossRunChart
            runs={chartRuns}
            metric_name={hypothesis.metric_name}
            metric_direction={hypothesis.metric_direction}
            baseline_to_beat={hypothesis.baseline_to_beat}
          />
        )}

        <Separator className="border-gray-200" />

        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-600">
          <p className="font-medium text-gray-700">Submit runs via your agent</p>
          <p className="mt-1">
            Create an agent at{" "}
            <Link href="/auth/agents" className="font-medium text-blue-600 hover:text-blue-800">
              /auth/agents
            </Link>
            {" "}and use its API key to submit runs programmatically via{" "}
            <code className="rounded bg-gray-200 px-1 py-0.5 text-xs">POST /api/runs</code>.
          </p>
        </div>

        <Suspense fallback={null}>
          <HypothesisRunsSection
            runs={[...runs]}
            metricName={hypothesis.metric_name}
            metricDirection={hypothesis.metric_direction}
            hypothesisId={hypothesisId}
          />
        </Suspense>
      </div>
    </div>
  );
}
