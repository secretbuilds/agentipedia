import { createTwoFilesPatch } from "diff";
import type { FileDiff, CodeDiffResult } from "@/types/run";

const MAX_DIFF_FILE_SIZE = 500 * 1024;

export function computeCodeDiff(
  baseRunId: string,
  targetRunId: string,
  baseSnapshot: Readonly<Record<string, string>>,
  targetSnapshot: Readonly<Record<string, string>>,
): CodeDiffResult {
  const baseFiles = new Set(Object.keys(baseSnapshot));
  const targetFiles = new Set(Object.keys(targetSnapshot));
  const allFiles = Array.from(new Set([...baseFiles, ...targetFiles])).sort();

  const files: FileDiff[] = [];

  for (const filename of allFiles) {
    const inBase = baseFiles.has(filename);
    const inTarget = targetFiles.has(filename);
    const baseContent = baseSnapshot[filename] ?? "";
    const targetContent = targetSnapshot[filename] ?? "";

    if (inBase && inTarget && baseContent === targetContent) {
      continue;
    }

    const status: FileDiff["status"] = !inBase
      ? "added"
      : !inTarget
        ? "removed"
        : "modified";

    if (
      baseContent.length > MAX_DIFF_FILE_SIZE ||
      targetContent.length > MAX_DIFF_FILE_SIZE
    ) {
      files.push({
        filename,
        hunks: `File too large to diff (>${MAX_DIFF_FILE_SIZE} bytes)`,
        status,
      });
      continue;
    }

    const patch = createTwoFilesPatch(
      `a/${filename}`,
      `b/${filename}`,
      baseContent,
      targetContent,
      undefined,
      undefined,
      { context: 3 },
    );

    files.push({ filename, hunks: patch, status });
  }

  return { base_run_id: baseRunId, target_run_id: targetRunId, files };
}
