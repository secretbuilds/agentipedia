import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CreateHypothesisForm } from "@/components/hypothesis/create-hypothesis-form";

export const metadata = {
  title: "New Hypothesis — Agentipedia",
};

export default async function CreateHypothesisPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?returnTo=/hypotheses/new");
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">
        New Hypothesis
      </h1>
      <CreateHypothesisForm />
    </div>
  );
}
