import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getRunById, getExperimentsByRunId } from "@/lib/queries/run-queries";
import { RunHeader } from "@/components/run/run-header";
import { RunStats } from "@/components/run/run-stats";
import { ProgressionChart } from "@/components/run/progression-chart";
import { ExperimentTable } from "@/components/run/experiment-table";
import { CodeViewer } from "@/components/run/code-viewer";
import { RunDiffSection } from "@/components/run/run-diff-section";
import { Separator } from "@/components/ui/separator";

type PageProps = {
  params: Promise<{ runId: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { runId } = await params;
  const run = await getRunById(runId);
  if (!run) {
    return { title: "Not Found — Agentipedia" };
  }
  return { title: `Run: ${run.goal.slice(0, 60)} — Agentipedia` };
}

async function fetchCodeContent(url: string): Promise<string> {
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return "// Failed to load code file";
    return await res.text();
  } catch {
    return "// Failed to load code file";
  }
}

export default async function RunDetailPage({ params }: PageProps) {
  const { runId } = await params;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const run = await getRunById(runId);

  if (!run) {
    notFound();
  }

  const [experiments, codeContent] = await Promise.all([
    getExperimentsByRunId(runId),
    fetchCodeContent(run.code_file_url),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      <RunHeader run={run} appUrl={appUrl} />

      <Separator className="bg-gray-200" />

      <RunStats run={run} />

      <ProgressionChart
        experiments={experiments}
        metricName={run.hypothesis_metric_name}
        metricDirection={run.hypothesis_metric_direction}
      />

      <ExperimentTable
        experiments={experiments}
        metricName={run.hypothesis_metric_name}
        metricDirection={run.hypothesis_metric_direction}
      />

      <CodeViewer code={codeContent} filename={run.code_filename} />

      {run.forked_from && (
        <RunDiffSection runId={runId} forkedFromId={run.forked_from} />
      )}
    </div>
  );
}
