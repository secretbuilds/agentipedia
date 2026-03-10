"use client";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-2xl font-bold text-neutral-100">
        Something went wrong
      </h1>
      <p className="max-w-md text-sm text-neutral-400">
        An unexpected error occurred. Please try again.
        {error.digest && (
          <span className="mt-1 block text-xs text-neutral-500">
            Error ID: {error.digest}
          </span>
        )}
      </p>
      <Button variant="secondary" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
