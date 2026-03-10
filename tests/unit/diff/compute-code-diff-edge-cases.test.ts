import { describe, it, expect } from "vitest";
import { computeCodeDiff } from "@/lib/diff/compute-code-diff";

// ---------------------------------------------------------------------------
// Edge Case: Empty snapshots
// ---------------------------------------------------------------------------
describe("computeCodeDiff — empty snapshots", () => {
  it("returns empty files for two empty snapshots", () => {
    const result = computeCodeDiff("b", "t", {}, {});
    expect(result.files).toHaveLength(0);
  });

  it("base empty, target has files — all marked added", () => {
    const target = { "main.py": "print('hi')", "util.py": "def f(): pass" };
    const result = computeCodeDiff("b", "t", {}, target);
    expect(result.files).toHaveLength(2);
    expect(result.files.every((f) => f.status === "added")).toBe(true);
  });

  it("target empty, base has files — all marked removed", () => {
    const base = { "main.py": "print('hi')", "util.py": "def f(): pass" };
    const result = computeCodeDiff("b", "t", base, {});
    expect(result.files).toHaveLength(2);
    expect(result.files.every((f) => f.status === "removed")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Edge Case: Unicode content
// ---------------------------------------------------------------------------
describe("computeCodeDiff — unicode content", () => {
  it("handles UTF-8 content in files correctly", () => {
    const base = { "i18n.py": "msg = 'hello'" };
    const target = { "i18n.py": "msg = '\u3053\u3093\u306b\u3061\u306f\u4e16\u754c'" };
    const result = computeCodeDiff("b", "t", base, target);

    expect(result.files).toHaveLength(1);
    expect(result.files[0].status).toBe("modified");
    expect(result.files[0].hunks).toContain("+msg = '\u3053\u3093\u306b\u3061\u306f\u4e16\u754c'");
  });

  it("handles emoji in file content", () => {
    const base = { "readme.txt": "Hello" };
    const target = { "readme.txt": "Hello \ud83d\ude80" };
    const result = computeCodeDiff("b", "t", base, target);

    expect(result.files).toHaveLength(1);
    expect(result.files[0].status).toBe("modified");
    expect(result.files[0].hunks).toContain("\ud83d\ude80");
  });

  it("handles unicode filenames", () => {
    const base = {};
    const target = { "\u30c6\u30b9\u30c8.py": "x = 1" };
    const result = computeCodeDiff("b", "t", base, target);

    expect(result.files).toHaveLength(1);
    expect(result.files[0].filename).toBe("\u30c6\u30b9\u30c8.py");
    expect(result.files[0].status).toBe("added");
  });
});

// ---------------------------------------------------------------------------
// Edge Case: Large file near 500KB limit
// ---------------------------------------------------------------------------
describe("computeCodeDiff — large file boundary", () => {
  const limit = 500 * 1024;

  it("diffs files at exactly 500KB", () => {
    const content = "a".repeat(limit);
    const base = { "big.py": content };
    const target = { "big.py": content + "b" };
    const result = computeCodeDiff("b", "t", base, target);

    // base is exactly 500KB, target is 500KB + 1 byte => target exceeds limit
    expect(result.files).toHaveLength(1);
    expect(result.files[0].hunks).toContain("too large to diff");
  });

  it("diffs files just under 500KB normally", () => {
    const content = "a".repeat(limit - 1);
    const modified = "b".repeat(limit - 1);
    const base = { "almost.py": content };
    const target = { "almost.py": modified };
    const result = computeCodeDiff("b", "t", base, target);

    expect(result.files).toHaveLength(1);
    expect(result.files[0].status).toBe("modified");
    // Should NOT contain the "too large" message
    expect(result.files[0].hunks).not.toContain("too large to diff");
  });

  it("large file guard applies per-file, not total", () => {
    const smallContent = "x = 1";
    const largeContent = "y".repeat(limit + 1);
    const base = { "small.py": smallContent, "large.py": largeContent };
    const target = { "small.py": "x = 2", "large.py": "z" };
    const result = computeCodeDiff("b", "t", base, target);

    expect(result.files).toHaveLength(2);
    const large = result.files.find((f) => f.filename === "large.py");
    const small = result.files.find((f) => f.filename === "small.py");
    expect(large?.hunks).toContain("too large to diff");
    expect(small?.hunks).not.toContain("too large to diff");
  });
});

// ---------------------------------------------------------------------------
// Edge Case: File rename appears as add + remove
// ---------------------------------------------------------------------------
describe("computeCodeDiff — simulated rename", () => {
  it("rename appears as one removed and one added file", () => {
    const base = { "old_name.py": "content" };
    const target = { "new_name.py": "content" };
    const result = computeCodeDiff("b", "t", base, target);

    expect(result.files).toHaveLength(2);
    const removed = result.files.find((f) => f.status === "removed");
    const added = result.files.find((f) => f.status === "added");
    expect(removed?.filename).toBe("old_name.py");
    expect(added?.filename).toBe("new_name.py");
  });
});

// ---------------------------------------------------------------------------
// Edge Case: Empty file content (not missing key, but empty string)
// ---------------------------------------------------------------------------
describe("computeCodeDiff — empty file content", () => {
  it("file with empty string content shows as modified when content added", () => {
    const base = { "empty.py": "" };
    const target = { "empty.py": "x = 1" };
    const result = computeCodeDiff("b", "t", base, target);

    expect(result.files).toHaveLength(1);
    expect(result.files[0].status).toBe("modified");
  });

  it("both files empty — treated as identical, not modified", () => {
    const base = { "empty.py": "" };
    const target = { "empty.py": "" };
    const result = computeCodeDiff("b", "t", base, target);

    expect(result.files).toHaveLength(0);
  });
});
