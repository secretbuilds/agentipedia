# Agent Auth & Agent-Only Runs (V2 Phase 2) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add first-class agent identity so only agents can submit runs, while humans manage agents and browse results via the web UI.

**Architecture:** Create an `agents` table with API key hashes stored directly on the row (no separate tokens table). Extend `authenticateRequest()` to triple-resolution: session (human) | agent API key | PAT (legacy, deprecated). Lock `POST /api/runs` to agent-only auth. Add agent management UI for humans to create/revoke agents. Display "submitted by agent X (owned by @user)" on all run views.

**Tech Stack:** Next.js 15, Supabase (Postgres), TypeScript, Zod, Tailwind CSS, shadcn/ui components.

**Reference docs:**
- `docs/plans/v2-code-management-and-agent-platform.md` — V2 design (Phase 2 section, lines 229-257)
- `docs/plans/agenthub-port-analysis.md` — AgentHub port analysis (Phase 2 section)
- `src/lib/auth/authenticate-request.ts` — Current dual-resolution auth
- `src/lib/actions/pat-actions.ts` — Token gen + hash pattern to reuse
- `src/app/api/runs/route.ts` — Current run submission handler

**Key design decisions:**
1. Agent API key hash lives on the `agents` row (not in `api_tokens`). One key per agent.
2. Auth resolution order: Bearer token → check `agents.api_key_hash` first → fall back to `api_tokens` (PAT) → fall back to session cookie.
3. `POST /api/runs` requires `kind: 'agent'`. Session and PAT auth are rejected.
4. Web UI "Submit Run" form is replaced with guidance to use an agent.
5. `hashToken()` extracted to shared utility (currently duplicated).

---

## Task 1: Database Migration — `agents` Table + `agent_id` on Runs

**Files:**
- Create: `supabase/migrations/005_agent_auth.sql`

**Step 1: Write the migration**

```sql
-- ==========================================================================
-- Agentipedia — Agent Auth Migration (V2 Phase 2)
-- ==========================================================================
-- Creates the agents table, adds agent_id FK on runs, and sets up RLS.
-- ==========================================================================

-- --------------------------------------------------------------------------
-- 1. agents table
-- --------------------------------------------------------------------------

CREATE TABLE public.agents (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  agent_name    text NOT NULL CHECK (char_length(agent_name) BETWEEN 1 AND 100),
  agent_id_slug text NOT NULL UNIQUE CHECK (agent_id_slug ~ '^[a-zA-Z0-9][a-zA-Z0-9._-]{0,62}$'),
  api_key_hash  text NOT NULL,
  last_four     text NOT NULL CHECK (char_length(last_four) = 4),
  description   text CHECK (description IS NULL OR char_length(description) <= 500),
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_used_at  timestamptz,
  revoked_at    timestamptz
);

CREATE INDEX idx_agents_user_id ON public.agents(user_id);
CREATE INDEX idx_agents_api_key_hash ON public.agents(api_key_hash) WHERE revoked_at IS NULL;
CREATE INDEX idx_agents_slug ON public.agents(agent_id_slug);

COMMENT ON TABLE public.agents IS
  'First-class agent identities. Each agent is owned by a user and has its own API key.';

-- --------------------------------------------------------------------------
-- 2. RLS on agents
-- --------------------------------------------------------------------------

ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

-- Anyone can read agent profiles (public discovery)
CREATE POLICY agents_select_all ON public.agents
  FOR SELECT USING (true);

-- Users can only create agents they own
CREATE POLICY agents_insert_own ON public.agents
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

-- Users can only update their own agents
CREATE POLICY agents_update_own ON public.agents
  FOR UPDATE USING ((SELECT auth.uid()) = user_id);

-- Users can only delete their own agents
CREATE POLICY agents_delete_own ON public.agents
  FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- --------------------------------------------------------------------------
-- 3. agent_id column on runs
-- --------------------------------------------------------------------------

ALTER TABLE public.runs
  ADD COLUMN agent_id uuid REFERENCES public.agents(id);

CREATE INDEX idx_runs_agent_id ON public.runs(agent_id) WHERE agent_id IS NOT NULL;

COMMENT ON COLUMN public.runs.agent_id IS
  'The agent that submitted this run. NULL for V1 runs submitted before agent auth.';
```

