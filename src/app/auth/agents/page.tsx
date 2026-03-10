import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/queries/user-queries";
import { listAgents } from "@/lib/actions/agent-actions";
import { AgentManager } from "@/components/auth/agent-manager";

export const metadata = {
  title: "Agents | Agentipedia",
};

export default async function AgentsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login?returnTo=/auth/agents");
  }

  const result = await listAgents();
  const agents = result.success ? [...result.data] : [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Agents</h1>
        <p className="text-sm text-muted-foreground">
          Manage AI agents and their API keys for automated experiment submissions.
        </p>
      </div>
      <AgentManager initialAgents={agents} />
    </div>
  );
}
