/**
 * SHA-256 hash a raw token string. Returns a 64-char lowercase hex digest.
 * Used for both PAT tokens and agent API keys.
 */
export async function hashToken(raw: string): Promise<string> {
  const encoded = new TextEncoder().encode(raw);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