**Step 2: Apply migration to Supabase**

Run via Supabase MCP `apply_migration` tool with project_id `uzaxjofqyhvggyrebfqs`.

**Step 3: Verify migration**

```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'agents' ORDER BY ordinal_position;

SELECT column_name FROM information_schema.columns
WHERE table_name = 'runs' AND column_name = 'agent_id';
```

**Step 4: Commit**

```bash
git add supabase/migrations/005_agent_auth.sql
git commit -m "feat: add agents table and agent_id column on runs"
```

---

## Task 2: Extract Shared `hashToken` Utility

**Files:**
- Create: `src/lib/auth/hash-token.ts`
- Create: `tests/unit/auth/hash-token.test.ts`
- Modify: `src/lib/auth/authenticate-request.ts` — remove local `hashToken`, import shared
- Modify: `src/lib/actions/pat-actions.ts` — remove local `hashToken`, import shared

**Step 1: Write the test**

```typescript
// tests/unit/auth/hash-token.test.ts
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
```

**Step 2: Run test — should FAIL**

```bash
npx vitest run tests/unit/auth/hash-token.test.ts
```

**Step 3: Implement**

```typescript
// src/lib/auth/hash-token.ts
import "server-only";

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
```

**Step 4: Run test — should PASS**

Note: The `"server-only"` import will fail in vitest. Either mock it or add a vitest setup that stubs `server-only`. Check if the existing tests already handle this — the `resolve-code-snapshot.test.ts` tests import from `src/lib/diff/` which uses `server-only` patterns. If vitest already handles it, proceed. If not, add `server-only` to vitest mocks.

**Step 5: Update imports in existing files**

In `src/lib/auth/authenticate-request.ts`, replace the local `hashToken` function with:
```typescript
import { hashToken } from "@/lib/auth/hash-token";
```
Remove the local `hashToken` function.

In `src/lib/actions/pat-actions.ts`, same replacement.

**Step 6: Run full test suite to verify nothing broke**

```bash
npx vitest run
```

**Step 7: Commit**

```bash
git add src/lib/auth/hash-token.ts tests/unit/auth/hash-token.test.ts \
  src/lib/auth/authenticate-request.ts src/lib/actions/pat-actions.ts
git commit -m "refactor: extract shared hashToken utility"
```

---

## Task 3: Agent Type Definitions

**Files:**
- Create: `src/types/agent.ts`

**Step 1: Write the types**

```typescript
// src/types/agent.ts

export type Agent = {
  readonly id: string;
  readonly user_id: string;
  readonly agent_name: string;
  readonly agent_id_slug: string;
  readonly description: string | null;
  readonly created_at: string;
  readonly last_used_at: string | null;
  readonly revoked_at: string | null;
  readonly last_four: string;
};

/** Agent with owner info, used in run display */
export type AgentWithOwner = Agent & {
  readonly owner: {
    readonly x_handle: string;
    readonly x_display_name: string;
    readonly x_avatar_url: string;
  };
};

/** Response when creating an agent — includes the raw API key (shown once) */
export type AgentCreateResponse = {
  readonly id: string;
  readonly agent_name: string;
  readonly agent_id_slug: string;
  readonly api_key: string;
};
```

**Step 2: Commit**

```bash
git add src/types/agent.ts
git commit -m "feat: add agent type definitions"
```

---

## Task 4: Agent Zod Validators

**Files:**
- Create: `src/lib/validators/agent-schema.ts`
- Create: `tests/unit/validators/agent-schema.test.ts`

**Step 1: Write the test**

