"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DOMAINS } from "@/lib/utils/constants";

const DOMAIN_OPTIONS = [
  { value: "all", label: "All Domains" },
  ...DOMAINS.map((d) => ({ value: d.value, label: d.label })),
] as const;

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "most_runs", label: "Most Active" },
  { value: "best_result", label: "Best Result" },
] as const;

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
] as const;

function findLabel(
  options: readonly { readonly value: string; readonly label: string }[],
  value: string,
): string {
  return options.find((o) => o.value === value)?.label ?? value;
}

export function HypothesisFilterBar() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentDomain = searchParams.get("domain") ?? "all";
  const currentStatus = searchParams.get("status") ?? "all";
  const currentSort = searchParams.get("sort") ?? "newest";

  const domainLabel = useMemo(() => findLabel(DOMAIN_OPTIONS, currentDomain), [currentDomain]);
  const statusLabel = useMemo(() => findLabel(STATUS_OPTIONS, currentStatus), [currentStatus]);
  const sortLabel = useMemo(() => findLabel(SORT_OPTIONS, currentSort), [currentSort]);

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "all" || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      // Reset cursor when filters change
      params.delete("cursor");
      const qs = params.toString();
      router.push(qs ? `/hypotheses?${qs}` : "/hypotheses");
    },
    [router, searchParams],
  );

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        value={currentDomain}
        onValueChange={(val) => updateParam("domain", val ?? "all")}
      >
        <SelectTrigger className="min-w-[160px]">
          <SelectValue placeholder={domainLabel}>{domainLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {DOMAIN_OPTIONS.map((d) => (
            <SelectItem key={d.value} value={d.value}>
              {d.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={currentStatus}
        onValueChange={(val) => updateParam("status", val ?? "all")}
      >
        <SelectTrigger className="min-w-[140px]">
          <SelectValue placeholder={statusLabel}>{statusLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={currentSort}
        onValueChange={(val) => updateParam("sort", val ?? "newest")}
      >
        <SelectTrigger className="min-w-[140px]">
          <SelectValue placeholder={sortLabel}>{sortLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
