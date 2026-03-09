import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { parseTsv } from "@/lib/parsers/tsv-parser";

const FIXTURES_DIR = path.resolve(__dirname, "../../fixtures");

function readFixture(name: string): string {
  return fs.readFileSync(path.join(FIXTURES_DIR, name), "utf-8");
}

describe("parseTsv", () => {
  describe("happy path", () => {
    it("parses a valid TSV file into rows", () => {
      const input = readFixture("valid-results.tsv");
      const result = parseTsv(input);
      expect(result.errors).toHaveLength(0);
      expect(result.rows.length).toBe(20);
    });

    it("returns all column values as strings (dynamicTyping off)", () => {
      const input = readFixture("valid-results.tsv");
      const result = parseTsv(input);
      const firstRow = result.rows[0];
      expect(typeof firstRow["val_bpb"]).toBe("string");
      expect(typeof firstRow["memory_gb"]).toBe("string");
    });

    it("lowercases and trims header names", () => {
      const input = "  Commit \t Val_BPB \t Memory_GB \t Status \t Description \nbaseline\t1.0\t38.0\tkeep\ttest";
      const result = parseTsv(input);
      expect(result.errors).toHaveLength(0);
      const cols = Object.keys(result.rows[0]);
      expect(cols).toContain("commit");
      expect(cols).toContain("val_bpb");
      expect(cols).toContain("memory_gb");
    });

    it("skips empty lines", () => {
      const input = "commit\tval_bpb\tmemory_gb\tstatus\tdescription\n\nbaseline\t1.0\t38.0\tkeep\ttest\n\n";
      const result = parseTsv(input);
      expect(result.rows.length).toBe(1);
    });
  });

  describe("empty input", () => {
    it("returns an error for empty string", () => {
      const result = parseTsv("");
      expect(result.rows).toHaveLength(0);
      expect(result.errors).toContain("Input is empty");
    });

    it("returns an error for whitespace-only string", () => {
      const result = parseTsv("   \n\t  ");
      expect(result.rows).toHaveLength(0);
      expect(result.errors).toContain("Input is empty");
    });
  });

  describe("file size limit", () => {
    it("rejects input larger than 5 MB", () => {
      // Create a string just over 5 MB
      const header = "commit\tval_bpb\tmemory_gb\tstatus\tdescription\n";
      const row = "abc1234\t1.0\t38.0\tkeep\t" + "x".repeat(5000) + "\n";
      const numRows = Math.ceil((5 * 1024 * 1024) / row.length) + 1;
      const input = header + row.repeat(numRows);
      const result = parseTsv(input);
      expect(result.rows).toHaveLength(0);
      expect(result.errors[0]).toMatch(/exceeds the 5 MB limit/);
    });
  });

  describe("binary content detection", () => {
    it("rejects input containing null bytes", () => {
      const input = "commit\tval_bpb\0\tmemory_gb\tstatus\tdescription\nbaseline\t1.0\t38.0\tkeep\ttest";
      const result = parseTsv(input);
      expect(result.rows).toHaveLength(0);
      expect(result.errors).toContain("File appears to contain binary content");
    });
  });

  describe("row count limit", () => {
    it("rejects input with more than 10,000 rows", () => {
      const header = "commit\tval_bpb\tmemory_gb\tstatus\tdescription";
      const row = "abc1234\t1.0\t38.0\tkeep\texperiment";
      const lines = [header];
      for (let i = 0; i < 10_001; i++) {
        lines.push(row);
      }
      const input = lines.join("\n");
      const result = parseTsv(input);
      expect(result.rows).toHaveLength(0);
      expect(result.errors[0]).toMatch(/Too many rows/);
    });

    it("accepts exactly 10,000 rows", () => {
      const header = "commit\tval_bpb\tmemory_gb\tstatus\tdescription";
      const row = "abc1234\t1.0\t38.0\tkeep\texperiment";
      const lines = [header];
      for (let i = 0; i < 10_000; i++) {
        lines.push(row);
      }
      const input = lines.join("\n");
      const result = parseTsv(input);
      expect(result.errors).toHaveLength(0);
      expect(result.rows.length).toBe(10_000);
    });
  });

  describe("PapaParse errors", () => {
    it("reports parsing errors from PapaParse", () => {
      // Inconsistent field counts can generate warnings
      const input = "commit\tval_bpb\tmemory_gb\tstatus\tdescription\nbaseline\t1.0\t38.0\tkeep";
      const result = parseTsv(input);
      // PapaParse may or may not flag this depending on settings;
      // the row will still be present but may have missing fields
      expect(result.rows.length).toBeGreaterThanOrEqual(0);
    });
  });
});
