"use client";

import { useCallback, useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Copy, Check, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

type CodeViewerProps = {
  readonly code: string;
  readonly filename: string;
};

const EXTENSION_LANGUAGE_MAP: Record<string, string> = {
  ".py": "python",
  ".js": "javascript",
  ".ts": "typescript",
  ".rs": "rust",
  ".go": "go",
  ".c": "c",
  ".cpp": "cpp",
  ".java": "java",
  ".jl": "julia",
  ".r": "r",
  ".sh": "bash",
};

function detectLanguage(filename: string): string {
  const dotIdx = filename.lastIndexOf(".");
  if (dotIdx === -1) return "text";
  const ext = filename.slice(dotIdx).toLowerCase();
  return EXTENSION_LANGUAGE_MAP[ext] ?? "text";
}

export function CodeViewer({ code, filename }: CodeViewerProps) {
  const [copied, setCopied] = useState(false);
  const language = detectLanguage(filename);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }, [code, filename]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Code</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{filename}</span>
          <Button variant="ghost" size="icon-xs" onClick={handleCopy}>
            {copied ? (
              <Check className="size-3.5 text-emerald-600" />
            ) : (
              <Copy className="size-3.5" />
            )}
          </Button>
          <Button variant="ghost" size="icon-xs" onClick={handleDownload}>
            <Download className="size-3.5" />
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <SyntaxHighlighter
          language={language}
          style={vscDarkPlus}
          customStyle={{
            margin: 0,
            borderRadius: "0.5rem",
            fontSize: "0.8125rem",
            lineHeight: "1.5",
          }}
          showLineNumbers
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
