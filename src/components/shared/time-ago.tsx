"use client";

import { formatDistanceToNow } from "date-fns";

export function TimeAgo({ date }: { readonly date: string }) {
  const parsed = new Date(date);
  const label = formatDistanceToNow(parsed, { addSuffix: true });

  return (
    <time
      dateTime={parsed.toISOString()}
      className="text-sm text-neutral-400"
      title={parsed.toLocaleString()}
    >
      {label}
    </time>
  );
}
