import Papa from "papaparse";
import { MAX_TSV_SIZE, MAX_TSV_ROWS } from "@/lib/utils/constants";

export interface RawTsvRow {
  readonly [key: string]: string;
}

export interface TsvParseResult {
  readonly rows: readonly RawTsvRow[];
  readonly headers: readonly string[];
  readonly errors: readonly string[];
}

export function parseTsv(content: string): TsvParseResult {
  const errors: string[] = [];

  // Check size
  const byteLength = new TextEncoder().encode(content).length;
  if (byteLength > MAX_TSV_SIZE) {
    return { rows: [], headers: [], errors: [`File exceeds maximum size of 5 MB`] };
  }

  // Check for binary content
  if (content.slice(0, 8192).includes("\x00")) {
    return { rows: [], headers: [], errors: ["File appears to be binary, not text"] };
  }

  const result = Papa.parse<RawTsvRow>(content, {
    delimiter: "\t",
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
    transformHeader: (h: string) => h.trim().toLowerCase(),
  });

  // Collect PapaParse errors
  for (const err of result.errors) {
    errors.push(`Row ${(err.row ?? 0) + 1}: ${err.message}`);
  }

  // Check row limit
  if (result.data.length > MAX_TSV_ROWS) {
    errors.push(`File has ${result.data.length} rows, maximum is ${MAX_TSV_ROWS}`);
    return { rows: [], headers: [], errors };
  }

  // Validate we have headers
  if (!result.meta.fields || result.meta.fields.length === 0) {
    errors.push("No headers found in TSV file");
    return { rows: [], headers: [], errors };
  }

  return {
    rows: result.data,
    headers: result.meta.fields,
    errors,
  };
}

export function parseTsvFile(file: File): Promise<TsvParseResult> {
  return new Promise((resolve) => {
    if (file.size > MAX_TSV_SIZE) {
      resolve({ rows: [], headers: [], errors: ["File exceeds maximum size of 5 MB"] });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      resolve(parseTsv(content));
    };
    reader.onerror = () => {
      resolve({ rows: [], headers: [], errors: ["Failed to read file"] });
    };
    reader.readAsText(file);
  });
}
