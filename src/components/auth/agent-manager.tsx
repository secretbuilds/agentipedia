"use client";

import { useState, useCallback } from "react";
import { Copy, Check, Plus, Trash2, Bot, RefreshCw } from "lucide-react";
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
import {
  createAgent,
  revokeAgent,
  regenerateAgentKey,
} from "@/lib/actions/agent-actions";
import type { Agent } from "@/types/agent";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type AgentManagerProps = {
  readonly initialAgents: readonly Agent[];
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AgentManager({ initialAgents }: AgentManagerProps) {
  const [agents, setAgents] = useState<readonly Agent[]>(initialAgents);

  // ---- Create form state ----
  const [agentName, setAgentName] = useState("");
  const [agentSlug, setAgentSlug] = useState("");
  const [agentDescription, setAgentDescription] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // ---- Revoke state ----
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [revokeTargetId, setRevokeTargetId] = useState<string | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);

  // ---- Regenerate state ----
  const [regenDialogOpen, setRegenDialogOpen] = useState(false);
  const [regenTargetId, setRegenTargetId] = useState<string | null>(null);
  const [regenKey, setRegenKey] = useState<string | null>(null);
  const [regenCopied, setRegenCopied] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // ---- Shared error state ----
  const [error, setError] = useState<string | null>(null);

  // ---- Create handler ----
  const handleCreate = useCallback(async () => {
    if (!agentName.trim() || !agentSlug.trim()) return;

    setIsCreating(true);
    setError(null);

    const result = await createAgent({
      agent_name: agentName.trim(),
      agent_id_slug: agentSlug.trim(),
      description: agentDescription.trim() || undefined,
    });

    if (!result.success) {
      setError(result.error);
      setIsCreating(false);
      return;
    }

    setCreatedKey(result.data.api_key);
    setCopied(false);

    // Add new agent to local state (immutable)
    const newAgent: Agent = {
      id: result.data.id,
      user_id: "",
      agent_name: result.data.agent_name,
      agent_id_slug: result.data.agent_id_slug,
      description: agentDescription.trim() || null,
      created_at: new Date().toISOString(),
      last_used_at: null,
      revoked_at: null,
      last_four: result.data.api_key.slice(-4),
    };
    setAgents((prev) => [newAgent, ...prev]);
    setIsCreating(false);
  }, [agentName, agentSlug, agentDescription]);

  // ---- Copy handler (create dialog) ----
  const handleCopy = useCallback(async () => {
    if (!createdKey) return;
    await navigator.clipboard.writeText(createdKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [createdKey]);

  // ---- Copy handler (regenerate dialog) ----
  const handleRegenCopy = useCallback(async () => {
    if (!regenKey) return;
    await navigator.clipboard.writeText(regenKey);
    setRegenCopied(true);
    setTimeout(() => setRegenCopied(false), 2000);
  }, [regenKey]);

  // ---- Revoke handler ----
  const handleRevoke = useCallback(async () => {
    if (!revokeTargetId) return;

    setIsRevoking(true);
    setError(null);

    const result = await revokeAgent(revokeTargetId);

    if (!result.success) {
      setError(result.error);
      setIsRevoking(false);
      return;
    }

    // Update local state (immutable)
    setAgents((prev) =>
      prev.map((a) =>
        a.id === revokeTargetId
          ? { ...a, revoked_at: new Date().toISOString() }
          : a,
      ),
    );
    setRevokeDialogOpen(false);
    setRevokeTargetId(null);
    setIsRevoking(false);
  }, [revokeTargetId]);

  // ---- Regenerate handler ----
  const handleRegenerate = useCallback(async () => {
    if (!regenTargetId) return;

    setIsRegenerating(true);
    setError(null);

    const result = await regenerateAgentKey(regenTargetId);

    if (!result.success) {
      setError(result.error);
      setIsRegenerating(false);
      return;
    }

    setRegenKey(result.data.api_key);
    setRegenCopied(false);

    // Update last_four in local state (immutable)
    const newLastFour = result.data.api_key.slice(-4);
    setAgents((prev) =>
      prev.map((a) =>
        a.id === regenTargetId ? { ...a, last_four: newLastFour } : a,
      ),
    );
    setIsRegenerating(false);
  }, [regenTargetId]);

  // ---- Reset create dialog on close ----
  const handleCreateDialogOpenChange = useCallback((open: boolean) => {
    setCreateDialogOpen(open);
    if (!open) {
      setAgentName("");
      setAgentSlug("");
      setAgentDescription("");
      setCreatedKey(null);
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

  // ---- Reset regenerate dialog on close ----
  const handleRegenDialogOpenChange = useCallback((open: boolean) => {
    setRegenDialogOpen(open);
    if (!open) {
      setRegenTargetId(null);
      setRegenKey(null);
      setRegenCopied(false);
      setError(null);
    }
  }, []);

  const revokeTargetName = revokeTargetId
    ? agents.find((a) => a.id === revokeTargetId)?.agent_name ?? "this agent"
    : "this agent";

  const regenTargetName = regenTargetId
    ? agents.find((a) => a.id === regenTargetId)?.agent_name ?? "this agent"
    : "this agent";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bot className="size-5" />
            Agents
          </CardTitle>

          {/* ---- Create Agent Dialog ---- */}
          <Dialog open={createDialogOpen} onOpenChange={handleCreateDialogOpenChange}>
            <DialogTrigger
              render={<Button size="sm" />}
              onClick={() => handleCreateDialogOpenChange(true)}
            >
              <Plus className="size-4" />
              Create Agent
            </DialogTrigger>
            <DialogContent>
              {!createdKey ? (
                <>
                  <DialogHeader>
                    <DialogTitle>Create Agent</DialogTitle>
                    <DialogDescription>
                      Register a new AI agent. An API key will be generated for it to
                      submit experiment runs.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                    <Input
                      placeholder="Agent name (e.g., My GPT-4 Agent)"
                      value={agentName}
                      onChange={(e) => setAgentName(e.target.value)}
                      maxLength={100}
                    />
                    <Input
                      placeholder="Slug (e.g., my-gpt4-agent)"
                      value={agentSlug}
                      onChange={(e) => setAgentSlug(e.target.value)}
                      maxLength={100}
                      onKeyDown={(e) => {
                        if (
                          e.key === "Enter" &&
                          agentName.trim() &&
                          agentSlug.trim()
                        ) {
                          handleCreate();
                        }
                      }}
                    />
                    <Input
                      placeholder="Description (optional)"
                      value={agentDescription}
                      onChange={(e) => setAgentDescription(e.target.value)}
                      maxLength={500}
                    />
                    {error && (
                      <p className="text-sm text-destructive">{error}</p>
                    )}
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={handleCreate}
                      disabled={!agentName.trim() || !agentSlug.trim() || isCreating}
                    >
                      {isCreating ? "Creating..." : "Create Agent"}
                    </Button>
                  </DialogFooter>
                </>
              ) : (
                <>
                  <DialogHeader>
                    <DialogTitle>Agent Created</DialogTitle>
                    <DialogDescription>
                      Copy your API key now. This key will not be shown again.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <code className="flex-1 overflow-x-auto rounded-md bg-muted px-3 py-2 font-mono text-xs">
                        {createdKey}
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
                    <p className="text-xs text-amber-600">
                      Make sure to copy your API key. You will not be able to see it
                      again.
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
        {error && !createDialogOpen && !revokeDialogOpen && !regenDialogOpen && (
          <p className="mb-4 text-sm text-destructive">{error}</p>
        )}

        {agents.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No agents yet. Create one to get started.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Token</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last Used</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agents.map((agent) => {
                const isRevoked = agent.revoked_at !== null;
                return (
                  <TableRow key={agent.id}>
                    <TableCell className="font-medium">
                      {agent.agent_name}
                    </TableCell>
                    <TableCell>
                      <code className="font-mono text-xs text-muted-foreground">
                        {agent.agent_id_slug}
                      </code>
                    </TableCell>
                    <TableCell>
                      <code className="font-mono text-xs text-muted-foreground">
                        agp_...{agent.last_four}
                      </code>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(agent.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {agent.last_used_at
                        ? new Date(agent.last_used_at).toLocaleDateString()
                        : "Never"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={isRevoked ? "destructive" : "secondary"}
                        className={cn(
                          !isRevoked && "bg-emerald-50 text-emerald-600",
                        )}
                      >
                        {isRevoked ? "Revoked" : "Active"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {!isRevoked && (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => {
                              setRegenTargetId(agent.id);
                              setRegenDialogOpen(true);
                            }}
                          >
                            <RefreshCw className="size-4 text-muted-foreground" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => {
                              setRevokeTargetId(agent.id);
                              setRevokeDialogOpen(true);
                            }}
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </div>
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
              <DialogTitle>Revoke Agent</DialogTitle>
              <DialogDescription>
                Are you sure you want to revoke &ldquo;{revokeTargetName}&rdquo;?
                Any systems using this agent&apos;s API key will lose access
                immediately. This action cannot be undone.
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
                {isRevoking ? "Revoking..." : "Revoke Agent"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ---- Regenerate Key Dialog ---- */}
        <Dialog open={regenDialogOpen} onOpenChange={handleRegenDialogOpenChange}>
          <DialogContent>
            {!regenKey ? (
              <>
                <DialogHeader>
                  <DialogTitle>Regenerate API Key</DialogTitle>
                  <DialogDescription>
                    This will invalidate the current key for
                    &ldquo;{regenTargetName}&rdquo;. Any systems using the old key
                    will lose access immediately.
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
                    onClick={handleRegenerate}
                    disabled={isRegenerating}
                  >
                    {isRegenerating ? "Regenerating..." : "Regenerate Key"}
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle>New API Key</DialogTitle>
                  <DialogDescription>
                    Copy your new API key now. This key will not be shown again.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <code className="flex-1 overflow-x-auto rounded-md bg-muted px-3 py-2 font-mono text-xs">
                      {regenKey}
                    </code>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleRegenCopy}
                    >
                      {regenCopied ? (
                        <Check className="size-4 text-green-500" />
                      ) : (
                        <Copy className="size-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-amber-600">
                    Make sure to copy your API key. You will not be able to see it
                    again.
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
      </CardContent>
    </Card>
  );
}
