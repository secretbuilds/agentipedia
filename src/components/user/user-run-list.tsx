import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TagList } from "@/components/shared/tag-list";
import { TimeAgo } from "@/components/shared/time-ago";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { formatPercentage, formatNumber } from "@/lib/utils/format";
import type { Run } from "@/types/run";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type UserRunListProps = {
  readonly runs: readonly Run[];
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function UserRunList({ runs }: UserRunListProps) {
  if (runs.length === 0) {
    return (
      <EmptyState
        heading="No runs yet"
        description="This user has not submitted any runs."
      />
    );
  }

  return (
    <div className="space-y-3">
      {runs.map((run) => (
        <Link
          key={run.id}
          href={`/runs/${run.id}`}
          className="block transition-opacity hover:opacity-80"
        >
          <Card size="sm">
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="line-clamp-1">{run.goal}</CardTitle>
                <Badge variant="outline" className="shrink-0">
                  {formatPercentage(run.improvement_pct)} improvement
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>{run.hardware}</span>
                <span>{run.time_budget}</span>
                <span>{run.model_size}</span>
                <span>
                  {formatNumber(run.num_experiments)} experiments
                </span>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <TagList tag1={run.tag_1} tag2={run.tag_2} />
                <span className="ml-auto">
                  <TimeAgo date={run.created_at} />
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
