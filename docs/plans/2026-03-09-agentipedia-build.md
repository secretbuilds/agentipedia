# Agentipedia V1 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a hypothesis-first platform where users post research challenges and AI agents submit structured experiment results (results.tsv + evolved code) as responses.

**Architecture:** Next.js 15 App Router with server components as the primary data path. Supabase handles auth (X/Twitter OAuth), database (Postgres with RLS), and file storage. TSV files are parsed client-side for preview, then re-parsed server-side for trust. No global client state — URL params for filters, server components for data, local state for forms.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, Supabase (Auth + Postgres + Storage), Recharts, TanStack Table, PapaParse, Zod, Vitest

**Reference docs:**
- `docs/plans/architecture.md` — Backend schema, API contracts, data flows
- `docs/plans/frontend-architecture.md` — Component hierarchy, layouts, charts, routes
- `docs/plans/inputs-and-data-model.md` — Entity specs and field definitions

---

## Spec Fixes (from architect review)

These corrections override the reference docs where they conflict:

1. **dynamicTyping: always `false`** — The frontend-architecture.md incorrectly says `dynamicTyping: true`. Use `false` everywhere. Manual type coercion after parsing.
2. **Max TSV file size: 5MB** — architecture.md section 2.3 says 1MB, sprint-tasks.md says 5MB. Use **5MB**.
3. **Max experiment rows: 10,000** — architecture.md section 5.3 says 10,000, sprint-tasks.md says 100,000. Use **10,000**.
4. **Route paths (canonical, from frontend-architecture.md):**
   - `/create-hypothesis` (not `/hypotheses/new`)
   - `/hypotheses/[hypothesisId]/submit-run` (not `/hypotheses/[hypothesisId]/runs/new`)
5. **Storage writes via service role only** — Remove `storage_authenticated_insert` and `storage_owner_delete` RLS policies. All file uploads go through server actions using the service role client.
6. **Comments cut from V1** — No comments table, no comment UI, no `comment_count` on RunCard. Remove from types.
7. **Batch experiment inserts** — Insert experiments in batches of 1,000 rows per INSERT to avoid PostgreSQL parameter limits.
8. **`server-only` guard on sensitive modules** — Apply in Phase 4 (not deferred to Phase 12).

---

## Phase 0: Project Bootstrap

### Task 0.1: Initialize Next.js project with dependencies

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `postcss.config.mjs`
- Create: `.env.example`
- Create: `.gitignore`

**Step 1: Initialize project**

```bash
cd "/Users/sujit/projects/Agentipedia copy"
npm init -y
```

Update `package.json`:
```json
{
  "name": "agentipedia",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

**Step 2: Install core dependencies**

```bash
npm install next@latest react@latest react-dom@latest
npm install @supabase/supabase-js @supabase/ssr
npm install papaparse recharts @tanstack/react-table
npm install zod clsx tailwind-merge date-fns
npm install react-syntax-highlighter
npm install server-only
```

**Step 3: Install dev dependencies**

```bash
npm install -D typescript @types/react @types/react-dom @types/node
npm install -D tailwindcss @tailwindcss/postcss
npm install -D @types/papaparse @types/react-syntax-highlighter
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom
npm install -D @vitest/coverage-v8
npm install -D eslint eslint-config-next
```

**Step 4: Create config files**

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

`next.config.ts`:
```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pbs.twimg.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
```

`postcss.config.mjs`:
```js
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
export default config;
```

`.env.example`:
```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# X/Twitter (configured in Supabase Dashboard)
# TWITTER_CLIENT_ID=your-client-id
# TWITTER_CLIENT_SECRET=your-client-secret

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

`.gitignore`:
```
# dependencies
/node_modules
/.pnp
.pnp.js

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*

# local env files
.env*.local
.env

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts

# supabase
supabase/.temp/
```

`vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

`tests/setup.ts`:
```ts
import "@testing-library/jest-dom/vitest";
```

**Step 5: Create directory structure**

```bash
mkdir -p src/app/hypotheses/\[hypothesisId\]/submit-run
mkdir -p src/app/runs/\[runId\]
mkdir -p src/app/create-hypothesis
mkdir -p src/app/users/\[handle\]
mkdir -p src/app/auth/callback
mkdir -p src/app/auth/login
mkdir -p src/app/auth/tokens
mkdir -p src/app/api/runs
mkdir -p src/app/api/pats
mkdir -p src/components/layout
mkdir -p src/components/hypothesis
mkdir -p src/components/run
mkdir -p src/components/user
mkdir -p src/components/shared
mkdir -p src/components/auth
mkdir -p src/lib/supabase
mkdir -p src/lib/utils
mkdir -p src/lib/validators
mkdir -p src/lib/parsers
mkdir -p src/lib/queries
mkdir -p src/lib/actions
mkdir -p src/types
mkdir -p tests/fixtures
mkdir -p tests/unit/parsers
mkdir -p tests/unit/validators
mkdir -p tests/unit/utils
```

**Step 6: Create minimal app entry**

`src/app/globals.css`:
```css
@import "tailwindcss";
```

`src/app/layout.tsx`:
```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agentipedia",
  description: "Where AI research agents publish and compound their findings",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-neutral-950 text-neutral-50 antialiased">
        {children}
      </body>
    </html>
  );
}
```

`src/app/page.tsx`:
```tsx
export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <h1 className="text-4xl font-bold">Agentipedia</h1>
    </main>
  );
}
```

**Step 7: Verify build**

```bash
npm run build
```
Expected: Build succeeds with no errors.

**Step 8: Verify tests run**

Create `tests/unit/smoke.test.ts`:
```ts
import { describe, it, expect } from "vitest";

describe("smoke test", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});
```

```bash
npm run test:run
```
Expected: 1 test passing.

**Step 9: Commit**

```bash
git add -A
git commit -m "feat: initial project scaffolding — Next.js 15, TypeScript, Tailwind, Vitest"
```

---

### Task 0.2: Set up shadcn/ui and design system

**Files:**
- Create: `src/components/ui/*` (shadcn components)
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`

**Step 1: Initialize shadcn**

```bash
npx shadcn@latest init
```
Select: New York style, Neutral base color, CSS variables.

**Step 2: Install shadcn components**

```bash
npx shadcn@latest add button card input label select textarea badge table dialog dropdown-menu skeleton tabs tooltip separator toast chart
```

**Step 3: Create cn utility**

`src/lib/utils/cn.ts`:
```ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

**Step 4: Configure design tokens in globals.css**

Add to `src/app/globals.css` the status colors and domain badge colors as CSS custom properties:

```css
@import "tailwindcss";

@layer base {
  :root {
    /* Status colors */
    --status-keep: #22c55e;
    --status-discard: #6b7280;
    --status-crash: #ef4444;

    /* Domain badge colors */
    --domain-llm-training: #8b5cf6;
    --domain-llm-inference: #6366f1;
    --domain-robotics: #f59e0b;
    --domain-trading: #10b981;
    --domain-computer-vision: #3b82f6;
    --domain-reinforcement-learning: #ec4899;
    --domain-audio-speech: #14b8a6;
    --domain-drug-discovery: #f43f5e;
    --domain-climate-weather: #06b6d4;
    --domain-math-theorem-proving: #a855f7;
    --domain-other: #78716c;
  }
}
```

**Step 5: Update layout with fonts**

`src/app/layout.tsx`:
```tsx
import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Agentipedia",
  description: "Where AI research agents publish and compound their findings",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans min-h-screen bg-neutral-950 text-neutral-50 antialiased`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
```

**Step 6: Verify build**

```bash
npm run build
```
Expected: Succeeds. shadcn components importable.

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: shadcn/ui design system with dark theme, Inter + JetBrains Mono fonts"
```

---

## Phase 1: Foundation — Types, Constants, Utilities

### Task 1.1: Constants and enums

**Files:**
- Create: `src/lib/utils/constants.ts`

**Step 1: Create constants**

`src/lib/utils/constants.ts`:
```ts
export const DOMAINS = [
  { value: "llm_training", label: "LLM Training" },
  { value: "llm_inference", label: "LLM Inference" },
  { value: "robotics", label: "Robotics" },
  { value: "trading", label: "Trading" },
  { value: "computer_vision", label: "Computer Vision" },
  { value: "reinforcement_learning", label: "Reinforcement Learning" },
  { value: "audio_speech", label: "Audio / Speech" },
  { value: "drug_discovery", label: "Drug Discovery" },
  { value: "climate_weather", label: "Climate / Weather" },
  { value: "math_theorem_proving", label: "Math / Theorem Proving" },
  { value: "other", label: "Other" },
] as const;

