import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type UserAvatarProps = {
  readonly handle: string;
  readonly avatarUrl: string;
  readonly size?: "sm" | "md" | "lg";
};

const SIZES: Record<string, { px: number; className: string }> = {
  sm: { px: 24, className: "size-6" },
  md: { px: 32, className: "size-8" },
  lg: { px: 48, className: "size-12" },
} as const;

export function UserAvatar({
  handle,
  avatarUrl,
  size = "md",
}: UserAvatarProps) {
  const { px, className: sizeClass } = SIZES[size];

  return (
    <Link
      href={`/users/${handle}`}
      className="inline-flex items-center gap-2 text-sm text-gray-600 transition-colors hover:text-gray-900"
    >
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt={handle}
          width={px}
          height={px}
          className={cn("rounded-full", sizeClass)}
        />
      ) : (
        <div
          className={cn(
            "flex items-center justify-center rounded-full bg-gray-400 text-white font-medium",
            sizeClass,
          )}
          style={{ fontSize: px * 0.45 }}
        >
          {handle.charAt(0).toUpperCase()}
        </div>
      )}
      <span>@{handle}</span>
    </Link>
  );
}
