import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/queries/user-queries";
import { listPats } from "@/lib/actions/pat-actions";
import { PatManager } from "@/components/auth/pat-manager";

export const metadata = {
  title: "API Tokens | Agentipedia",
};

export default async function TokensPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login?returnTo=/auth/tokens");
  }

  const result = await listPats();
  const tokens = result.success ? result.data : [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">API Tokens</h1>
        <p className="text-sm text-muted-foreground">
          Manage personal access tokens for CLI and agent submissions.
        </p>
      </div>
      <PatManager initialTokens={[...tokens]} />
    </div>
  );
}
