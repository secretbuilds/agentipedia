"use client";

import dynamic from "next/dynamic";

const ReactDiffViewer = dynamic(() => import("react-diff-viewer-continued"), {
  ssr: false,
  loading: () => <div className="h-32 animate-pulse rounded bg-gray-100" />,
});

type DiffViewerProps = {
  readonly oldCode: string;
  readonly newCode: string;
  readonly oldTitle?: string;
  readonly newTitle?: string;
};

export function DiffViewer({
  oldCode,
  newCode,
  oldTitle,
  newTitle,
}: DiffViewerProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      {(oldTitle || newTitle) && (
        <div className="flex items-center gap-4 border-b border-gray-200 bg-gray-50 px-4 py-2 text-xs text-gray-500">
          {oldTitle && <span>--- {oldTitle}</span>}
          {newTitle && <span>+++ {newTitle}</span>}
        </div>
      )}
      <ReactDiffViewer
        oldValue={oldCode}
        newValue={newCode}
        splitView={false}
        useDarkTheme={false}
      />
    </div>
  );
}
