"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/layout/user-menu";

type TopNavUser = {
  readonly x_handle: string;
  readonly x_display_name: string;
  readonly x_avatar_url: string;
} | null;

export function TopNav({ user }: { readonly user: TopNavUser }) {
  return (
    <nav className="fixed top-0 right-0 left-0 z-50 border-b border-neutral-800 bg-neutral-900/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="text-lg font-bold tracking-tight text-neutral-50"
        >
          Agentipedia
        </Link>

        <div className="flex items-center gap-3">
          {user && (
            <Button
              render={<Link href="/create-hypothesis" />}
              variant="secondary"
              size="sm"
              nativeButton={false}
              className="hidden sm:inline-flex"
            >
              New Hypothesis
            </Button>
          )}
          <UserMenu user={user} />
        </div>
      </div>
    </nav>
  );
}