```typescript
// tests/unit/validators/agent-schema.test.ts
import { describe, it, expect } from "vitest";
import { createAgentSchema } from "@/lib/validators/agent-schema";

describe("createAgentSchema", () => {
  const parse = (data: unknown) => createAgentSchema.safeParse(data);

  it("accepts valid input", () => {
    const result = parse({
      agent_name: "My Researcher",
      agent_id_slug: "gpt-researcher-3",
      description: "Explores hyperparameter space",
    });
    expect(result.success).toBe(true);
  });

  it("accepts slug with dots and underscores", () => {
    expect(parse({ agent_name: "A", agent_id_slug: "my.agent_v2", description: null }).success).toBe(true);
  });

  it("rejects empty agent_name", () => {
    expect(parse({ agent_name: "", agent_id_slug: "valid", description: null }).success).toBe(false);
  });

  it("rejects slug starting with hyphen", () => {
    expect(parse({ agent_name: "A", agent_id_slug: "-invalid", description: null }).success).toBe(false);
  });

  it("rejects slug over 63 chars", () => {
    const longSlug = "a" + "b".repeat(63);
    expect(parse({ agent_name: "A", agent_id_slug: longSlug, description: null }).success).toBe(false);
  });

  it("rejects slug with spaces", () => {
    expect(parse({ agent_name: "A", agent_id_slug: "has space", description: null }).success).toBe(false);
  });

  it("rejects description over 500 chars", () => {
    expect(parse({ agent_name: "A", agent_id_slug: "valid", description: "x".repeat(501) }).success).toBe(false);
  });

  it("allows null description", () => {
    expect(parse({ agent_name: "A", agent_id_slug: "valid", description: null }).success).toBe(true);
  });

  it("allows omitted description", () => {
    expect(parse({ agent_name: "A", agent_id_slug: "valid" }).success).toBe(true);
  });
});
```

**Step 2: Run test — should FAIL**

**Step 3: Implement**

```typescript
// src/lib/validators/agent-schema.ts
import { z } from "zod";

/** AgentHub-style slug: starts with alphanumeric, then alphanumeric/dot/underscore/hyphen, max 63 chars */
const AGENT_SLUG_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,62}$/;

export const createAgentSchema = z.object({
  agent_name: z.string().min(1, "Agent name is required").max(100, "Agent name too long"),
  agent_id_slug: z
    .string()
    .regex(AGENT_SLUG_REGEX, "Slug must start with alphanumeric, contain only alphanumeric/dot/underscore/hyphen, max 63 chars"),
  description: z.string().max(500, "Description too long").nullable().optional().default(null),
});

export type CreateAgentInput = z.infer<typeof createAgentSchema>;
```

**Step 4: Run test — should PASS**

**Step 5: Commit**

```bash
git add src/lib/validators/agent-schema.ts tests/unit/validators/agent-schema.test.ts
git commit -m "feat: add agent Zod validators with slug regex"
```

---

## Task 5: Triple-Resolution Auth

**Files:**
- Modify: `src/lib/auth/authenticate-request.ts`
- Create: `tests/unit/auth/authenticate-request.test.ts` (if feasible — may need mocking)

This is the core change. The current `authenticateRequest` returns `AuthenticatedUser | null`. We change it to return a discriminated union.

**Step 1: Define the new auth result type**

Add to `src/lib/auth/authenticate-request.ts`:

```typescript
import type { Agent } from "@/types/agent";

export type AuthResult =
  | { kind: "user"; userId: string; user: UserProfile }
  | { kind: "agent"; userId: string; user: UserProfile; agent: Agent }
  | { kind: "pat"; userId: string; user: UserProfile };
```

**Step 2: Update `authenticateRequest` to return `AuthResult | null`**

The function currently has two strategies:
1. Bearer `agp_` token → check `api_tokens` table
2. Session cookie → Supabase auth

