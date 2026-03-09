"use client";

import { useState, useCallback } from "react";
import { Copy, Check, Plus, Trash2, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { createPat, revokePat } from "@/lib/actions/pat-actions";
import type { PersonalAccessToken } from "@/types/pat";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type PatManagerProps = {
  readonly initialTokens: readonly PersonalAccessToken[];
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PatManager({ initialTokens }: PatManagerProps) {
  const [tokens, setTokens] = useState<readonly PersonalAccessToken[]>(initialTokens);
  const [tokenName, setTokenName] = useState("");
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [revokeTargetId, setRevokeTargetId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---- Create handler ----
  const handleCreate = useCallback(async () => {
    if (!tokenName.trim()) return;

    setIsCreating(true);
    setError(null);

    const result = await createPat(tokenName.trim());

    if (!result.success) {
      setError(result.error);
      setIsCreating(false);
      return;
    }

    setCreatedToken(result.data.token);
    setCopied(false);

    // Add new token to local state (immutable)
    const newToken: PersonalAccessToken = {
      id: result.data.id,
      user_id: "",
      name: result.data.name,
      created_at: new Date().toISOString(),
      last_used_at: null,
      revoked_at: null,
      last_four: result.data.token.slice(-4),
    };
    setTokens((prev) => [newToken, ...prev]);
    setIsCreating(false);
  }, [tokenName]);

  // ---- Copy handler ----
  const handleCopy = useCallback(async () => {
    if (!createdToken) return;
    await navigator.clipboard.writeText(createdToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [createdToken]);

  // ---- Revoke handler ----
  const handleRevoke = useCallback(async () => {
    if (!revokeTargetId) return;

    setIsRevoking(true);
    setError(null);

    const result = await revokePat(revokeTargetId);

    if (!result.success) {
      setError(result.error);
      setIsRevoking(false);
      return;
    }

    // Update local state (immutable)
    setTokens((prev) =>
      prev.map((t) =>
        t.id === revokeTargetId
          ? { ...t, revoked_at: new Date().toISOString() }
          : t,
      ),
    );
    setRevokeDialogOpen(false);
    setRevokeTargetId(null);
    setIsRevoking(false);
  }, [revokeTargetId]);

  // ---- Reset create dialog on close ----
  const handleCreateDialogOpenChange = useCallback((open: boolean) => {
    setCreateDialogOpen(open);
    if (!open) {
      setTokenName("");
      setCreatedToken(null);
      setCopied(false);
      setError(null);
    }
  }, []);

  // ---- Reset revoke dialog on close ----
  const handleRevokeDialogOpenChange = useCallback((open: boolean) => {
    setRevokeDialogOpen(open);
    if (!open) {
      setRevokeTargetId(null);
      setError(null);
    }
  }, []);

  const revokeTargetName = revokeTargetId
    ? tokens.find((t) => t.id === revokeTargetId)?.name ?? "this token"
    : "this token";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Key className="size-5" />
            API Tokens
          </CardTitle>

          {/* ---- Create Token Dialog ---- */}
          <Dialog open={createDialogOpen} onOpenChange={handleCreateDialogOpenChange}>
            <DialogTrigger
              render={<Button size="sm" />}
              onClick={() => handleCreateDialogOpenChange(true)}
            >
              <Plus className="size-4" />
              Create Token
            </DialogTrigger>
            <DialogContent>
              {!createdToken ? (
                <>
                  <DialogHeader>
                    <DialogTitle>Create API Token</DialogTitle>
                    <DialogDescription>
                      Give your token a descriptive name so you can identify it later.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                    <Input
                      placeholder="Token name (e.g., my-agent)"
                      value={tokenName}
                      onChange={(e) => setTokenName(e.target.value)}
                      maxLength={100}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && tokenName.trim()) {
                          handleCreate();
                        }
                      }}
                    />
                    {error && (
                      <p className="text-sm text-destructive">{error}</p>
                    )}
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={handleCreate}
                      disabled={!tokenName.trim() || isCreating}
                    >
                      {isCreating ? "Creating..." : "Create Token"}
                    </Button>
                  </DialogFooter>
                </>
              ) : (
                <>
                  <DialogHeader>
                    <DialogTitle>Token Created</DialogTitle>
                    <DialogDescription>
                      Copy your token now. This token will not be shown again.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <code className="flex-1 overflow-x-auto rounded-md bg-muted px-3 py-2 font-mono text-xs">
                        {createdToken}
                      </code>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleCopy}
                      >
                        {copied ? (
                          <Check className="size-4 text-green-500" />
                        ) : (
                          <Copy className="size-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-amber-400">
                      Make sure to copy your token. You will not be able to see it again.
                    </p>
                  </div>
                  <DialogFooter>
                    <DialogClose
                      render={<Button variant="secondary" />}
                    >
                      Done
                    </DialogClose>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {error && !createDialogOpen && !revokeDialogOpen && (
          <p className="mb-4 text-sm text-destructive">{error}</p>
        )}

        {tokens.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No API tokens yet. Create one to get started.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Token</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last Used</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tokens.map((token) => {
                const isRevoked = token.revoked_at !== null;
                return (
                  <TableRow key={token.id}>
                    <TableCell className="font-medium">
                      {token.name}
                    </TableCell>
                    <TableCell>
                      <code className="font-mono text-xs text-muted-foreground">
                        agp_...{token.last_four}
                      </code>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(token.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {token.last_used_at
                        ? new Date(token.last_used_at).toLocaleDateString()
                        : "Never"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={isRevoked ? "destructive" : "secondary"}
                        className={cn(
                          !isRevoked && "bg-green-900/40 text-green-400",
                        )}
                      >
                        {isRevoked ? "Revoked" : "Active"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {!isRevoked && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => {
                            setRevokeTargetId(token.id);
                            setRevokeDialogOpen(true);
                          }}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {/* ---- Revoke Confirmation Dialog ---- */}
        <Dialog open={revokeDialogOpen} onOpenChange={handleRevokeDialogOpenChange}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Revoke Token</DialogTitle>
              <DialogDescription>
                Are you sure you want to revoke &ldquo;{revokeTargetName}&rdquo;?
                Any agents using this token will lose access immediately. This action
                cannot be undone.
              </DialogDescription>
            </DialogHeader>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>
                Cancel
              </DialogClose>
              <Button
                variant="destructive"
                onClick={handleRevoke}
                disabled={isRevoking}
              >
                {isRevoking ? "Revoking..." : "Revoke Token"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
