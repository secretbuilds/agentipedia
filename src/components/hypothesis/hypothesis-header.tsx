import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DomainBadge } from "@/components/shared/domain-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { TimeAgo } from "@/components/shared/time-ago";
import type { Hypothesis } from "@/types/hypothesis";
import type { UserSummary } from "@/types/user";

type HypothesisHeaderProps = {
  readonly hypothesis: Hypothesis & { readonly user: UserSummary };
  readonly isOwner: boolean;
};

export function HypothesisHeader({
  hypothesis,
  isOwner,
}: HypothesisHeaderProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <DomainBadge domain={hypothesis.domain} />
        <Badge
          variant={hypothesis.status === "open" ? "secondary" : "outline"}
          className="capitalize"
        >
          {hypothesis.status}
        </Badge>
        {isOwner && (
          <Button
            render={
              <Link href={`/hypotheses/${hypothesis.id}/edit`} />
            }
            variant="ghost"
            size="sm"
            className="ml-auto"
          >
            Edit
          </Button>
        )}
      </div>

      <h1 className="text-2xl font-bold leading-tight text-gray-900 sm:text-3xl">
        {hypothesis.title}
      </h1>

      <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-500">
        {hypothesis.description}
      </p>

      <div className="flex items-center gap-3">
        <UserAvatar
          handle={hypothesis.user.x_handle}
          avatarUrl={hypothesis.user.x_avatar_url}
          size="md"
        />
        <TimeAgo date={hypothesis.created_at} />
      </div>
    </div>
  );
}