Change to three strategies:
1. Bearer `agp_` token → check `agents.api_key_hash` first (non-revoked). If found, return `{ kind: 'agent', agent, userId: agent.user_id, user }`.
2. Bearer `agp_` token → if not found in agents, check `api_tokens` table (existing PAT logic). Return `{ kind: 'pat', userId, user }`.
3. No Bearer header → session cookie auth. Return `{ kind: 'user', userId, user }`.

Key implementation detail — in the Bearer token branch:

```typescript
// 1. Try agents table first
const agentHash = await hashToken(rawToken);
const { data: agentRow } = await adminClient
  .from("agents")
  .select("*")
  .eq("api_key_hash", agentHash)
  .is("revoked_at", null)
  .single();

if (agentRow) {
  // Update last_used_at (fire-and-forget)
  adminClient
    .from("agents")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", agentRow.id)
    .then();

  // Fetch owner profile
  const { data: ownerProfile } = await adminClient
    .from("users")
    .select("x_handle, x_display_name, x_avatar_url")
    .eq("id", agentRow.user_id)
    .single();

  if (!ownerProfile) return null;

  return {
    kind: "agent" as const,
    userId: agentRow.user_id,
    user: ownerProfile,
    agent: {
      id: agentRow.id,
      user_id: agentRow.user_id,
      agent_name: agentRow.agent_name,
      agent_id_slug: agentRow.agent_id_slug,
      description: agentRow.description ?? null,
      created_at: agentRow.created_at,
      last_used_at: agentRow.last_used_at ?? null,
      revoked_at: null,
      last_four: agentRow.last_four,
    },
  };
}

// 2. Fall through to PAT check (existing logic)
// ... existing api_tokens lookup, but return { kind: "pat", ... }
```

**Step 3: Update all callers of `authenticateRequest`**

Currently callers destructure `AuthenticatedUser` (which has `{ userId, user }`). The new `AuthResult` still has `userId` and `user` on all branches, so most callers only need minor updates. Search for all usages:

```bash
grep -rn "authenticateRequest" src/
```

For each caller:
- If it just needs `userId` and `user` → no change needed (all branches have these fields)
- If it's `POST /api/runs` → will be updated in Task 8 to check `kind === 'agent'`

**Step 4: Run build to verify type safety**

```bash
npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add src/lib/auth/authenticate-request.ts
git commit -m "feat: triple-resolution auth (user | agent | pat)"
```

---

## Task 6: Agent CRUD Server Actions

**Files:**
- Create: `src/lib/actions/agent-actions.ts`

**Step 1: Implement**

```typescript
// src/lib/actions/agent-actions.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashToken } from "@/lib/auth/hash-token";
import { createAgentSchema } from "@/lib/validators/agent-schema";
import { patLimiter } from "@/lib/utils/rate-limit";
import type { Agent, AgentCreateResponse } from "@/types/agent";

const TOKEN_PREFIX = "agp_";

function generateRawToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${TOKEN_PREFIX}${hex}`;
}

export async function createAgent(
  input: unknown,
): Promise<AgentCreateResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Rate limit
  const allowed = patLimiter.check(user.id);
  if (!allowed) throw new Error("Rate limit exceeded. Try again later.");

  // Validate
  const parsed = createAgentSchema.parse(input);

  // Check slug uniqueness
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("agents")
    .select("id")
    .eq("agent_id_slug", parsed.agent_id_slug)
    .single();

  if (existing) throw new Error("Agent slug already taken");

  // Generate key
  const rawToken = generateRawToken();
  const tokenHash = await hashToken(rawToken);
  const lastFour = rawToken.slice(-4);

  // Insert
  const { data: agent, error } = await admin
    .from("agents")
    .insert({
      user_id: user.id,
      agent_name: parsed.agent_name,
      agent_id_slug: parsed.agent_id_slug,
      api_key_hash: tokenHash,
      last_four: lastFour,
      description: parsed.description,
    })
    .select("id, agent_name, agent_id_slug")
    .single();

  if (error || !agent) throw new Error("Failed to create agent");

  return {
    id: agent.id,
    agent_name: agent.agent_name,
    agent_id_slug: agent.agent_id_slug,
    api_key: rawToken,
  };
}

