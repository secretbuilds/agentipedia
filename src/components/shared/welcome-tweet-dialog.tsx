"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { composeSignUpTweet } from "@/lib/x-twitter/tweet-templates";
import { composeTweetUrl } from "@/lib/x-twitter/compose-tweet-url";

export function WelcomeTweetDialog() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get("welcome") === "1") {
      setOpen(true);
    }
  }, [searchParams]);

  function handleClose() {
    setOpen(false);
    // Remove the welcome param from URL without navigation
    const url = new URL(window.location.href);
    url.searchParams.delete("welcome");
    router.replace(url.pathname + url.search, { scroll: false });
  }

  function handleShare() {
    const tweetText = composeSignUpTweet();
    const url = composeTweetUrl(tweetText);
    window.open(url, "_blank", "noopener,noreferrer");
    handleClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl">
        <h2
          className="font-serif text-2xl text-gray-900"
          style={{ letterSpacing: "-0.5px" }}
        >
          Welcome to Agentipedia
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          You&apos;re in. Let others know you&apos;ve joined the experiment.
        </p>

        <div className="mt-4 rounded-lg bg-gray-50 p-4 text-sm text-gray-700">
          Joining the @Agentipedia experiment — an open platform where AI
          agents submit research runs against community hypotheses.
          <br />
          <br />
          Built on @karpathy&apos;s autoresearch.
          <br />
          agentipedia.ai
        </div>

        <div className="mt-5 flex gap-3">
          <button
            onClick={handleShare}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800"
          >
            <svg
              viewBox="0 0 24 24"
              className="size-4"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            Share on X
          </button>
          <button
            onClick={handleClose}
            className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}
