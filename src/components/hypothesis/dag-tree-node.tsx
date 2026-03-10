"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { DagNode } from "@/types/dag";

type DagTreeNodeProps = {
  readonly node: DagNode;
  readonly metricName: string;
  readonly metricDirection: string;
  readonly hypothesisId: string;
};

const INDENT_PX = 24;
const DEFAULT_EXPAND_DEPTH = 2;
const TRUNCATE_LENGTH = 80;

function formatMetric(value: number): string {
  if (Number.isInteger(value)) return String(value);
  const str = value.toFixed(6);
  // Remove trailing zeros but keep at least 2 decimal places
  const trimmed = str.replace(/0+$/, "");
  const decimalIndex = trimmed.indexOf(".");
  const decimals = decimalIndex >= 0 ? trimmed.length - decimalIndex - 1 : 0;
  return decimals < 2 ? value.toFixed(2) : trimmed;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + "\u2026";
}

function metricColorClass(
  direction: "improved" | "regressed" | "unchanged"
): string {
  switch (direction) {
    case "improved":
      return "text-emerald-600";
    case "regressed":
      return "text-red-600";
    case "unchanged":
      return "text-gray-500";
  }
}

function ChevronIcon({ expanded }: { readonly expanded: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={cn(
        "size-4 shrink-0 text-gray-400 transition-transform duration-150",
        expanded && "rotate-90"
      )}
    >
      <path
        fillRule="evenodd"
        d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function DagTreeNode({
  node,
  metricName,
  metricDirection,
  hypothesisId,
}: DagTreeNodeProps) {
  const [expanded, setExpanded] = useState(node.depth <= DEFAULT_EXPAND_DEPTH);

  const hasChildren = node.children.length > 0;
  const summaryText = node.run.synthesis ?? node.run.goal;
  const borderColor = node.isOnBestPath
    ? "border-l-emerald-500"
    : "border-l-gray-200";

  return (
    <div style={{ paddingLeft: node.depth * INDENT_PX }}>
      <div className={cn("border-l-2 pl-3", borderColor)}>
        <div className="group flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-gray-50">
          {/* Collapse toggle */}
          {hasChildren ? (
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              className="flex items-center justify-center rounded p-0.5 hover:bg-gray-100"
              aria-label={expanded ? "Collapse" : "Expand"}
            >
              <ChevronIcon expanded={expanded} />
            </button>
          ) : (
            <span className="inline-block size-4 shrink-0" />
          )}

          {/* Metric badge */}
          <span
            className={cn(
              "shrink-0 rounded px-1.5 py-0.5 font-mono text-xs font-medium",
              metricColorClass(node.metricDirection),
              node.metricDirection === "improved" && "bg-emerald-50",
              node.metricDirection === "regressed" && "bg-red-50",
              node.metricDirection === "unchanged" && "bg-gray-50"
            )}
          >
            {formatMetric(node.run.best_metric)}
          </span>

          {/* User handle */}
          <span className="shrink-0 text-xs text-gray-500">
            @{node.run.user.x_handle}
          </span>

          {/* Summary text with link */}
          <Link
            href={`/runs/${node.run.id}`}
            className={cn(
              "min-w-0 truncate text-sm transition-colors hover:text-gray-900",
              node.isOnBestPath
                ? "font-semibold text-gray-800"
                : "text-gray-600"
            )}
            title={summaryText}
          >
            {truncate(summaryText, TRUNCATE_LENGTH)}
          </Link>

          {/* Spacer */}
          <span className="flex-1" />

          {/* Frontier badge */}
          {node.isLeaf && (
            <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
              Frontier
            </span>
          )}

          {/* Date */}
          <span className="shrink-0 text-xs text-gray-400">
            {formatDate(node.run.created_at)}
          </span>
        </div>
      </div>

      {/* Recursively render children */}
      {hasChildren && expanded && (
        <div>
          {node.children.map((child) => (
            <DagTreeNode
              key={child.run.id}
              node={child}
              metricName={metricName}
              metricDirection={metricDirection}
              hypothesisId={hypothesisId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
