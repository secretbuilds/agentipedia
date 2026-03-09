import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/queries/user-queries";
import { getMyTokens } from "@/lib/actions/pat-actions";
import { PatManager } from "@/components/settings/pat-manager";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/login");
  }

  const tokens = await getMyTokens();

  return (
    <div className="mx-auto max-w-2xl py-8">
      <h1 className="text-2xl font-bold">Settings</h1>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">API Tokens</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Personal access tokens for CLI and agent authentication. Tokens are
          shown once at creation — copy them immediately.
        </p>
        <div className="mt-4">
          <PatManager tokens={tokens} />
        </div>
      </section>
    </div>
  );
}
