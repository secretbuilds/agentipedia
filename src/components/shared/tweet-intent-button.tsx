"use client";

import { composeTweetUrl } from "@/lib/x-twitter/compose-tweet-url";

type TweetIntentButtonProps = {
  readonly tweetText: string;
  readonly label?: string;
  readonly className?: string;
};

export function TweetIntentButton({
  tweetText,
  label = "Share on X",
  className,
}: TweetIntentButtonProps) {
  const url = composeTweetUrl(tweetText);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={
        className ??
        "inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-50"
      }
    >
      <svg
        viewBox="0 0 24 24"
        className="size-4"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
      {label}
    </a>
  );
}
