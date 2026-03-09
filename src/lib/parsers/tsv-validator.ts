import type { RawTsvRow } from "./tsv-parser";
import type { ParsedTsvRow } from "@/types/experiment";
import { EXPERIMENT_STATUSES } from "@/lib/utils/constants";

const REQUIRED_COLUMNS = ["commit", "status", "description"];

export interface TsvValidationResult {
  readonly rows: readonly ParsedTsvRow[];
  readonly errors: readonly string[];
}

export function validateTsvRows(
  rawRows: readonly RawTsvRow[],
  headers: readonly string[]
): TsvValidationResult {
  const errors: string[] = [];
  const validRows: ParsedTsvRow[] = [];

  // Structural validation: check minimum columns
  if (headers.length < 5) {
    errors.push(
      `Expected at least 5 columns (commit, metric, memory_gb, status, description), got ${headers.length}`
    );
    return { rows: [], errors };
  }

  // Check required named columns
  for (const col of REQUIRED_COLUMNS) {
    if (!headers.includes(col)) {
      errors.push(`Missing required column: "${col}"`);
    }
  }

  // The second column is always the primary metric (regardless of header name)
  const metricColumnName = headers[1];
  const memoryColumnName = headers.includes("memory_gb") ? "memory_gb" : headers[2];

  if (errors.length > 0) {
    return { rows: [], errors };
  }

  if (rawRows.length === 0) {
    errors.push("TSV has no data rows");
    return { rows: [], errors };
  }

  // Per-row validation
  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    const rowNum = i + 2; // +2 because row 1 is header, data starts at row 2
    const rowErrors: string[] = [];

    const commit = row["commit"]?.trim() ?? "";
    if (!commit) {
      rowErrors.push(`Row ${rowNum}: commit is empty`);
    }

    const metricRaw = row[metricColumnName]?.trim() ?? "";
    const metricValue = parseFloat(metricRaw);
    if (isNaN(metricValue)) {
      rowErrors.push(`Row ${rowNum}: metric value "${metricRaw}" is not a number`);
    }

    const memoryRaw = row[memoryColumnName]?.trim() ?? "";
    const memoryGb = parseFloat(memoryRaw);
    if (isNaN(memoryGb)) {
      rowErrors.push(`Row ${rowNum}: memory_gb "${memoryRaw}" is not a number`);
    }

    const status = row["status"]?.trim().toLowerCase() ?? "";
    if (!EXPERIMENT_STATUSES.includes(status as typeof EXPERIMENT_STATUSES[number])) {
      rowErrors.push(
        `Row ${rowNum}: status must be one of ${EXPERIMENT_STATUSES.join(", ")}, got "${status}"`
      );
    }

    const description = row["description"]?.trim() ?? "";
    if (!description) {
      rowErrors.push(`Row ${rowNum}: description is empty`);
    }

    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
    } else {
      validRows.push({
        commit,
        metric_value: metricValue,
        memory_gb: memoryGb,
        status: status as ParsedTsvRow["status"],
        description,
      });
    }
  }

  return { rows: validRows, errors };
}
