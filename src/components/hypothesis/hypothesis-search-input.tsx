"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

const DEBOUNCE_MS = 300;
const MAX_QUERY_LENGTH = 200;

type HypothesisSearchInputProps = {
  readonly defaultValue?: string;
};

export function HypothesisSearchInput({
  defaultValue = "",
}: HypothesisSearchInputProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(defaultValue);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync with URL changes from external navigation (e.g. back/forward)
  const urlQuery = searchParams.get("q") ?? "";
  useEffect(() => {
    setValue(urlQuery);
  }, [urlQuery]);

  const pushSearch = useCallback(
    (query: string) => {
      const params = new URLSearchParams(searchParams.toString());
      const trimmed = query.trim().slice(0, MAX_QUERY_LENGTH);

      if (trimmed) {
        params.set("q", trimmed);
      } else {
        params.delete("q");
      }

      // Reset cursor when search changes
      params.delete("cursor");

      const qs = params.toString();
      router.push(qs ? `/hypotheses?${qs}` : "/hypotheses");
    },
    [router, searchParams],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = e.target.value;
      setValue(next);

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        pushSearch(next);
      }, DEBOUNCE_MS);
    },
    [pushSearch],
  );

  const handleClear = useCallback(() => {
    setValue("");
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    pushSearch("");
  }, [pushSearch]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return (
    <div className="relative w-full">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder="Search hypotheses by keyword..."
        className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-10 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-300"
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
