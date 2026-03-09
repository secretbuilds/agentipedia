"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { DOMAINS } from "@/lib/utils/constants";

export function HypothesisFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      // Reset cursor on filter change
      params.delete("cursor");
      router.push(`/?${params.toString()}`);
    },
    [router, searchParams]
  );

  const domain = searchParams.get("domain") ?? "";
  const status = searchParams.get("status") ?? "open";
  const sort = searchParams.get("sort") ?? "newest";

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-border pb-4">
      <select
        value={domain}
        onChange={(e) => updateParam("domain", e.target.value)}
        className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
      >
        <option value="">All domains</option>
        {DOMAINS.map((d) => (
          <option key={d.value} value={d.value}>
            {d.label}
          </option>
        ))}
      </select>

      <select
        value={status}
        onChange={(e) => updateParam("status", e.target.value)}
        className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
      >
        <option value="open">Open</option>
        <option value="closed">Closed</option>
      </select>

      <select
        value={sort}
        onChange={(e) => updateParam("sort", e.target.value)}
        className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
      >
        <option value="newest">Newest</option>
        <option value="most_runs">Most runs</option>
        <option value="best_result">Best result</option>
      </select>
    </div>
  );
}
