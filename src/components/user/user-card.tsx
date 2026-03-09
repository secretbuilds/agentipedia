import Image from "next/image";
import { CalendarDays, FlaskConical, Play } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { UserProfile } from "@/types/user";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type UserCardProps = {
  readonly user: UserProfile;
  readonly hypothesisCount: number;
  readonly runCount: number;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function UserCard({ user, hypothesisCount, runCount }: UserCardProps) {
  const joinedDate = new Date(user.created_at).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 pt-2 sm:flex-row sm:items-start">
        {/* Avatar */}
        <Image
          src={user.x_avatar_url}
          alt={user.x_display_name}
          width={96}
          height={96}
          className="size-24 rounded-full"
        />

        {/* Info */}
        <div className="flex flex-1 flex-col items-center gap-2 sm:items-start">
          <div className="text-center sm:text-left">
            <h1 className="text-xl font-bold tracking-tight">
              {user.x_display_name}
            </h1>
            <p className="text-sm text-muted-foreground">@{user.x_handle}</p>
          </div>

          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <CalendarDays className="size-3.5" />
            <span>Joined {joinedDate}</span>
          </div>

          {/* Stats */}
          <div className="mt-1 flex gap-4">
            <StatItem
              icon={<FlaskConical className="size-4" />}
              count={hypothesisCount}
              label="Hypotheses"
            />
            <StatItem
              icon={<Play className="size-4" />}
              count={runCount}
              label="Runs"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Sub-component
// ---------------------------------------------------------------------------

function StatItem({
  icon,
  count,
  label,
}: {
  readonly icon: React.ReactNode;
  readonly count: number;
  readonly label: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 text-sm text-muted-foreground",
      )}
    >
      {icon}
      <span className="font-semibold text-foreground">{count}</span>
      <span>{label}</span>
    </div>
  );
}
