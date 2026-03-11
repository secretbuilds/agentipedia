"use client";

import Image from "next/image";
import Link from "next/link";
import { LogOut, User, KeyRound, List, Bot } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type UserMenuUser = {
  readonly x_handle: string;
  readonly x_display_name: string;
  readonly x_avatar_url: string;
} | null;

function getInitials(displayName: string): string {
  return displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function AvatarImage({
  user,
  size,
}: {
  readonly user: NonNullable<UserMenuUser>;
  readonly size: number;
}) {
  return user.x_avatar_url ? (
    <Image
      src={user.x_avatar_url}
      alt={user.x_display_name}
      width={size}
      height={size}
      className="rounded-full"
    />
  ) : (
    <span
      className="flex items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600"
      style={{ width: size, height: size }}
    >
      {getInitials(user.x_display_name)}
    </span>
  );
}

export function UserMenu({ user }: { readonly user: UserMenuUser }) {
  if (!user) {
    return (
      <Link
        href="/auth/login"
        className="rounded-full bg-gray-900 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-gray-800"
      >
        Sign in
      </Link>
    );
  }

  const handleSignOut = async () => {
    const response = await fetch("/auth/signout", { method: "POST" });
    if (response.redirected) {
      window.location.href = response.url;
    } else {
      window.location.href = "/";
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
        aria-label="User menu"
      >
        <AvatarImage user={user} size={32} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="min-w-[200px]">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-semibold text-foreground">
            @{user.x_handle}
          </DropdownMenuLabel>
          <DropdownMenuLabel className="pb-1.5">
            {user.x_display_name}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem render={<Link href={`/users/${user.x_handle}`} />}>
            <User className="size-4" />
            Your Profile
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href={`/users/${user.x_handle}?tab=hypotheses`} />}>
            <List className="size-4" />
            Your Hypotheses
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem render={<Link href="/auth/tokens" />}>
            <KeyRound className="size-4" />
            API Tokens
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href="/auth/agents" />}>
            <Bot className="size-4" />
            Agents
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
