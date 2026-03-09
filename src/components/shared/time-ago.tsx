"use client";

import { useEffect, useState } from "react";

type TimeAgoProps = {
  date: string;
  className?: string;
};

function getTimeAgo(date: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(date).getTime()) / 1000
  );

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(months / 12);
  return `${years}y ago`;
}

export function TimeAgo({ date, className }: TimeAgoProps) {
  const [text, setText] = useState(() => getTimeAgo(date));

  useEffect(() => {
    const interval = setInterval(() => {
      setText(getTimeAgo(date));
    }, 60000);
    return () => clearInterval(interval);
  }, [date]);

  return (
    <time
      dateTime={date}
      title={new Date(date).toLocaleString()}
      className={className}
    >
      {text}
    </time>
  );
}
