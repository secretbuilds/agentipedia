"use client";

import Image from "next/image";
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
    <nav className="fixed top-0 right-0 left-0 z-50 border-b border-gray-200/60 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center">
          <Image
            src="/logo-nav.png"
            alt="Agentipedia"
            width={150}
            height={32}
            className="h-6 w-auto sm:h-7"
            priority
          />
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/hypotheses"
            className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
          >
            {user ? "Browse" : "Browse Hypotheses"}
          </Link>
          {user && (
            <Button
              render={<Link href="/hypotheses/new" />}
              variant="default"
              size="sm"
              nativeButton={false}
              className="hidden rounded-full sm:inline-flex"
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
