"use client";

import { useState, useTransition } from "react";
import { createPat, revokePat } from "@/lib/actions/pat-actions";
import { TimeAgo } from "@/components/shared/time-ago";

type Token = {
  id: string;
  name: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

type PatManagerProps = {
  tokens: Token[];
};

export function PatManager({ tokens }: PatManagerProps) {
  const [name, setName] = useState("");
  const [newToken, setNewToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  function handleCreate() {
    if (!name.trim()) return;
    setError(null);
    setNewToken(null);

    startTransition(async () => {
      const result = await createPat(name.trim());
      if (result.success && result.token) {
        setNewToken(result.token);
        setName("");
      } else {
        setError(result.message ?? "Failed to create token");
      }
    });
  }

  function handleRevoke(tokenId: string) {
    startTransition(async () => {
      const result = await revokePat(tokenId);
      if (!result.success) {
        setError(result.message ?? "Failed to revoke token");
      }
    });
  }

  async function handleCopy() {
    if (!newToken) return;
    await navigator.clipboard.writeText(newToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const activeTokens = tokens.filter((t) => !t.revoked_at);
  const revokedTokens = tokens.filter((t) => t.revoked_at);

  return (
    <div className="space-y-6">
      {/* Create form */}
      <div className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Token name (e.g., my-agent)"
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
        />
        <button
          onClick={handleCreate}
          disabled={isPending || !name.trim()}
          className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-gray-200 disabled:opacity-50"
        >
          Create
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}

      {newToken && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4">
          <p className="text-sm font-medium text-green-400">
            Token created! Copy it now — it won&apos;t be shown again.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 break-all rounded bg-muted px-3 py-2 font-mono text-xs">
              {newToken}
            </code>
            <button
              onClick={handleCopy}
              className="rounded border border-border px-3 py-2 text-xs transition-colors hover:bg-muted"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      )}

      {/* Active tokens */}
      {activeTokens.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Active tokens</h3>
          {activeTokens.map((token) => (
            <div
              key={token.id}
              className="flex items-center justify-between rounded-lg border border-border p-3"
            >
              <div>
                <p className="text-sm font-medium">{token.name}</p>
                <p className="text-xs text-muted-foreground">
                  Created <TimeAgo date={token.created_at} />
                  {token.last_used_at && (
                    <>
                      {" "}&middot; Last used <TimeAgo date={token.last_used_at} />
                    </>
                  )}
                </p>
              </div>
              <button
                onClick={() => handleRevoke(token.id)}
                disabled={isPending}
                className="rounded border border-red-500/30 px-3 py-1 text-xs text-red-400 transition-colors hover:bg-red-500/10"
              >
                Revoke
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Revoked tokens */}
      {revokedTokens.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            Revoked tokens
          </h3>
          {revokedTokens.map((token) => (
            <div
              key={token.id}
              className="flex items-center justify-between rounded-lg border border-border p-3 opacity-50"
            >
              <div>
                <p className="text-sm font-medium line-through">{token.name}</p>
                <p className="text-xs text-muted-foreground">
                  Revoked <TimeAgo date={token.revoked_at!} />
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
