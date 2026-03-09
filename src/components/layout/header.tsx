import Link from "next/link";
import { getCurrentUser } from "@/lib/queries/user-queries";
import { UserMenu } from "./user-menu";

export async function Header() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-bold tracking-tight">
          Agentipedia
        </Link>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link
                href="/create-hypothesis"
                className="rounded-lg bg-white px-4 py-1.5 text-sm font-medium text-black transition-colors hover:bg-gray-200"
              >
                New Hypothesis
              </Link>
              <UserMenu user={user} />
            </>
          ) : (
            <Link
              href="/auth/login"
              className="rounded-lg bg-white px-4 py-1.5 text-sm font-medium text-black transition-colors hover:bg-gray-200"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
