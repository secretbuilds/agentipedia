import Papa from "papaparse";

/** Raw row as parsed from the TSV — all values are strings at this stage. */
export type RawTsvRow = Record<string, string>;

export interface TsvParseResult {
  readonly rows: readonly RawTsvRow[];
  readonly errors: readonly string[];
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_ROW_COUNT = 10_000;
const BINARY_CHECK_BYTES = 8 * 1024; // first 8 KB

/**
 * Returns true if the first 8 KB of the input contain null bytes,
 * indicating binary content rather than text.
 */
function containsBinaryContent(input: string): boolean {
  const checkRegion = input.slice(0, BINARY_CHECK_BYTES);
  return checkRegion.includes("\0");
}

/**
 * Parse a raw TSV string into rows.
 *
 * Validates:
 * - Non-empty input
 * - Max 5 MB size
 * - No binary content (null bytes in first 8 KB)
 * - Max 10,000 data rows
 *
 * All values remain as strings — numeric conversion happens in the validator.
 */
export function parseTsv(input: string): TsvParseResult {
  if (!input || input.trim().length === 0) {
    return { rows: [], errors: ["Input is empty"] };
  }

  const byteSize = new TextEncoder().encode(input).byteLength;
  if (byteSize > MAX_FILE_SIZE_BYTES) {
    return {
      rows: [],
      errors: [
        `File size (${(byteSize / 1024 / 1024).toFixed(1)} MB) exceeds the 5 MB limit`,
      ],
    };
  }

  if (containsBinaryContent(input)) {
    return { rows: [], errors: ["File appears to contain binary content"] };
  }

  const result = Papa.parse<RawTsvRow>(input, {
    delimiter: "\t",
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
    transformHeader: (h: string) => h.trim().toLowerCase(),
  });

  const errors: string[] = [];

  for (const err of result.errors) {
    errors.push(`Row ${err.row ?? "?"}: ${err.message}`);
  }

  if (result.data.length > MAX_ROW_COUNT) {
    errors.push(
      `Too many rows: ${result.data.length} exceeds the ${MAX_ROW_COUNT} row limit`,
    );
    return { rows: [], errors };
  }

  return { rows: result.data, errors };
}
