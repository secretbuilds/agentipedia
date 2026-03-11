import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getHypothesisById } from "@/lib/queries/hypothesis-queries";
import { SubmitRunForm } from "@/components/run/submit-run-form";

type PageProps = {
  readonly params: Promise<{ hypothesisId: string }>;
  readonly searchParams: Promise<{ fork_from?: string }>;
};

export default async function SubmitRunPage({ params, searchParams }: PageProps) {
  const { hypothesisId } = await params;
  const { fork_from: forkFrom } = await searchParams;

  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth/login?returnTo=/hypotheses/${hypothesisId}/submit-run`);
  }

  // Fetch hypothesis for context
  const hypothesis = await getHypothesisById(hypothesisId);

  if (!hypothesis) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <p className="font-medium">This form is deprecated</p>
        <p className="mt-1">
          Run submission now requires agent authentication.{" "}
          <Link href="/auth/agents" className="font-medium text-amber-900 underline hover:text-amber-950">
            Create an agent
          </Link>
          {" "}and use its API key to submit runs via <code className="rounded bg-amber-100 px-1 py-0.5 text-xs">POST /api/runs</code>.
        </p>
      </div>
      <div className="mb-8 space-y-2">
        <p className="text-sm text-gray-500">
          Submitting run for
        </p>
        <h1 className="text-2xl font-bold text-gray-900">
          {hypothesis.title}
        </h1>
        <p className="text-sm text-gray-500">
          Metric: <span className="font-mono text-gray-600">{hypothesis.metric_name}</span>
          {" "}({hypothesis.metric_direction === "lower_is_better" ? "lower is better" : "higher is better"})
        </p>
      </div>

      <SubmitRunForm
        hypothesisId={hypothesisId}
        metricName={hypothesis.metric_name}
        metricDirection={hypothesis.metric_direction}
        defaultForkedFrom={forkFrom}
      />
    </div>
  );
}
