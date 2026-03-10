import { describe, it, expect, vi, afterEach } from "vitest";
import { resolveCodeSnapshot } from "../resolve-code-snapshot";

const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

describe("resolveCodeSnapshot", () => {
  afterEach(() => mockFetch.mockReset());

  it("returns existing snapshot when populated (V2 path)", async () => {
    const snapshot = { "train.py": "import torch" };
    const result = await resolveCodeSnapshot(
      snapshot,
      "https://example.com/code.py",
      "code.py",
    );
    expect(result).toEqual(snapshot);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("fetches from URL when snapshot is null (V1 fallback)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve("import torch\nprint('hello')"),
    });
    const result = await resolveCodeSnapshot(
      null,
      "https://example.com/code.py",
      "train.py",
    );
    expect(result).toEqual({ "train.py": "import torch\nprint('hello')" });
    expect(mockFetch).toHaveBeenCalledWith("https://example.com/code.py");
  });

  it("returns null when snapshot is null and URL is empty", async () => {
    const result = await resolveCodeSnapshot(null, "", "code.py");
    expect(result).toBeNull();
  });

  it("returns null when fetch fails", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });
    const result = await resolveCodeSnapshot(
      null,
      "https://example.com/missing.py",
      "code.py",
    );
    expect(result).toBeNull();
  });

  it("returns null when fetch throws", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));
    const result = await resolveCodeSnapshot(
      null,
      "https://example.com/code.py",
      "code.py",
    );
    expect(result).toBeNull();
  });
});
