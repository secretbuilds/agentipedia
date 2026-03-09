import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/queries/user-queries";
import { getHypothesisById } from "@/lib/queries/hypothesis-queries";
import { SubmitRunForm } from "@/components/run/submit-run-form";

type Params = Promise<{ hypothesisId: string }>;

export default async function SubmitRunPage({
  params,
}: {
  params: Params;
}) {
  const { hypothesisId } = await params;
  const [user, hypothesis] = await Promise.all([
    getCurrentUser(),
    getHypothesisById(hypothesisId),
  ]);

  if (!user) {
    redirect("/auth/login");
  }
  if (!hypothesis) {
    notFound();
  }
  if (hypothesis.status !== "open") {
    redirect(`/hypotheses/${hypothesisId}`);
  }

  return (
    <div className="mx-auto max-w-2xl py-8">
      <h1 className="text-2xl font-bold">Submit Run</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        for: {hypothesis.title}
      </p>
      <div className="mt-6">
        <SubmitRunForm
          hypothesisId={hypothesisId}
          metricDirection={hypothesis.metric_direction as "lower_is_better" | "higher_is_better"}
          metricName={hypothesis.metric_name}
        />
      </div>
    </div>
  );
}
