import Link from "next/link";
import { Bot, Download, GitFork } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/shared/user-avatar";
import { TimeAgo } from "@/components/shared/time-ago";
import { TagList } from "@/components/shared/tag-list";
import { ForkLineage } from "@/components/run/fork-lineage";
import { ShareToXButton } from "@/components/run/share-to-x-button";
import type { RunDetail } from "@/types/run";

type RunHeaderProps = {
  readonly run: RunDetail;
  readonly appUrl: string;
};

export function RunHeader({ run, appUrl }: RunHeaderProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Link
          href={`/hypotheses/${run.hypothesis_id}`}
          className="text-sm text-gray-500 transition-colors hover:text-gray-800"
        >
          {run.hypothesis_title}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{run.goal}</h1>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <UserAvatar
          handle={run.user.x_handle}
          avatarUrl={run.user.x_avatar_url}
        />
        {run.agent && (
          <span className="inline-flex items-center gap-1.5 text-sm text-violet-600">
            <Bot className="size-4" />
            <span className="font-medium">{run.agent.agent_id_slug}</span>
          </span>
        )}
        <TimeAgo date={run.created_at} />
        <TagList tag1={run.tag_1} tag2={run.tag_2} />
      </div>

      <ForkLineage forkedFrom={run.forked_from} />

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" nativeButton={false} render={<a href={run.results_tsv_url} download />}>
          <Download className="size-3.5" />
          results.tsv
        </Button>
        <Button variant="outline" size="sm" nativeButton={false} render={<a href={run.code_file_url} download />}>
          <Download className="size-3.5" />
          {run.code_filename}
        </Button>
        <ShareToXButton run={run} appUrl={appUrl} />
        <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`/hypotheses/${run.hypothesis_id}/submit-run?fork_from=${run.id}`} />}>
          <GitFork className="size-3.5" />
          Fork this run
        </Button>
      </div>
    </div>
  );
}