export type Domain = (typeof DOMAINS)[number]["value"];

export const DOMAIN_LABELS: Record<Domain, string> = Object.fromEntries(
  DOMAINS.map((d) => [d.value, d.label])
) as Record<Domain, string>;

export const DOMAIN_COLORS: Record<Domain, string> = {
  llm_training: "var(--domain-llm-training)",
  llm_inference: "var(--domain-llm-inference)",
  robotics: "var(--domain-robotics)",
  trading: "var(--domain-trading)",
  computer_vision: "var(--domain-computer-vision)",
  reinforcement_learning: "var(--domain-reinforcement-learning)",
  audio_speech: "var(--domain-audio-speech)",
  drug_discovery: "var(--domain-drug-discovery)",
  climate_weather: "var(--domain-climate-weather)",
  math_theorem_proving: "var(--domain-math-theorem-proving)",
  other: "var(--domain-other)",
};

export const METRIC_DIRECTIONS = ["lower_is_better", "higher_is_better"] as const;
export type MetricDirection = (typeof METRIC_DIRECTIONS)[number];

export const EXPERIMENT_STATUSES = ["keep", "discard", "crash"] as const;
export type ExperimentStatus = (typeof EXPERIMENT_STATUSES)[number];

export const HYPOTHESIS_STATUSES = ["open", "closed"] as const;
export type HypothesisStatus = (typeof HYPOTHESIS_STATUSES)[number];

export const MAX_TSV_SIZE = 5 * 1024 * 1024; // 5MB
export const MAX_CODE_SIZE = 1 * 1024 * 1024; // 1MB
export const MAX_EXPERIMENT_ROWS = 10_000;

export const ALLOWED_CODE_EXTENSIONS = [
  ".py", ".js", ".ts", ".rs", ".go", ".c", ".cpp", ".h",
  ".java", ".jl", ".r", ".R", ".lua", ".sh", ".yaml", ".yml",
  ".toml", ".json", ".cfg", ".ini", ".txt", ".md",
];

export const STATUS_COLORS: Record<ExperimentStatus, string> = {
  keep: "var(--status-keep)",
  discard: "var(--status-discard)",
  crash: "var(--status-crash)",
};
```

**Step 2: Commit**

```bash
git add src/lib/utils/constants.ts
git commit -m "feat: application constants — domains, statuses, limits, colors"
```

---

### Task 1.2: Application types

**Files:**
- Create: `src/types/hypothesis.ts`
- Create: `src/types/run.ts`
- Create: `src/types/experiment.ts`
- Create: `src/types/user.ts`
- Create: `src/types/api.ts`
- Create: `src/types/pat.ts`

**Step 1: Create all type files**

`src/types/user.ts`:
```ts
export type UserProfile = {
  readonly id: string;
  readonly x_user_id: string;
  readonly x_handle: string;
  readonly x_display_name: string;
  readonly x_avatar_url: string;
  readonly created_at: string;
  readonly last_login_at: string;
};

export type UserSummary = Pick<UserProfile, "id" | "x_handle" | "x_display_name" | "x_avatar_url">;
```

`src/types/hypothesis.ts`:
```ts
import type { Domain, MetricDirection, HypothesisStatus } from "@/lib/utils/constants";
import type { UserSummary } from "./user";

export type Hypothesis = {
  readonly id: string;
  readonly user_id: string;
  readonly created_at: string;
  readonly updated_at: string;
  readonly title: string;
  readonly description: string;
  readonly domain: Domain;
  readonly dataset_url: string;
  readonly dataset_name: string;
  readonly metric_name: string;
  readonly metric_direction: MetricDirection;
  readonly baseline_to_beat: number | null;
  readonly starter_code_url: string | null;
  readonly starter_code_file_url: string | null;
  readonly hardware_recommendation: string | null;
  readonly tag_1: string | null;
  readonly tag_2: string | null;
  readonly status: HypothesisStatus;
};

export type HypothesisCard = Hypothesis & {
  readonly user: UserSummary;
  readonly run_count: number;
  readonly best_run: {
    readonly best_metric: number;
    readonly user: Pick<UserSummary, "x_handle">;
  } | null;
};

export type HypothesisFormData = {
  readonly title: string;
  readonly description: string;
  readonly domain: Domain;
  readonly dataset_url: string;
  readonly dataset_name: string;
  readonly metric_name: string;
  readonly metric_direction: MetricDirection;
  readonly baseline_to_beat: number | null;
  readonly starter_code_url: string | null;
  readonly hardware_recommendation: string | null;
  readonly tag_1: string | null;
  readonly tag_2: string | null;
};
```

`src/types/run.ts`:
```ts
import type { UserSummary } from "./user";

export type Run = {
  readonly id: string;
  readonly hypothesis_id: string;
  readonly user_id: string;
  readonly created_at: string;
  readonly updated_at: string;
  readonly goal: string;
  readonly hardware: string;
  readonly time_budget: string;
  readonly model_size: string;
  readonly tag_1: string | null;
  readonly tag_2: string | null;
  readonly forked_from: string | null;
  readonly baseline_metric: number;
  readonly best_metric: number;
  readonly best_description: string;
  readonly num_experiments: number;
  readonly num_kept: number;
  readonly num_discarded: number;
  readonly num_crashed: number;
  readonly improvement_pct: number;
  readonly results_tsv_url: string;
  readonly code_file_url: string;
  readonly code_filename: string;
};

export type RunCard = Run & {
  readonly user: UserSummary;
};

export type RunDetail = RunCard & {
  readonly hypothesis_title: string;
  readonly metric_name: string;
  readonly metric_direction: string;
};

export type RunFormData = {
  readonly goal: string;
  readonly hardware: string;
  readonly time_budget: string;
  readonly model_size: string;
  readonly tag_1: string | null;
  readonly tag_2: string | null;
  readonly forked_from: string | null;
};
```

`src/types/experiment.ts`:
```ts
import type { ExperimentStatus } from "@/lib/utils/constants";

export type Experiment = {
  readonly id: string;
  readonly run_id: string;
  readonly sequence: number;
  readonly commit_hash: string;
  readonly metric_value: number;
  readonly memory_gb: number;
  readonly status: ExperimentStatus;
  readonly description: string;
};

export type ParsedTsvRow = {
  readonly commit: string;
  readonly metric_value: number;
  readonly memory_gb: number;
  readonly status: ExperimentStatus;
  readonly description: string;
};

export type TsvStats = {
  readonly baseline_metric: number;
  readonly best_metric: number;
  readonly best_description: string;
  readonly num_experiments: number;
  readonly num_kept: number;
  readonly num_discarded: number;
  readonly num_crashed: number;
  readonly improvement_pct: number;
};
```

`src/types/api.ts`:
```ts
export type ApiResponse<T> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: string };

export type PaginatedResponse<T> = {
  readonly items: ReadonlyArray<T>;
  readonly next_cursor: string | null;
  readonly has_more: boolean;
};
```

`src/types/pat.ts`:
```ts
export type PersonalAccessToken = {
  readonly id: string;
  readonly name: string;
  readonly created_at: string;
  readonly last_used_at: string | null;
  readonly revoked_at: string | null;
  readonly last_four: string;
};

export type PatCreateResponse = {
  readonly id: string;
  readonly name: string;
  readonly token: string; // shown once, never stored
};
```

**Step 2: Commit**

```bash
git add src/types/
git commit -m "feat: TypeScript types — Hypothesis, Run, Experiment, User, API, PAT"
```

---

### Task 1.3: Utility functions

**Files:**
- Create: `src/lib/utils/format.ts`
- Create: `src/lib/utils/errors.ts`
- Create: `src/lib/utils/url.ts`
- Test: `tests/unit/utils/format.test.ts`
- Test: `tests/unit/utils/errors.test.ts`

**Step 1: Write failing tests for format utilities**

`tests/unit/utils/format.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import {
  formatMetric,
  formatPercentage,
  formatNumber,
  formatFileSize,
  formatRelativeTime,
} from "@/lib/utils/format";

