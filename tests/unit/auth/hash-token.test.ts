import { describe, it, expect } from "vitest";
import { hashToken } from "@/lib/auth/hash-token";

describe("hashToken", () => {
  it("returns a 64-char hex string", async () => {
    const hash = await hashToken("agp_test123");
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("is deterministic", async () => {
    const h1 = await hashToken("agp_abc");
    const h2 = await hashToken("agp_abc");
    expect(h1).toBe(h2);
  });

  it("different inputs produce different hashes", async () => {
    const h1 = await hashToken("agp_abc");
    const h2 = await hashToken("agp_xyz");
    expect(h1).not.toBe(h2);
  });
});
