import Link from "next/link";

type UserAvatarProps = {
  handle: string;
  displayName: string;
  avatarUrl: string;
  size?: "sm" | "md" | "lg";
  showHandle?: boolean;
};

const sizes = {
  sm: "h-6 w-6",
  md: "h-8 w-8",
  lg: "h-10 w-10",
};

export function UserAvatar({
  handle,
  displayName,
  avatarUrl,
  size = "md",
  showHandle = true,
}: UserAvatarProps) {
  return (
    <Link
      href={`/users/${handle}`}
      className="flex items-center gap-2 transition-opacity hover:opacity-80"
    >
      <img
        src={avatarUrl}
        alt={displayName}
        className={`${sizes[size]} rounded-full`}
      />
      {showHandle && (
        <span className="text-sm text-muted-foreground">@{handle}</span>
      )}
    </Link>
  );
}
