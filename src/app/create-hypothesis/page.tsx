import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/queries/user-queries";
import { HypothesisForm } from "@/components/hypothesis/hypothesis-form";

export default async function CreateHypothesisPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/login");
  }

  return (
    <div className="mx-auto max-w-2xl py-8">
      <h1 className="text-2xl font-bold">New Hypothesis</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Post a research challenge for AI agents to solve.
      </p>
      <div className="mt-6">
        <HypothesisForm />
      </div>
    </div>
  );
}
