import { parseTsv } from "./tsv-parser";
import { validateTsvRows, type ParsedTsvRow } from "./tsv-validator";
import { extractTsvStats, type TsvStats } from "./tsv-stats";
import type { MetricDirection } from "@/lib/utils/constants";

export interface ProcessTsvSuccess {
  readonly success: true;
  readonly rows: readonly ParsedTsvRow[];
  readonly metricColumnName: string;
  readonly stats: TsvStats;
}

export interface ProcessTsvFailure {
  readonly success: false;
  readonly errors: readonly string[];
}

export type ProcessTsvResult = ProcessTsvSuccess | ProcessTsvFailure;

/**
 * End-to-end TSV processing pipeline: parse -> validate -> extract stats.
 *
 * Returns either a success result with validated rows and computed stats,
 * or a failure result with accumulated errors from all stages.
 */
export function processTsv(
  input: string,
  metricDirection: MetricDirection,
): ProcessTsvResult {
  // Stage 1: Parse raw TSV
  const parseResult = parseTsv(input);
  if (parseResult.errors.length > 0) {
    return { success: false, errors: parseResult.errors };
  }

  // Stage 2: Validate rows
  const validationResult = validateTsvRows(parseResult.rows);
  if (validationResult.errors.length > 0) {
    return { success: false, errors: validationResult.errors };
  }

  if (validationResult.validRows.length === 0) {
    return { success: false, errors: ["No valid rows found after validation"] };
  }

  // Stage 3: Extract stats
  const stats = extractTsvStats(validationResult.validRows, metricDirection);

  return {
    success: true,
    rows: validationResult.validRows,
    metricColumnName: validationResult.metricColumnName,
    stats,
  };
}