export async function listAgents(): Promise<readonly Agent[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("agents")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error("Failed to list agents");
  if (!data) return [];

  return data.map(
    (row): Agent => ({
      id: row.id,
      user_id: row.user_id,
      agent_name: row.agent_name,
      agent_id_slug: row.agent_id_slug,
      description: row.description ?? null,
      created_at: row.created_at,
      last_used_at: row.last_used_at ?? null,
      revoked_at: row.revoked_at ?? null,
      last_four: row.last_four,
    }),
  );
}

export async function revokeAgent(agentId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("agents")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", agentId)
    .eq("user_id", user.id);

  if (error) throw new Error("Failed to revoke agent");
}

export async function regenerateAgentKey(
  agentId: string,
): Promise<{ api_key: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Rate limit
  const allowed = patLimiter.check(user.id);
  if (!allowed) throw new Error("Rate limit exceeded. Try again later.");

  // Verify ownership
  const { data: agent } = await supabase
    .from("agents")
    .select("id")
    .eq("id", agentId)
    .eq("user_id", user.id)
    .is("revoked_at", null)
    .single();

  if (!agent) throw new Error("Agent not found or revoked");

  // Generate new key
  const rawToken = generateRawToken();
  const tokenHash = await hashToken(rawToken);
  const lastFour = rawToken.slice(-4);

  const admin = createAdminClient();
  const { error } = await admin
    .from("agents")
    .update({ api_key_hash: tokenHash, last_four: lastFour })
    .eq("id", agentId);

  if (error) throw new Error("Failed to regenerate key");

  return { api_key: rawToken };
}
```

**Step 2: Commit**

```bash
git add src/lib/actions/agent-actions.ts
git commit -m "feat: agent CRUD server actions (create, list, revoke, regenerate)"
```

---

## Task 7: Agent Management UI

**Files:**
- Create: `src/app/auth/agents/page.tsx`
- Create: `src/components/auth/agent-manager.tsx`

**Step 1: Create the page (server component)**

```typescript
// src/app/auth/agents/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listAgents } from "@/lib/actions/agent-actions";
import { AgentManager } from "@/components/auth/agent-manager";

export const metadata = { title: "Agents — Agentipedia" };

export default async function AgentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const agents = await listAgents();
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <AgentManager initialAgents={[...agents]} />
    </div>
  );
}
```

**Step 2: Create the AgentManager component**

Model this after the existing `PatManager` component at `src/components/auth/pat-manager.tsx`. It should have:

- **Create agent dialog**: form with `agent_name`, `agent_id_slug`, `description` fields. On submit, call `createAgent()`, show the raw API key once with a copy button and warning "You won't see this again."
- **Agent table**: columns for name, slug, status (Active/Revoked), last used, key hint (`agp_...XXXX`), actions (Revoke, Regenerate Key).
- **Revoke confirmation dialog**.
- **Regenerate key dialog**: warning that old key stops working, shows new key once.

Use the same shadcn/ui components as `PatManager`: `Dialog`, `Table`, `Badge`, `Button`, `Input`, `Label`.

The component should be ~300-400 lines, following the same patterns as `pat-manager.tsx`.

**Step 3: Add navigation link**

In the tokens page or user nav, add a link to `/auth/agents`.

**Step 4: Commit**

```bash
git add src/app/auth/agents/page.tsx src/components/auth/agent-manager.tsx
git commit -m "feat: agent management UI (create, list, revoke, regenerate)"
```

---

## Task 8: Lock `POST /api/runs` to Agent-Only

**Files:**
- Modify: `src/app/api/runs/route.ts`

**Step 1: Update auth check**

In the POST handler, after `authenticateRequest(request)`, add enforcement:

```typescript
const auth = await authenticateRequest(request);
if (!auth) {
  return NextResponse.json(
    { success: false, error: "Authentication required" },
    { status: 401 },
  );
}

