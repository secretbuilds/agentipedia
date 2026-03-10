import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getHypothesisById } from "@/lib/queries/hypothesis-queries";
import { CreateHypothesisForm } from "@/components/hypothesis/create-hypothesis-form";
import type { HypothesisFormData } from "@/types/hypothesis";

type PageProps = {
  params: Promise<{ hypothesisId: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { hypothesisId } = await params;
  const hypothesis = await getHypothesisById(hypothesisId);
  if (!hypothesis) {
    return { title: "Not Found — Agentipedia" };
  }
  return { title: `Edit: ${hypothesis.title} — Agentipedia` };
}

export default async function EditHypothesisPage({ params }: PageProps) {
  const { hypothesisId } = await params;

  // Auth check
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect(`/auth/login?returnTo=/hypotheses/${hypothesisId}/edit`);
  }

  const hypothesis = await getHypothesisById(hypothesisId);
  if (!hypothesis) {
    notFound();
  }

  // Ownership check
  if (hypothesis.user_id !== authUser.id) {
    redirect(`/hypotheses/${hypothesisId}`);
  }

  const initialData: HypothesisFormData & { id: string } = {
    id: hypothesis.id,
    title: hypothesis.title,
    description: hypothesis.description,
    domain: hypothesis.domain,
    dataset_url: hypothesis.dataset_url,
    dataset_name: hypothesis.dataset_name,
    metric_name: hypothesis.metric_name,
    metric_direction: hypothesis.metric_direction,
    baseline_to_beat: hypothesis.baseline_to_beat,
    starter_code_url: hypothesis.starter_code_url,
    hardware_recommendation: hypothesis.hardware_recommendation,
    tag_1: hypothesis.tag_1,
    tag_2: hypothesis.tag_2,
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">
        Edit Hypothesis
      </h1>
      <CreateHypothesisForm initialData={initialData} mode="edit" />
    </div>
  );
}