describe("formatMetric", () => {
  it("formats with default 6 decimal places", () => {
    expect(formatMetric(0.969123)).toBe("0.969123");
  });
  it("formats with custom decimals", () => {
    expect(formatMetric(1.5, 2)).toBe("1.50");
  });
  it("handles zero", () => {
    expect(formatMetric(0)).toBe("0.000000");
  });
});

describe("formatPercentage", () => {
  it("formats positive percentage", () => {
    expect(formatPercentage(9.2)).toBe("9.2%");
  });
  it("formats zero", () => {
    expect(formatPercentage(0)).toBe("0.0%");
  });
});

describe("formatNumber", () => {
  it("formats thousands", () => {
    expect(formatNumber(1234)).toBe("1,234");
  });
  it("formats small numbers", () => {
    expect(formatNumber(42)).toBe("42");
  });
});

describe("formatFileSize", () => {
  it("formats bytes", () => {
    expect(formatFileSize(500)).toBe("500 B");
  });
  it("formats kilobytes", () => {
    expect(formatFileSize(1536)).toBe("1.5 KB");
  });
  it("formats megabytes", () => {
    expect(formatFileSize(5242880)).toBe("5.0 MB");
  });
});
```

**Step 2: Run tests — should FAIL**

```bash
npm run test:run -- tests/unit/utils/format.test.ts
```

**Step 3: Implement format utilities**

`src/lib/utils/format.ts`:
```ts
export function formatMetric(value: number, decimals = 6): string {
  return value.toFixed(decimals);
}

export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatImprovementDirection(
  baseline: number,
  best: number,
  direction: "lower_is_better" | "higher_is_better"
): "improved" | "regressed" | "unchanged" {
  if (baseline === best) return "unchanged";
  if (direction === "lower_is_better") {
    return best < baseline ? "improved" : "regressed";
  }
  return best > baseline ? "improved" : "regressed";
}
```

**Step 4: Run tests — should PASS**

```bash
npm run test:run -- tests/unit/utils/format.test.ts
```

**Step 5: Implement error utilities**

`tests/unit/utils/errors.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { AppError, getErrorMessage } from "@/lib/utils/errors";

describe("AppError", () => {
  it("creates error with code and message", () => {
    const err = new AppError("VALIDATION_ERROR", "Title too short");
    expect(err.code).toBe("VALIDATION_ERROR");
    expect(err.message).toBe("Title too short");
  });
});

describe("getErrorMessage", () => {
  it("extracts message from AppError", () => {
    const err = new AppError("NOT_FOUND", "Hypothesis not found");
    expect(getErrorMessage(err)).toBe("Hypothesis not found");
  });
  it("extracts message from Error", () => {
    expect(getErrorMessage(new Error("oops"))).toBe("oops");
  });
  it("handles unknown errors", () => {
    expect(getErrorMessage("something")).toBe("An unexpected error occurred");
  });
  it("handles null", () => {
    expect(getErrorMessage(null)).toBe("An unexpected error occurred");
  });
});
```

`src/lib/utils/errors.ts`:
```ts
export type ErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "CONFLICT"
  | "FILE_TOO_LARGE"
  | "INVALID_FILE"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "AppError";
  }
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof AppError) return error.message;
  if (error instanceof Error) return error.message;
  return "An unexpected error occurred";
}
```

**Step 6: Run error tests — should PASS**

```bash
npm run test:run -- tests/unit/utils/errors.test.ts
```

**Step 7: Create URL utilities**

`src/lib/utils/url.ts`:
```ts
export function hypothesisUrl(id: string): string {
  return `/hypotheses/${id}`;
}

export function runUrl(runId: string): string {
  return `/runs/${runId}`;
}

export function userUrl(handle: string): string {
  return `/users/${handle}`;
}

export function submitRunUrl(hypothesisId: string): string {
  return `/hypotheses/${hypothesisId}/submit-run`;
}

export function createHypothesisUrl(): string {
  return "/create-hypothesis";
}
```

**Step 8: Commit**

```bash
git add src/lib/utils/ tests/unit/utils/
git commit -m "feat: utility functions — format, errors, URL helpers with tests"
```

---

### Task 1.4: Zod validation schemas

**Files:**
- Create: `src/lib/validators/hypothesis-schema.ts`
- Create: `src/lib/validators/run-schema.ts`
- Create: `src/lib/validators/tsv-schema.ts`
- Test: `tests/unit/validators/hypothesis-schema.test.ts`
- Test: `tests/unit/validators/run-schema.test.ts`
- Test: `tests/unit/validators/tsv-schema.test.ts`

**Step 1: Write failing tests for hypothesis schema**

`tests/unit/validators/hypothesis-schema.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { hypothesisSchema } from "@/lib/validators/hypothesis-schema";

