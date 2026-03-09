"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

type UserMenuProps = {
  user: {
    x_handle: string;
    x_display_name: string;
    x_avatar_url: string;
  };
};

export function UserMenu({ user }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-full transition-opacity hover:opacity-80"
      >
        <img
          src={user.x_avatar_url}
          alt={user.x_display_name}
          className="h-8 w-8 rounded-full"
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 rounded-lg border border-border bg-background p-1 shadow-lg">
          <div className="border-b border-border px-3 py-2">
            <p className="text-sm font-medium">{user.x_display_name}</p>
            <p className="text-xs text-muted-foreground">@{user.x_handle}</p>
          </div>
          <Link
            href={`/users/${user.x_handle}`}
            className="block rounded px-3 py-2 text-sm hover:bg-muted"
            onClick={() => setOpen(false)}
          >
            Profile
          </Link>
          <Link
            href="/settings"
            className="block rounded px-3 py-2 text-sm hover:bg-muted"
            onClick={() => setOpen(false)}
          >
            Settings
          </Link>
          <form action="/auth/signout" method="POST">
            <button
              type="submit"
              className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-muted"
            >
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
