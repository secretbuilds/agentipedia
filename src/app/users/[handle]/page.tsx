import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getUserByHandle,
  getUserHypotheses,
  getUserRuns,
} from "@/lib/queries/user-queries";
import { UserCard } from "@/components/user/user-card";
import { UserHypothesisList } from "@/components/user/user-hypothesis-list";
import { UserRunList } from "@/components/user/user-run-list";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

type PageProps = {
  params: Promise<{ handle: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { handle } = await params;
  return {
    title: `@${handle} | Agentipedia`,
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function UserProfilePage({ params }: PageProps) {
  const { handle } = await params;
  const user = await getUserByHandle(handle);

  if (!user) {
    notFound();
  }

  const [hypotheses, runs] = await Promise.all([
    getUserHypotheses(user.id),
    getUserRuns(user.id),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="space-y-6">
        <UserCard
          user={user}
          hypothesisCount={hypotheses.length}
          runCount={runs.length}
        />

        <Tabs defaultValue="hypotheses">
          <TabsList>
            <TabsTrigger value="hypotheses">
              Hypotheses ({hypotheses.length})
            </TabsTrigger>
            <TabsTrigger value="runs">
              Runs ({runs.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="hypotheses" className="mt-4">
            <UserHypothesisList hypotheses={hypotheses} />
          </TabsContent>

          <TabsContent value="runs" className="mt-4">
            <UserRunList runs={runs} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
