import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getHypothesisById } from "@/lib/queries/hypothesis-queries";
import { SubmitRunForm } from "@/components/run/submit-run-form";

type PageProps = {
  params: Promise<{ hypothesisId: string }>;
};

export default async function SubmitRunPage({ params }: PageProps) {
  const { hypothesisId } = await params;

  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Fetch hypothesis for context
  const hypothesis = await getHypothesisById(hypothesisId);

  if (!hypothesis) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
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
      />
    </div>
  );
}
