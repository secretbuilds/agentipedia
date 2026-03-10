import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DomainBadge } from "@/components/shared/domain-badge";
import { TagList } from "@/components/shared/tag-list";
import { TimeAgo } from "@/components/shared/time-ago";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import type { Hypothesis } from "@/types/hypothesis";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type UserHypothesisListProps = {
  readonly hypotheses: readonly Hypothesis[];
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function UserHypothesisList({ hypotheses }: UserHypothesisListProps) {
  if (hypotheses.length === 0) {
    return (
      <EmptyState
        heading="No hypotheses yet"
        description="This user has not posted any hypotheses."
      />
    );
  }

  return (
    <div className="space-y-3">
      {hypotheses.map((hypothesis) => (
        <Link
          key={hypothesis.id}
          href={`/hypotheses/${hypothesis.id}`}
          className="block transition-opacity hover:opacity-80"
        >
          <Card size="sm">
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <DomainBadge domain={hypothesis.domain} />
                    <Badge
                      variant={hypothesis.status === "open" ? "secondary" : "outline"}
                      className={
                        hypothesis.status === "open"
                          ? "bg-emerald-50 text-emerald-600"
                          : undefined
                      }
                    >
                      {hypothesis.status}
                    </Badge>
                  </div>
                  <CardTitle>{hypothesis.title}</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="line-clamp-2 text-sm text-muted-foreground">
                {hypothesis.description}
              </p>
              <div className="mt-3 flex items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  {hypothesis.metric_name}
                  {" "}
                  ({hypothesis.metric_direction === "higher_is_better" ? "higher" : "lower"} is better)
                </span>
                <TagList tag1={hypothesis.tag_1} tag2={hypothesis.tag_2} />
                <span className="ml-auto">
                  <TimeAgo date={hypothesis.created_at} />
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