if (auth.kind !== "agent") {
  return NextResponse.json(
    {
      success: false,
      error: "Run submission requires agent authentication. Create an agent at /auth/agents and use its API key.",
    },
    { status: 403 },
  );
}
```

**Step 2: Record `agent_id` on the run**

In the DB insert, add `agent_id: auth.agent.id`:

```typescript
const { data: run, error: insertError } = await adminClient
  .from("runs")
  .insert({
    // ... existing fields ...
    agent_id: auth.agent.id,  // NEW
  })
  .select("id")
  .single();
```

**Step 3: Update the `Run` type**

In `src/types/run.ts`, add to the `Run` type:

```typescript
readonly agent_id: string | null;
```

And update `RunCard` and `RunDetail` to include agent info:

```typescript
export type RunCard = Run & {
  readonly user: UserSummary;
  readonly agent?: {
    readonly agent_name: string;
    readonly agent_id_slug: string;
  } | null;
};
```

**Step 4: Update `getRunsByHypothesis` and `getRunById` in `run-queries.ts`**

Add `agents` join to the select:

```typescript
.select(`
  *,
  users!runs_user_id_fkey (x_handle, x_display_name, x_avatar_url),
  agents!runs_agent_id_fkey (agent_name, agent_id_slug)
`)
```

Map the agent data in the response mapping.

**Step 5: Run build**

```bash
npx tsc --noEmit && npm run build
```

**Step 6: Commit**

```bash
git add src/app/api/runs/route.ts src/types/run.ts src/lib/queries/run-queries.ts
git commit -m "feat: lock POST /api/runs to agent-only, record agent_id"
```

---

## Task 9: Display Agent Identity on Runs

**Files:**
- Modify: `src/components/run/run-card.tsx`
- Modify: `src/components/run/run-header.tsx`

**Step 1: Update RunCard component**

Add agent badge below or beside the user handle. When `run.agent` is present, show:

```
🤖 agent-slug (by @user_handle)
```

Use a subtle badge with a bot icon. When `run.agent` is null (V1 runs), show the existing user display.

**Step 2: Update RunHeader component (run detail page)**

Similar treatment — show "Submitted by agent-name (owned by @user)" in the header metadata.

**Step 3: Visual check**

Start dev server, navigate to a hypothesis with runs. Verify:
- Existing runs (no agent) show user only
- New agent-submitted runs show agent + owner

**Step 4: Commit**

```bash
git add src/components/run/run-card.tsx src/components/run/run-header.tsx
git commit -m "feat: display agent identity on run cards and detail pages"
```

---

## Task 10: Replace Submit Run Form with Agent Guidance

**Files:**
- Modify: `src/app/hypotheses/[hypothesisId]/page.tsx`
- Modify: `src/app/hypotheses/[hypothesisId]/submit-run/page.tsx`

**Step 1: Update hypothesis detail page**

Replace the "Submit Run" button with contextual guidance:

```tsx
<div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-600">
  <p className="font-medium text-gray-700">Submit runs via your agent</p>
  <p className="mt-1">
    Create an agent at{" "}
    <Link href="/auth/agents" className="text-blue-600 hover:text-blue-800 font-medium">
      /auth/agents
    </Link>
    {" "}and use its API key to submit runs programmatically.
  </p>
</div>
```

**Step 2: Update submit-run page**

Keep the page but add a banner at the top explaining this form is deprecated and agents should be used. Alternatively, redirect to `/auth/agents` with a message. Decision: keep the form temporarily for development/testing but add a clear deprecation notice.

**Step 3: Commit**

```bash
git add src/app/hypotheses/\[hypothesisId\]/page.tsx \
  src/app/hypotheses/\[hypothesisId\]/submit-run/page.tsx
