import type { RawTsvRow } from "./tsv-parser";
import { TSV_STATUSES, type TsvStatus } from "@/lib/validators/tsv-schema";

/** A validated, typed TSV row ready for downstream use. */
export interface ParsedTsvRow {
  readonly commit: string;
  readonly metric_value: number;
  readonly memory_gb: number;
  readonly status: TsvStatus;
  readonly description: string;
}

export interface TsvValidationResult {
  readonly validRows: readonly ParsedTsvRow[];
  readonly metricColumnName: string;
  readonly errors: readonly string[];
}

/**
 * Well-known metric column names from the domain docs.
 * Checked in order — the first match wins.
 */
const KNOWN_METRIC_NAMES = [
  "val_bpb",
  "sharpe_ratio",
  "success_rate",
  "training_seconds",
  "peak_vram_gb",
  "accuracy",
  "f1_score",
  "auc",
  "bleu",
  "rouge",
  "perplexity",
  "loss",
  "reward",
  "metric_value",
] as const;

const REQUIRED_FIXED_COLUMNS = ["commit", "memory_gb", "status", "description"];

/**
 * Detect which column holds the primary metric value.
 *
 * Strategy:
 * 1. Check for any well-known metric name among the columns.
 * 2. Fall back to the second column in the header (the traditional position
 *    after "commit" in results.tsv files).
 */
function detectMetricColumn(
  columnNames: readonly string[],
): string | undefined {
  for (const known of KNOWN_METRIC_NAMES) {
    if (columnNames.includes(known)) {
      return known;
    }
  }

  // Fall back to second column (index 1) if available and not a fixed column
  if (columnNames.length >= 2) {
    const candidate = columnNames[1];
    if (!REQUIRED_FIXED_COLUMNS.includes(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

/**
 * Validate parsed TSV rows and coerce numeric fields.
 *
 * - Checks that all required columns exist (commit, memory_gb, status,
 *   description, plus one metric column).
 * - Validates each row: numeric check on metric and memory, status enum
 *   membership, non-empty commit and description.
 * - Rows that fail validation are collected as errors, not included in output.
 */
export function validateTsvRows(
  rows: readonly RawTsvRow[],
): TsvValidationResult {
  if (rows.length === 0) {
    return { validRows: [], metricColumnName: "", errors: ["No rows to validate"] };
  }

  const columnNames = Object.keys(rows[0]);
  const errors: string[] = [];

  // Check required fixed columns
  for (const col of REQUIRED_FIXED_COLUMNS) {
    if (!columnNames.includes(col)) {
      errors.push(`Missing required column: "${col}"`);
    }
  }

  // Detect metric column
  const metricCol = detectMetricColumn(columnNames);
  if (!metricCol) {
    errors.push(
      "No metric column found. Expected a known metric name (e.g. val_bpb, sharpe_ratio) or a second column after commit.",
    );
  }

  // If we're missing structural columns, bail early
  if (errors.length > 0) {
    return { validRows: [], metricColumnName: metricCol ?? "", errors };
  }

  const validRows: ParsedTsvRow[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1; // 1-based for human-friendly messages
    const rowErrors: string[] = [];

    // commit — must be non-empty string
    const commit = (row.commit ?? "").trim();
    if (commit.length === 0) {
      rowErrors.push("commit is empty");
    }

    // metric — must parse to a finite number
    const rawMetric = row[metricCol!];
    const metricValue = Number(rawMetric);
    if (rawMetric === undefined || rawMetric.trim() === "" || !Number.isFinite(metricValue)) {
      rowErrors.push(`${metricCol} ("${rawMetric ?? ""}") is not a valid number`);
    }

    // memory_gb — must parse to a finite number
    const rawMemory = (row.memory_gb ?? "").trim();
    const memoryGb = Number(rawMemory);
    if (rawMemory === "" || !Number.isFinite(memoryGb)) {
      rowErrors.push(`memory_gb ("${rawMemory}") is not a valid number`);
    }

    // status — must be one of the valid enum values
    const rawStatus = (row.status ?? "").trim().toLowerCase();
    if (!(TSV_STATUSES as readonly string[]).includes(rawStatus)) {
      rowErrors.push(`status ("${row.status ?? ""}") must be one of: ${TSV_STATUSES.join(", ")}`);
    }

    // description — must be non-empty
    const description = (row.description ?? "").trim();
    if (description.length === 0) {
      rowErrors.push("description is empty");
    }

    if (rowErrors.length > 0) {
      errors.push(`Row ${rowNum}: ${rowErrors.join("; ")}`);
    } else {
      validRows.push({
        commit,
        metric_value: metricValue,
        memory_gb: memoryGb,
        status: rawStatus as TsvStatus,
        description,
      });
    }
  }

  return { validRows, metricColumnName: metricCol!, errors };
}