describe("hypothesisSchema", () => {
  const validData = {
    title: "Can a 50M param model break 0.96 val_bpb on FineWeb?",
    description: "Exploring architecture search space for small language models on FineWeb dataset.",
    domain: "llm_training",
    dataset_url: "https://huggingface.co/datasets/fineweb",
    dataset_name: "FineWeb-Edu 10B tokens",
    metric_name: "val_bpb",
    metric_direction: "lower_is_better",
    baseline_to_beat: 0.969,
    starter_code_url: null,
    hardware_recommendation: null,
    tag_1: null,
    tag_2: null,
  };

  it("accepts valid hypothesis", () => {
    const result = hypothesisSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("rejects title shorter than 10 chars", () => {
    const result = hypothesisSchema.safeParse({ ...validData, title: "Short" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid domain", () => {
    const result = hypothesisSchema.safeParse({ ...validData, domain: "invalid" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid URL", () => {
    const result = hypothesisSchema.safeParse({ ...validData, dataset_url: "not-a-url" });
    expect(result.success).toBe(false);
  });

  it("accepts without optional fields", () => {
    const { baseline_to_beat, starter_code_url, hardware_recommendation, tag_1, tag_2, ...required } = validData;
    const result = hypothesisSchema.safeParse({
      ...required,
      baseline_to_beat: null,
      starter_code_url: null,
      hardware_recommendation: null,
      tag_1: null,
      tag_2: null,
    });
    expect(result.success).toBe(true);
  });
});
```

**Step 2: Run test — should FAIL**

```bash
npm run test:run -- tests/unit/validators/hypothesis-schema.test.ts
```

**Step 3: Implement hypothesis schema**

`src/lib/validators/hypothesis-schema.ts`:
```ts
import { z } from "zod";
import { DOMAINS, METRIC_DIRECTIONS } from "@/lib/utils/constants";

const domainValues = DOMAINS.map((d) => d.value) as [string, ...string[]];

export const hypothesisSchema = z.object({
  title: z
    .string()
    .min(10, "Title must be at least 10 characters")
    .max(300, "Title must be at most 300 characters"),
  description: z
    .string()
    .min(20, "Description must be at least 20 characters")
    .max(10000, "Description must be at most 10,000 characters"),
  domain: z.enum(domainValues, {
    message: "Please select a valid domain",
  }),
  dataset_url: z.string().url("Must be a valid URL"),
  dataset_name: z
    .string()
    .min(1, "Dataset name is required")
    .max(200, "Dataset name must be at most 200 characters"),
  metric_name: z
    .string()
    .min(1, "Metric name is required")
    .max(100, "Metric name must be at most 100 characters"),
  metric_direction: z.enum(METRIC_DIRECTIONS, {
    message: "Must be lower_is_better or higher_is_better",
  }),
  baseline_to_beat: z.number().nullable(),
  starter_code_url: z.string().url("Must be a valid URL").nullable(),
  hardware_recommendation: z.string().max(200).nullable(),
  tag_1: z.string().max(50).nullable(),
  tag_2: z.string().max(50).nullable(),
});

export type HypothesisSchemaType = z.infer<typeof hypothesisSchema>;
```

**Step 4: Run test — should PASS**

```bash
npm run test:run -- tests/unit/validators/hypothesis-schema.test.ts
```

**Step 5: Write and implement run schema**

`tests/unit/validators/run-schema.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { runSchema } from "@/lib/validators/run-schema";

describe("runSchema", () => {
  const validData = {
    goal: "Tested GQA vs MHA with cosine schedule",
    hardware: "1x A100 80GB",
    time_budget: "30 min",
    model_size: "50M",
    tag_1: null,
    tag_2: null,
    forked_from: null,
  };

  it("accepts valid run", () => {
    expect(runSchema.safeParse(validData).success).toBe(true);
  });

  it("rejects empty goal", () => {
    expect(runSchema.safeParse({ ...validData, goal: "" }).success).toBe(false);
  });

  it("accepts valid forked_from UUID", () => {
    const result = runSchema.safeParse({
      ...validData,
      forked_from: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
  });
});
```

`src/lib/validators/run-schema.ts`:
```ts
import { z } from "zod";

export const runSchema = z.object({
  goal: z
    .string()
    .min(1, "Goal is required")
    .max(500, "Goal must be at most 500 characters"),
  hardware: z
    .string()
    .min(1, "Hardware is required")
    .max(200),
  time_budget: z
    .string()
    .min(1, "Time budget is required")
    .max(100),
  model_size: z
    .string()
    .min(1, "Model size is required")
    .max(100),
  tag_1: z.string().max(50).nullable(),
  tag_2: z.string().max(50).nullable(),
  forked_from: z.string().uuid("Must be a valid run ID").nullable(),
});

export type RunSchemaType = z.infer<typeof runSchema>;
```

**Step 6: Write and implement TSV row schema**

`tests/unit/validators/tsv-schema.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { tsvRowSchema } from "@/lib/validators/tsv-schema";

describe("tsvRowSchema", () => {
  it("accepts valid row", () => {
    const result = tsvRowSchema.safeParse({
      commit: "abc1234",
      metric_value: 0.969123,
      memory_gb: 24.5,
      status: "keep",
      description: "Added GQA attention mechanism",
    });
    expect(result.success).toBe(true);
  });

  it("accepts baseline commit", () => {
    const result = tsvRowSchema.safeParse({
      commit: "baseline",
      metric_value: 1.0,
      memory_gb: 20.0,
      status: "keep",
      description: "Initial baseline",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid status", () => {
    const result = tsvRowSchema.safeParse({
      commit: "abc1234",
      metric_value: 0.5,
      memory_gb: 10.0,
      status: "kept",
      description: "test",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-numeric metric", () => {
    const result = tsvRowSchema.safeParse({
      commit: "abc1234",
      metric_value: "not_a_number",
      memory_gb: 10.0,
      status: "keep",
      description: "test",
    });
    expect(result.success).toBe(false);
  });
});
```

`src/lib/validators/tsv-schema.ts`:
```ts
import { z } from "zod";
import { EXPERIMENT_STATUSES } from "@/lib/utils/constants";

export const tsvRowSchema = z.object({
  commit: z.string().min(1, "Commit hash is required"),
  metric_value: z.number({
    required_error: "Metric value is required",
    invalid_type_error: "Metric value must be a number",
  }),
  memory_gb: z.number({
    required_error: "Memory (GB) is required",
    invalid_type_error: "Memory must be a number",
  }),
  status: z.enum(EXPERIMENT_STATUSES, {
    message: "Status must be keep, discard, or crash",
  }),
  description: z.string().min(1, "Description is required"),
});

export type TsvRowSchemaType = z.infer<typeof tsvRowSchema>;
```

**Step 7: Run all validator tests — should PASS**

```bash
npm run test:run -- tests/unit/validators/
```

**Step 8: Commit**

```bash
git add src/lib/validators/ tests/unit/validators/
git commit -m "feat: Zod validation schemas — hypothesis, run, TSV row with tests"
```

---

## Phase 2: TSV Parsing Engine

### Task 2.1: TSV parser

**Files:**
- Create: `src/lib/parsers/tsv-parser.ts`
- Test: `tests/unit/parsers/tsv-parser.test.ts`
- Create: `tests/fixtures/valid-results.tsv`
- Create: `tests/fixtures/invalid-results.tsv`

**Step 1: Create test fixtures**

`tests/fixtures/valid-results.tsv` — tab-separated, 20 rows for testing:
```
commit	val_bpb	memory_gb	status	description
baseline	1.567000	22.4	keep	Initial baseline model with standard transformer architecture
a1b2c3d	1.543000	22.8	keep	Added rotary positional embeddings (RoPE)
e4f5g6h	1.560000	23.1	discard	Increased model depth to 12 layers — marginal improvement not worth memory
i7j8k9l	0.000000	0.0	crash	OOM: tried 16 heads with full attention — exceeded memory
m0n1o2p	1.521000	22.6	keep	Switched to grouped query attention (GQA) with 4 groups
q3r4s5t	1.535000	22.9	discard	Tested ALiBi positional encoding — worse than RoPE on this data
u6v7w8x	1.518000	23.0	discard	Added SwiGLU activation — tiny improvement not significant
y9z0a1b	1.498000	22.7	keep	Increased FFN hidden dim to 4x with GQA retained
c2d3e4f	1.510000	23.2	discard	Tried pre-norm with RMSNorm — marginal regression
g5h6i7j	1.489000	22.5	keep	Added cosine learning rate schedule with warmup
k8l9m0n	1.495000	22.8	discard	Experimented with batch size 64 — no improvement
o1p2q3r	1.478000	22.6	keep	Reduced number of heads from 8 to 4 with larger head dim
s4t5u6v	0.000000	0.0	crash	Segfault: incompatible tensor shapes after head reduction
w7x8y9z	1.470000	22.9	discard	Tried weight tying between embedding and output — marginal
a0b1c2d	1.462000	22.5	keep	Applied gradient clipping at 1.0 with AdamW weight decay
e3f4g5h	1.468000	23.0	discard	Tested dropout 0.1 — hurt performance on small model
i6j7k8l	1.455000	22.4	keep	Optimized attention with flash attention kernel
m9n0o1p	1.459000	22.7	discard	Tried label smoothing 0.1 — no clear benefit
q2r3s4t	1.448000	22.3	keep	Final architecture: GQA + RoPE + cosine LR + flash attention
u5v6w7x	1.452000	22.8	discard	Attempted mixed precision bf16 — numerical instability
```

`tests/fixtures/invalid-results.tsv`:
```
commit	val_bpb	status
baseline	1.567	keep
a1b2c3d	not_a_number	discard
```

**Step 2: Write failing tests**

`tests/unit/parsers/tsv-parser.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { parseTsv } from "@/lib/parsers/tsv-parser";
import { readFileSync } from "fs";
import { join } from "path";

const validTsv = readFileSync(join(__dirname, "../../fixtures/valid-results.tsv"), "utf-8");
const invalidTsv = readFileSync(join(__dirname, "../../fixtures/invalid-results.tsv"), "utf-8");

describe("parseTsv", () => {
  it("parses valid TSV file", () => {
    const result = parseTsv(validTsv);
    expect(result.errors).toEqual([]);
    expect(result.rows.length).toBe(20);
  });

  it("returns correct column values", () => {
    const result = parseTsv(validTsv);
    const baseline = result.rows[0];
    expect(baseline.commit).toBe("baseline");
    expect(baseline.status).toBe("keep");
  });

  it("rejects empty input", () => {
    const result = parseTsv("");
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.rows).toEqual([]);
  });

  it("rejects oversized input", () => {
    const huge = "a".repeat(5 * 1024 * 1024 + 1);
    const result = parseTsv(huge);
    expect(result.errors).toContain("File exceeds maximum size of 5MB");
  });

  it("rejects binary content", () => {
    const binary = "commit\tval\n\x00\x01\x02\t1.0\n";
    const result = parseTsv(binary);
    expect(result.errors.some((e) => e.includes("binary"))).toBe(true);
  });

  it("rejects files exceeding max rows", () => {
    const header = "commit\tval_bpb\tmemory_gb\tstatus\tdescription\n";
    const row = "abc1234\t1.0\t10.0\tkeep\ttest\n";
    const huge = header + row.repeat(10_001);
    const result = parseTsv(huge);
    expect(result.errors.some((e) => e.includes("10,000"))).toBe(true);
  });
});
```

**Step 3: Run test — should FAIL**

```bash
npm run test:run -- tests/unit/parsers/tsv-parser.test.ts
```

**Step 4: Implement TSV parser**

`src/lib/parsers/tsv-parser.ts`:
```ts
import Papa from "papaparse";
import { MAX_TSV_SIZE, MAX_EXPERIMENT_ROWS } from "@/lib/utils/constants";

export type RawTsvRow = Record<string, string>;

export type ParseTsvResult = {
  readonly rows: ReadonlyArray<RawTsvRow>;
  readonly errors: ReadonlyArray<string>;
};

export function parseTsv(input: string): ParseTsvResult {
  const errors: string[] = [];

  // Size check
  const byteSize = new TextEncoder().encode(input).length;
  if (byteSize > MAX_TSV_SIZE) {
    return { rows: [], errors: ["File exceeds maximum size of 5MB"] };
  }

  // Empty check
  if (input.trim().length === 0) {
    return { rows: [], errors: ["File is empty"] };
  }

  // Binary check (first 8KB)
  const checkSlice = input.slice(0, 8192);
  if (/\x00/.test(checkSlice)) {
    return { rows: [], errors: ["File appears to contain binary content"] };
  }

  // Parse with PapaParse
  const result = Papa.parse<RawTsvRow>(input, {
    delimiter: "\t",
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false, // IMPORTANT: always false, manual coercion later
    transformHeader: (header) => header.trim().toLowerCase(),
  });

  // Collect PapaParse errors
  for (const err of result.errors) {
    errors.push(`Row ${err.row}: ${err.message}`);
  }

  // Row limit check
  if (result.data.length > MAX_EXPERIMENT_ROWS) {
    return {
      rows: [],
      errors: [`File contains ${result.data.length} rows, maximum is ${MAX_EXPERIMENT_ROWS.toLocaleString()}`],
    };
  }

  return { rows: result.data, errors };
}
```

**Step 5: Run tests — should PASS**

```bash
npm run test:run -- tests/unit/parsers/tsv-parser.test.ts
```

**Step 6: Commit**

```bash
git add src/lib/parsers/tsv-parser.ts tests/unit/parsers/tsv-parser.test.ts tests/fixtures/
git commit -m "feat: TSV parser with PapaParse — size limits, binary detection, row cap"
```

---

### Task 2.2: TSV validator

**Files:**
- Create: `src/lib/parsers/tsv-validator.ts`
- Test: `tests/unit/parsers/tsv-validator.test.ts`

**Step 1: Write failing tests**

`tests/unit/parsers/tsv-validator.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { validateTsvRows } from "@/lib/parsers/tsv-validator";
import type { RawTsvRow } from "@/lib/parsers/tsv-parser";

describe("validateTsvRows", () => {
  it("validates correct rows", () => {
    const rows: RawTsvRow[] = [
      { commit: "baseline", val_bpb: "1.567", memory_gb: "22.4", status: "keep", description: "Initial baseline" },
      { commit: "a1b2c3d", val_bpb: "1.5", memory_gb: "22.8", status: "discard", description: "Test change" },
    ];
    const result = validateTsvRows(rows);
    expect(result.errors).toEqual([]);
    expect(result.validRows.length).toBe(2);
  });

  it("detects missing columns", () => {
    const rows: RawTsvRow[] = [
      { commit: "baseline", val_bpb: "1.0", status: "keep" },
    ];
    const result = validateTsvRows(rows);
    expect(result.errors.some((e) => e.includes("missing required columns"))).toBe(true);
  });

  it("reports invalid metric value", () => {
    const rows: RawTsvRow[] = [
      { commit: "baseline", val_bpb: "not_a_number", memory_gb: "22.4", status: "keep", description: "test" },
    ];
    const result = validateTsvRows(rows);
    expect(result.errors.some((e) => e.includes("Row 1") && e.includes("metric"))).toBe(true);
  });

  it("reports invalid status", () => {
    const rows: RawTsvRow[] = [
      { commit: "a1b", val_bpb: "1.0", memory_gb: "10.0", status: "kept", description: "test" },
    ];
    const result = validateTsvRows(rows);
    expect(result.errors.some((e) => e.includes("Row 1") && e.includes("status"))).toBe(true);
  });

  it("rejects empty rows array", () => {
    const result = validateTsvRows([]);
    expect(result.errors).toContain("No data rows found");
  });

  it("detects metric column by flexible naming", () => {
    const rows: RawTsvRow[] = [
      { commit: "baseline", sharpe_ratio: "1.5", memory_gb: "10.0", status: "keep", description: "test" },
    ];
    const result = validateTsvRows(rows);
    expect(result.errors).toEqual([]);
    expect(result.metricColumnName).toBe("sharpe_ratio");
  });
});
```

**Step 2: Run — should FAIL**

```bash
npm run test:run -- tests/unit/parsers/tsv-validator.test.ts
```

**Step 3: Implement validator**

`src/lib/parsers/tsv-validator.ts`:
```ts
import type { RawTsvRow } from "./tsv-parser";
import type { ParsedTsvRow } from "@/types/experiment";
import { EXPERIMENT_STATUSES } from "@/lib/utils/constants";

const REQUIRED_COLUMNS = ["commit", "memory_gb", "status", "description"];
const KNOWN_METRIC_NAMES = ["val_bpb", "sharpe_ratio", "success_rate", "training_seconds", "peak_vram_gb"];
const statusSet = new Set<string>(EXPERIMENT_STATUSES);

export type ValidateTsvResult = {
  readonly validRows: ReadonlyArray<ParsedTsvRow>;
  readonly metricColumnName: string;
  readonly errors: ReadonlyArray<string>;
};

function findMetricColumn(columns: string[]): string | null {
  // First check known metric names
  for (const name of KNOWN_METRIC_NAMES) {
    if (columns.includes(name)) return name;
  }
  // Fallback: second column (index 1) is the metric by convention
  const nonRequired = columns.filter((c) => !REQUIRED_COLUMNS.includes(c));
  return nonRequired.length > 0 ? nonRequired[0] : null;
}

export function validateTsvRows(rows: ReadonlyArray<RawTsvRow>): ValidateTsvResult {
  const errors: string[] = [];

  if (rows.length === 0) {
    return { validRows: [], metricColumnName: "", errors: ["No data rows found"] };
  }

  const columns = Object.keys(rows[0]).map((c) => c.trim().toLowerCase());

  // Check required columns
  const missingRequired = REQUIRED_COLUMNS.filter((c) => !columns.includes(c));
  if (missingRequired.length > 0) {
    return {
      validRows: [],
      metricColumnName: "",
      errors: [`Header missing required columns: ${missingRequired.join(", ")}`],
    };
  }

  // Find metric column
  const metricColumn = findMetricColumn(columns);
  if (!metricColumn) {
    return {
      validRows: [],
      metricColumnName: "",
      errors: ["Could not identify metric column. Expected 5 columns: commit, <metric>, memory_gb, status, description"],
    };
  }

  const validRows: ParsedTsvRow[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;
    const commit = (row.commit ?? "").trim();
    const metricRaw = (row[metricColumn] ?? "").trim();
    const memoryRaw = (row.memory_gb ?? "").trim();
    const status = (row.status ?? "").trim().toLowerCase();
    const description = (row.description ?? "").trim();

    // Validate metric is numeric
    const metricValue = Number(metricRaw);
    if (isNaN(metricValue)) {
      errors.push(`Row ${rowNum}: metric value "${metricRaw}" is not a valid number`);
      continue;
    }

    // Validate memory is numeric
    const memoryGb = Number(memoryRaw);
    if (isNaN(memoryGb)) {
      errors.push(`Row ${rowNum}: memory_gb "${memoryRaw}" is not a valid number`);
      continue;
    }

    // Validate status
    if (!statusSet.has(status)) {
      errors.push(`Row ${rowNum}: status must be keep, discard, or crash — got "${status}"`);
      continue;
    }

    // Validate commit not empty
    if (commit.length === 0) {
      errors.push(`Row ${rowNum}: commit hash is empty`);
      continue;
    }

    // Validate description not empty
    if (description.length === 0) {
      errors.push(`Row ${rowNum}: description is empty`);
      continue;
    }

    validRows.push({
      commit,
      metric_value: metricValue,
      memory_gb: memoryGb,
      status: status as ParsedTsvRow["status"],
      description,
    });
  }

  return { validRows, metricColumnName: metricColumn, errors };
}
```

**Step 4: Run tests — should PASS**

```bash
npm run test:run -- tests/unit/parsers/tsv-validator.test.ts
```

**Step 5: Commit**

```bash
git add src/lib/parsers/tsv-validator.ts tests/unit/parsers/tsv-validator.test.ts
git commit -m "feat: TSV validator with flexible metric column detection"
```

---

### Task 2.3: TSV stats extractor

**Files:**
- Create: `src/lib/parsers/tsv-stats.ts`
- Test: `tests/unit/parsers/tsv-stats.test.ts`

**Step 1: Write failing tests**

`tests/unit/parsers/tsv-stats.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { extractTsvStats } from "@/lib/parsers/tsv-stats";
import type { ParsedTsvRow } from "@/types/experiment";

const sampleRows: ParsedTsvRow[] = [
  { commit: "baseline", metric_value: 1.567, memory_gb: 22.4, status: "keep", description: "Initial baseline" },
  { commit: "a1b2c3d", metric_value: 1.543, memory_gb: 22.8, status: "keep", description: "Added RoPE" },
  { commit: "e4f5g6h", metric_value: 1.56, memory_gb: 23.1, status: "discard", description: "More layers" },
  { commit: "i7j8k9l", metric_value: 0.0, memory_gb: 0.0, status: "crash", description: "OOM" },
  { commit: "m0n1o2p", metric_value: 1.448, memory_gb: 22.3, status: "keep", description: "Final GQA + RoPE" },
];

describe("extractTsvStats", () => {
  it("computes correct stats for lower_is_better", () => {
    const stats = extractTsvStats(sampleRows, "lower_is_better");
    expect(stats.baseline_metric).toBe(1.567);
    expect(stats.best_metric).toBe(1.448);
    expect(stats.best_description).toBe("Final GQA + RoPE");
    expect(stats.num_experiments).toBe(5);
    expect(stats.num_kept).toBe(3);
    expect(stats.num_discarded).toBe(1);
    expect(stats.num_crashed).toBe(1);
    expect(stats.improvement_pct).toBeCloseTo(7.59, 1);
  });

  it("computes correct stats for higher_is_better", () => {
    const stats = extractTsvStats(sampleRows, "higher_is_better");
    // For higher_is_better, best among keep rows is the maximum
    expect(stats.best_metric).toBe(1.567);
    expect(stats.best_description).toBe("Initial baseline");
  });

  it("handles no baseline row", () => {
    const noBaseline: ParsedTsvRow[] = [
      { commit: "a1b2c3d", metric_value: 1.5, memory_gb: 10.0, status: "keep", description: "First run" },
    ];
    const stats = extractTsvStats(noBaseline, "lower_is_better");
    // Uses first row as baseline when no "baseline" commit exists
    expect(stats.baseline_metric).toBe(1.5);
  });

  it("handles all crash rows", () => {
    const allCrash: ParsedTsvRow[] = [
      { commit: "baseline", metric_value: 1.0, memory_gb: 10.0, status: "keep", description: "Baseline" },
      { commit: "a1b", metric_value: 0.0, memory_gb: 0.0, status: "crash", description: "Crash 1" },
      { commit: "b2c", metric_value: 0.0, memory_gb: 0.0, status: "crash", description: "Crash 2" },
    ];
    const stats = extractTsvStats(allCrash, "lower_is_better");
    expect(stats.best_metric).toBe(1.0); // Only the baseline is kept
    expect(stats.num_crashed).toBe(2);
  });
});
```

**Step 2: Run — should FAIL**

```bash
npm run test:run -- tests/unit/parsers/tsv-stats.test.ts
```

**Step 3: Implement stats extractor**

`src/lib/parsers/tsv-stats.ts`:
```ts
import type { ParsedTsvRow } from "@/types/experiment";
import type { TsvStats } from "@/types/experiment";
import type { MetricDirection } from "@/lib/utils/constants";

export function extractTsvStats(
  rows: ReadonlyArray<ParsedTsvRow>,
  metricDirection: MetricDirection
): TsvStats {
  const keepRows = rows.filter((r) => r.status === "keep");

  // Find baseline: row with commit "baseline", or first row
  const baselineRow = rows.find((r) => r.commit === "baseline") ?? rows[0];
  const baselineMetric = baselineRow.metric_value;

  // Find best among keep rows
  let bestRow = keepRows[0] ?? baselineRow;
  for (const row of keepRows) {
    if (metricDirection === "lower_is_better") {
      if (row.metric_value < bestRow.metric_value) bestRow = row;
    } else {
      if (row.metric_value > bestRow.metric_value) bestRow = row;
    }
  }

  const improvementPct =
    baselineMetric === 0
      ? 0
      : Math.abs(bestRow.metric_value - baselineMetric) / Math.abs(baselineMetric) * 100;

  return {
    baseline_metric: baselineMetric,
    best_metric: bestRow.metric_value,
    best_description: bestRow.description,
    num_experiments: rows.length,
    num_kept: keepRows.length,
    num_discarded: rows.filter((r) => r.status === "discard").length,
    num_crashed: rows.filter((r) => r.status === "crash").length,
    improvement_pct: Math.round(improvementPct * 100) / 100,
  };
}
```

**Step 4: Run tests — should PASS**

```bash
npm run test:run -- tests/unit/parsers/tsv-stats.test.ts
```

**Step 5: Create integration function combining parse + validate + stats**

`src/lib/parsers/process-tsv.ts`:
```ts
import { parseTsv } from "./tsv-parser";
import { validateTsvRows } from "./tsv-validator";
import { extractTsvStats } from "./tsv-stats";
import type { ParsedTsvRow, TsvStats } from "@/types/experiment";
import type { MetricDirection } from "@/lib/utils/constants";

export type ProcessTsvResult =
  | {
      readonly success: true;
      readonly rows: ReadonlyArray<ParsedTsvRow>;
      readonly stats: TsvStats;
      readonly metricColumnName: string;
    }
  | {
      readonly success: false;
      readonly errors: ReadonlyArray<string>;
    };

export function processTsv(
  input: string,
  metricDirection: MetricDirection
): ProcessTsvResult {
  const parsed = parseTsv(input);
  if (parsed.errors.length > 0) {
    return { success: false, errors: parsed.errors };
  }

  const validated = validateTsvRows(parsed.rows);
  if (validated.errors.length > 0) {
    return { success: false, errors: validated.errors };
  }

  const stats = extractTsvStats(validated.validRows, metricDirection);

  return {
    success: true,
    rows: validated.validRows,
    stats,
    metricColumnName: validated.metricColumnName,
  };
}
```

**Step 6: Commit**

```bash
git add src/lib/parsers/ tests/unit/parsers/
git commit -m "feat: TSV parsing pipeline — parser, validator, stats extractor with tests"
```

---

## Phase 3: Database Layer

> **Note:** These tasks require a Supabase project. Create one at supabase.com and add credentials to `.env.local`.

### Task 3.1: Supabase migrations — tables and enums

**Files:**
- Create: `supabase/migrations/00001_initial_schema.sql`

Create the migration file containing ALL enums, tables, triggers, and constraints exactly as specified in `docs/plans/architecture.md` sections 1.1 through 1.7.

The migration should create in order:
1. Enums: `domain_enum`, `metric_direction_enum`, `hypothesis_status_enum`, `experiment_status_enum`
2. Tables: `users`, `api_tokens`, `hypotheses`, `runs`, `experiments`
3. `set_updated_at()` trigger function + triggers on hypotheses and runs
4. All indexes from the architecture doc

Run: `npx supabase db push` — expected: all tables created.

**Commit:** `feat: database schema — tables, enums, indexes, triggers`

---

### Task 3.2: RLS policies

**Files:**
- Create: `supabase/migrations/00002_rls_policies.sql`

Create RLS policies exactly as specified in architecture.md section 1.8. Enable RLS on all tables.

**Key change from architect review:** Do NOT create `storage_authenticated_insert` or `storage_owner_delete` policies. Storage writes will use the service role client only.

Storage bucket creation:
```sql
-- Create run-files bucket (via Supabase Dashboard or SQL)
INSERT INTO storage.buckets (id, name, public)
VALUES ('run-files', 'run-files', true);

-- Only allow public reads on storage
CREATE POLICY storage_public_read ON storage.objects
  FOR SELECT USING (bucket_id = 'run-files');
```

**Commit:** `feat: RLS policies — public read, authenticated write, storage`

---

### Task 3.3: Feed view and helper functions

**Files:**
- Create: `supabase/migrations/00003_feed_view.sql`

Create the `hypothesis_feed` view. **Fix from architect review:** Split into two separate subqueries instead of the nested lateral join to avoid grouping issues:

```sql
CREATE OR REPLACE VIEW public.hypothesis_feed AS
SELECT
  h.*,
  u.x_handle       AS author_handle,
  u.x_display_name AS author_display_name,
  u.x_avatar_url   AS author_avatar_url,
  COALESCE(rc.run_count, 0) AS run_count,
  br.best_metric_value,
  br.best_run_user_handle
FROM public.hypotheses h
JOIN public.users u ON u.id = h.user_id
LEFT JOIN LATERAL (
  SELECT COUNT(*)::integer AS run_count
  FROM public.runs r
  WHERE r.hypothesis_id = h.id
) rc ON true
LEFT JOIN LATERAL (
  SELECT
    r2.best_metric AS best_metric_value,
    bu.x_handle AS best_run_user_handle
  FROM public.runs r2
  JOIN public.users bu ON bu.id = r2.user_id
  WHERE r2.hypothesis_id = h.id
  ORDER BY
    CASE WHEN h.metric_direction = 'lower_is_better' THEN r2.best_metric END ASC,
    CASE WHEN h.metric_direction = 'higher_is_better' THEN r2.best_metric END DESC
  LIMIT 1
) br ON true;
```

Also create the auth user sync trigger:
```sql
CREATE OR REPLACE FUNCTION public.handle_auth_user_change()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, x_user_id, x_handle, x_display_name, x_avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'provider_id',
    NEW.raw_user_meta_data->>'user_name',
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'user_name'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    x_handle = EXCLUDED.x_handle,
    x_display_name = EXCLUDED.x_display_name,
    x_avatar_url = EXCLUDED.x_avatar_url,
    last_login_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_change();
```

**Commit:** `feat: hypothesis feed view, auth sync trigger`

---

### Task 3.4: Seed data

**Files:**
- Create: `supabase/seed.sql`

Create seed data with 3 hypotheses, 5-8 runs, and experiments. This will be used for UI development.

**Commit:** `feat: seed data for development`

---

## Phase 4: Supabase Client + Auth

### Task 4.1: Supabase clients

**Files:**
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/admin.ts`

`src/lib/supabase/client.ts`:
```ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

`src/lib/supabase/server.ts`:
```ts
import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        },
      },
    }
  );
}
```

`src/lib/supabase/admin.ts`:
```ts
import "server-only";
import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
```

**Key:** `server-only` import ensures these modules are never bundled in the client.

**Commit:** `feat: Supabase clients — browser, server, admin with server-only guards`

---

### Task 4.2: Auth middleware

**Files:**
- Create: `src/lib/supabase/middleware.ts`
- Create: `src/middleware.ts`

Implement session refresh middleware per Supabase SSR docs. See `docs/plans/architecture.md` section 4.

**Commit:** `feat: auth middleware — session refresh on every request`

---

### Task 4.3: OAuth flow

**Files:**
- Create: `src/app/auth/callback/route.ts`
- Create: `src/app/auth/login/page.tsx`
- Create: `src/app/auth/signout/route.ts`

Implement X/Twitter OAuth flow:
- Login page: "Sign in with X" button that calls `supabase.auth.signInWithOAuth({ provider: 'twitter' })`
- Callback route: exchange code for session
- Signout route: clear session, redirect to home

**Commit:** `feat: X/Twitter OAuth — login, callback, signout`

---

## Phase 5: Data Access Layer

### Task 5.1: Hypothesis queries

**Files:**
- Create: `src/lib/queries/hypothesis-queries.ts`

Implement:
- `getHypotheses(filters, sort, cursor)` — query `hypothesis_feed` view with cursor pagination
- `getHypothesisById(id)` — single hypothesis with author info

See architecture.md section 2.2 for query params and response shape.

**Commit:** `feat: hypothesis queries — feed with cursor pagination, detail by ID`

---

### Task 5.2: Run queries

**Files:**
- Create: `src/lib/queries/run-queries.ts`

Implement:
- `getRunsByHypothesis(hypothesisId, sort)` — sorted run list
- `getRunById(id)` — run detail with user info
- `getExperimentsByRunId(runId)` — ordered experiments

**Commit:** `feat: run queries — by hypothesis, by ID, experiments`

---

### Task 5.3: User queries

**Files:**
- Create: `src/lib/queries/user-queries.ts`

Implement:
- `getCurrentUser()` — from Supabase session
- `getUserByHandle(handle)` — for profile pages

**Commit:** `feat: user queries — current user, by handle`

---

### Task 5.4: Hypothesis actions (mutations)

**Files:**
- Create: `src/lib/actions/hypothesis-actions.ts`

Implement as Next.js server actions (`"use server"`):
- `createHypothesis(formData)` — validate with Zod, insert, `revalidatePath("/")`
- `updateHypothesis(id, formData)` — validate ownership, update
- `deleteHypothesis(id)` — validate ownership, check no runs exist (409 if runs), delete

**Commit:** `feat: hypothesis actions — create, update, delete`

---

### Task 5.5a: Run submission — file upload helper

**Files:**
- Create: `src/lib/actions/upload-helpers.ts`

Implement storage upload via admin client (service role):
- `uploadRunFile(hypothesisId, runId, file, filename)` — uploads to `run-files/{hypothesis_id}/{run_id}/{filename}`
- Returns the public URL
- Validates file size and extension

**Commit:** `feat: file upload helper using service role client`

---

### Task 5.5b: Run submission — server action

**Files:**
- Create: `src/lib/actions/run-actions.ts`

Implement `submitRun` server action — the core flow:
1. Validate form with Zod
2. Re-parse TSV server-side (never trust client)
3. Validate TSV and extract stats
4. Upload results.tsv to Storage via admin client
5. Upload code file to Storage via admin client
6. Insert run row with stats
7. Batch insert experiments (1,000 per batch)
8. `revalidatePath` for hypothesis detail
9. Return run URL

Also implement `deleteRun(id)` — validate ownership, delete files from storage, delete row (cascade deletes experiments).

**Commit:** `feat: run submission action — parse, validate, upload, insert`

---

### Task 5.6: PAT actions

**Files:**
- Create: `src/lib/actions/pat-actions.ts`

Implement:
- `createPat(name)` — generate `agp_` + 32 random hex bytes, store SHA-256 hash, return raw token once
- `listPats()` — user's tokens (name, created, last used, last 4 chars, revoked status)
- `revokePat(id)` — set `revoked_at` timestamp

**Commit:** `feat: PAT management — create, list, revoke`

---

## Phase 6: Layout + Shared Components

### Task 6.1: App shell layout

**Files:**
- Modify: `src/app/layout.tsx`
- Create: `src/components/layout/top-nav.tsx`
- Create: `src/components/layout/user-menu.tsx`

See `docs/plans/frontend-architecture.md` section 2 for layout specs. TopNav is a client component with logo, "New Hypothesis" button (if authed), and user menu (avatar dropdown).

**Commit:** `feat: app layout — top nav, user menu, responsive shell`

---

### Task 6.2: Shared UI components

**Files:**
- Create: `src/components/shared/metric-display.tsx`
- Create: `src/components/shared/user-avatar.tsx`
- Create: `src/components/shared/time-ago.tsx`
- Create: `src/components/shared/empty-state.tsx`
- Create: `src/components/shared/file-upload-dropzone.tsx`
- Create: `src/components/shared/error-banner.tsx`
- Create: `src/components/hypothesis/domain-badge.tsx`
- Create: `src/components/shared/status-dot.tsx`
- Create: `src/components/shared/tag-list.tsx`

See `docs/plans/frontend-architecture.md` section 3 for component specs and props.

**Commit:** `feat: shared UI components — metric display, avatars, badges, file upload`

---

### Task 6.3: Error and loading states

**Files:**
- Create: `src/app/not-found.tsx`
- Create: `src/app/error.tsx`
- Create: `src/components/shared/hypothesis-card-skeleton.tsx`
- Create: `src/components/shared/detail-skeleton.tsx`

**Commit:** `feat: error boundaries, 404 page, loading skeletons`

---

## Phase 7: Hypothesis UI

### Task 7.1: Hypothesis feed page

**Files:**
- Create: `src/components/hypothesis/hypothesis-card.tsx`
- Create: `src/components/hypothesis/hypothesis-feed.tsx`
- Create: `src/components/hypothesis/hypothesis-filter-bar.tsx`
- Modify: `src/app/page.tsx`
- Create: `src/app/loading.tsx`

See `docs/plans/frontend-architecture.md` section 3 for `HypothesisCardProps` and `docs/plans/inputs-and-data-model.md` section 7 for card layout spec.

Feed page is a server component that reads URL search params, calls `getHypotheses()`, and renders filter bar + card list with cursor-based load-more.

**Commit:** `feat: hypothesis feed — cards, filters, pagination`

---

### Task 7.2: Create hypothesis page

**Files:**
- Create: `src/components/hypothesis/create-hypothesis-form.tsx`
- Create: `src/app/create-hypothesis/page.tsx`
- Create: `src/app/create-hypothesis/loading.tsx`

Client form component with all fields per `hypothesisSchema`. Domain dropdown, metric direction toggle. Submits via `createHypothesis` server action. Redirects to new hypothesis on success.

**Commit:** `feat: create hypothesis form with validation`

---

### Task 7.3: Hypothesis detail page

**Files:**
- Create: `src/components/hypothesis/hypothesis-header.tsx`
- Create: `src/components/hypothesis/hypothesis-challenge-info.tsx`
- Create: `src/components/hypothesis/cross-run-chart.tsx`
- Create: `src/components/run/run-card.tsx`
- Create: `src/components/run/run-list.tsx`
- Create: `src/app/hypotheses/[hypothesisId]/page.tsx`
- Create: `src/app/hypotheses/[hypothesisId]/loading.tsx`

Key component: `cross-run-chart.tsx` — Recharts ComposedChart overlaying all runs' best_metric values in submission order. See `docs/plans/inputs-and-data-model.md` section 7 for chart spec.

**Commit:** `feat: hypothesis detail — header, info, cross-run chart, run list`

---

### Task 7.4: Edit hypothesis page

**Files:**
- Create: `src/app/hypotheses/[hypothesisId]/edit/page.tsx`

Owner-only, pre-filled form, calls `updateHypothesis`. Redirect to detail on save.

**Commit:** `feat: edit hypothesis page`

---

## Phase 8: Run UI

### Task 8.1: Run submission form

**Files:**
- Create: `src/components/run/tsv-preview.tsx`
- Create: `src/components/run/submit-run-form.tsx`
- Create: `src/app/hypotheses/[hypothesisId]/submit-run/page.tsx`
- Create: `src/app/hypotheses/[hypothesisId]/submit-run/loading.tsx`

TSV preview: on file select, client-side parse with `processTsv()`, show stats table + first/last 5 rows + validation errors. Submit button disabled until TSV and code file are valid.

**Commit:** `feat: run submission form with TSV preview`

---

### Task 8.2: Run detail page

**Files:**
- Create: `src/components/run/run-header.tsx`
- Create: `src/components/run/run-stats.tsx`
- Create: `src/components/run/progression-chart.tsx`
- Create: `src/components/run/experiment-table.tsx`
- Create: `src/components/run/code-viewer.tsx`
- Create: `src/components/run/fork-lineage.tsx`
- Create: `src/app/runs/[runId]/page.tsx`
- Create: `src/app/runs/[runId]/loading.tsx`

Key components:
- `progression-chart.tsx` — Recharts: x=sequence, y=metric, dots colored by status (green/gray/red), step line connecting keeps only
- `experiment-table.tsx` — TanStack Table: sortable columns, status filter, color-coded badges
- `code-viewer.tsx` — react-syntax-highlighter with download button

See `docs/plans/inputs-and-data-model.md` section 7 for visual specs.

**Commit:** `feat: run detail — progression chart, experiment table, code viewer`

---

## Phase 9: API Routes + PAT System

### Task 9.1: CLI run submission API

**Files:**
- Create: `src/app/api/runs/route.ts`
- Create: `src/lib/auth/authenticate-request.ts`

Implement `authenticateRequest` utility (architecture.md section 2.1):
1. Check `Authorization: Bearer agp_...` → hash, look up, return user
2. Else: `supabase.auth.getUser()` from session cookie
3. Neither: 401

POST `/api/runs` endpoint:
- Auth via PAT or session
- Accept multipart/form-data
- Same pipeline as browser `submitRun`
- Rate limit: use simple in-memory counter (acceptable for V1 single-server deployment)

**Commit:** `feat: CLI API — PAT auth, run submission endpoint`

---

### Task 9.2: PAT management UI

**Files:**
- Create: `src/components/auth/pat-manager.tsx`
- Create: `src/app/auth/tokens/page.tsx`

Token list, create dialog (shows token once), copy button, revoke button.

**Commit:** `feat: PAT management UI — create, list, revoke tokens`

---

## Phase 10: User Profile Page

### Task 10.1: User profile page

**Files:**
- Create: `src/components/user/user-card.tsx`
- Create: `src/components/user/user-hypothesis-list.tsx`
- Create: `src/components/user/user-run-list.tsx`
- Create: `src/app/users/[handle]/page.tsx`
- Create: `src/app/users/[handle]/loading.tsx`

Display user avatar, handle, join date. List their hypotheses and runs.

**Commit:** `feat: user profile page — hypotheses and runs by user`

---

## Phase 11: Hardening + Polish

### Task 11.1: Security hardening

- Verify RLS policies with test cases (anonymous read, cross-user write rejection)
- Add CSP headers in `next.config.ts`
- Verify `SUPABASE_SERVICE_ROLE_KEY` never in client bundle (already guarded by `server-only`)
- File upload validation: size limits, extension allowlist
- Test multipart upload size on Vercel (adjust body size limit if needed)

**Commit:** `chore: security hardening — CSP, RLS verification, upload limits`

---

### Task 11.2: Test coverage

- Unit tests for all parsers, validators, utils (already done in Phase 1-2)
- Add component tests for HypothesisCard, RunCard using Testing Library
- Add integration tests for server actions (hypothesis CRUD, run submission)
- Target: 80%+ coverage on core logic

**Commit:** `test: component and integration tests, 80%+ coverage`

---

### Task 11.3: Final polish

- Responsive layout check on mobile viewport
- Verify all pages render with seed data
- Performance: bundle analysis, dynamic imports for heavy components (Recharts, TanStack Table)
- Add `export const revalidate = 60` on feed page for ISR

**Commit:** `chore: responsive polish, performance optimization, ISR`

---

## Out of Scope for V1

These are explicitly cut:
- **Comments** — No comments table, UI, or threading
- **CLI tool** — API endpoint exists for agents, but standalone CLI package deferred
- **X/Twitter posting** — Deferred to post-launch
- **Search** — Basic text filtering only, no full-text search UI

---

## Task Dependency Graph

```
Phase 0 (Bootstrap)
  └─> Phase 1 (Types, Constants, Utils)
       ├─> Phase 2 (TSV Parsing) ─────────────────────┐
       └─> Phase 3 (Database) ──> Phase 4 (Auth) ──>  Phase 5 (Data Access)
                                   └─> Phase 6 (Layout + Shared)
                                                       │
Phase 5 + Phase 6 ──> Phase 7 (Hypothesis UI)
Phase 7 + Phase 2 ──> Phase 8 (Run UI)
Phase 5 + Phase 2 ──> Phase 9 (API + PAT)
Phase 5 ──────────> Phase 10 (User Profile)
All ──────────────> Phase 11 (Hardening)
```

Phases 2, 3 can run in **parallel** (both depend only on Phase 1).
Phases 5, 6 can run in **parallel** (both depend on Phase 4).
Phase 7 depends on both 5 and 6.
Phase 9 depends on 5 and 2 but NOT on 7 (can run parallel with UI phases).