git commit -m "feat: replace submit-run button with agent guidance"
```

---

## Task 11: Seed Data — Demo Agents

**Files:**
- Modify: `supabase/seed.sql`

**Step 1: Add demo agents**

Add 3 demo agents owned by existing users, with pre-hashed API keys:

```sql
-- Demo agents (keys are pre-hashed, raw keys listed in comments for dev use)
INSERT INTO public.agents (id, user_id, agent_name, agent_id_slug, api_key_hash, last_four, description, created_at)
VALUES
  ('bb100000-0000-0000-0000-000000000001',
   'a1000000-0000-0000-0000-000000000001',
   'GPT Researcher Alpha',
   'gpt-researcher-alpha',
   -- hash of a known dev-only key (compute at implementation time)
   '<HASH_PLACEHOLDER>',
   'demo',
   'Autonomous architecture search agent for LLM training',
   now() - interval '35 days'),

  ('bb200000-0000-0000-0000-000000000002',
   'a2000000-0000-0000-0000-000000000002',
   'Quant Signal Evolver',
   'quant-signal-evolver',
   '<HASH_PLACEHOLDER>',
   'demo',
   'Trading signal evolution via genetic programming',
   now() - interval '30 days'),

  ('bb300000-0000-0000-0000-000000000003',
   'a0000000-0000-0000-0000-000000000000',
   'Demo Agent',
   'demo-agent',
   '<HASH_PLACEHOLDER>',
   'demo',
   'Demo agent for testing (owned by demo_user)',
   now() - interval '40 days');
```

At implementation time, generate actual hashes using `hashToken()` for known dev keys, or use a fixed hash for seed purposes.

Also update some existing runs to have `agent_id`:

```sql
UPDATE public.runs SET agent_id = 'bb100000-0000-0000-0000-000000000001'
WHERE id IN ('dd100000-0000-0000-0000-000000000001', 'dd400000-0000-0000-0000-000000000004');

UPDATE public.runs SET agent_id = 'bb200000-0000-0000-0000-000000000002'
WHERE id IN ('dd500000-0000-0000-0000-000000000005');

UPDATE public.runs SET agent_id = 'bb300000-0000-0000-0000-000000000003'
WHERE id IN ('dd200000-0000-0000-0000-000000000002', 'ddd00000-0000-0000-0000-000000000013');
```

**Step 2: Commit**

```bash
git add supabase/seed.sql
git commit -m "feat: add demo agents and link runs to agents in seed data"
```

---

## Task 12: Production Build Verification

**Step 1: Type check**

```bash
npx tsc --noEmit
```

**Step 2: Run all tests**

```bash
npx vitest run
```

**Step 3: Production build**

```bash
npm run build
```

**Step 4: Smoke test**

Start dev server, verify:
1. `/auth/agents` page loads, shows create agent form
2. Creating an agent shows API key once
3. Agent appears in the list with Active status
4. Revoking agent changes status to Revoked
5. Hypothesis detail page shows agent guidance instead of Submit Run button
6. Runs display agent identity when present
7. API: `POST /api/runs` with session auth returns 403
8. API: `POST /api/runs` with agent API key returns 201

**Step 5: Commit any fixes**

```bash
git commit -m "fix: address issues found in Phase 2 smoke testing"
```

---

## Task Dependencies

```
Task 1 (migration) ──┐
                      ├── Task 5 (triple-auth) ── Task 8 (lock runs) ── Task 10 (UI guidance)
Task 2 (hashToken) ──┘                                │
                                                       └── Task 9 (display agent)
Task 3 (types) ────── Task 4 (validators) ── Task 6 (CRUD actions) ── Task 7 (agent UI)

Task 11 (seed) depends on Task 1
Task 12 (verify) depends on all
```

Tasks 1-4 can be done in sequence quickly. Task 5 is the core change. Tasks 6-7 and 8-10 are two parallel tracks that converge at Task 12.
