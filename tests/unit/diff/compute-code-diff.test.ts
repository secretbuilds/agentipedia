import { describe, it, expect } from "vitest";
import { computeCodeDiff } from "@/lib/diff/compute-code-diff";

describe("computeCodeDiff", () => {
  it("returns empty files array for identical snapshots", () => {
    const snapshot = { "main.py": "print('hello')" };
    const result = computeCodeDiff("base-id", "target-id", snapshot, snapshot);
    expect(result.files).toHaveLength(0);
    expect(result.base_run_id).toBe("base-id");
    expect(result.target_run_id).toBe("target-id");
  });

  it("detects added files", () => {
    const base = { "main.py": "print('hello')" };
    const target = { "main.py": "print('hello')", "config.yaml": "lr: 0.001" };
    const result = computeCodeDiff("b", "t", base, target);
    expect(result.files).toHaveLength(1);
    expect(result.files[0].filename).toBe("config.yaml");
    expect(result.files[0].status).toBe("added");
  });

  it("detects removed files", () => {
    const base = { "main.py": "x", "old.py": "y" };
    const target = { "main.py": "x" };
    const result = computeCodeDiff("b", "t", base, target);
    expect(result.files).toHaveLength(1);
    expect(result.files[0].filename).toBe("old.py");
    expect(result.files[0].status).toBe("removed");
  });

  it("detects modified files with unified diff hunks", () => {
    const base = { "main.py": "line1\nline2\nline3" };
    const target = { "main.py": "line1\nchanged\nline3" };
    const result = computeCodeDiff("b", "t", base, target);
    expect(result.files).toHaveLength(1);
    expect(result.files[0].status).toBe("modified");
    expect(result.files[0].hunks).toContain("-line2");
    expect(result.files[0].hunks).toContain("+changed");
  });

  it("handles empty snapshots", () => {
    const result = computeCodeDiff("b", "t", {}, {});
    expect(result.files).toHaveLength(0);
  });

  it("returns filenames in sorted order", () => {
    const base = {};
    const target = { "z.py": "z", "a.py": "a", "m.py": "m" };
    const result = computeCodeDiff("b", "t", base, target);
    expect(result.files.map((f) => f.filename)).toEqual([
      "a.py",
      "m.py",
      "z.py",
    ]);
  });

  it("handles files too large to diff", () => {
    const largeContent = "x".repeat(500 * 1024 + 1);
    const base = { "big.py": largeContent };
    const target = { "big.py": "small" };
    const result = computeCodeDiff("b", "t", base, target);
    expect(result.files).toHaveLength(1);
    expect(result.files[0].status).toBe("modified");
    expect(result.files[0].hunks).toContain("too large to diff");
  });
});
