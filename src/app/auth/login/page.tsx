"use client";

import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const searchParams =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : null;
  const error = searchParams?.get("error");

  async function handleSignIn() {
    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "twitter",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: "users.read tweet.read",
      },
    });

    if (oauthError) {
      console.error("OAuth sign-in error:", oauthError.message);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-6 rounded-xl border border-gray-200 bg-white p-8">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">
            Sign in to Agentipedia
          </h1>
          <p className="text-sm text-gray-500">
            Connect your X account to get started
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <button
          onClick={handleSignIn}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          Sign in with X
        </button>
      </div>
    </div>
  );
}
