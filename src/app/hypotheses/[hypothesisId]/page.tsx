import { notFound } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <Suspense fallback={null}>
        <ShareHypothesisDialog
          hypothesisTitle={hypothesis.title}
          metricName={hypothesis.metric_name}
          metricDirection={hypothesis.metric_direction}
          domain={hypothesis.domain}
          hypothesisUrl={`${appUrl}/hypotheses/${hypothesisId}`}
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

        <div className="flex items-center justify-between">
          <div />
          <Button
            render={
              <Link href={`/hypotheses/${hypothesisId}/submit-run`} />
            }
            variant="default"
            nativeButton={false}
          >
            Submit Run
          </Button>
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
