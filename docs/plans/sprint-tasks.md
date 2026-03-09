# Agentipedia V1 — Sprint Task List

Ordered, atomic implementation tasks with acceptance criteria. Each task is independently implementable and testable. Dependencies are noted.

**Architecture source documents:**
- `docs/plans/architecture.md` — Backend schema, API contracts, data flows
- `docs/plans/frontend-architecture.md` — Component hierarchy, layouts, charts, routes

**Resolved architecture decisions:**
- PAT hashing: SHA-256 (not bcrypt) — tokens are high-entropy random strings, fast lookup matters
- Storage: Single `run-files` bucket, path: `{hypothesis_id}/{run_id}/{filename}`
- Hypothesis status: `open` | `closed` (not `published`)
- RLS: All data is publicly readable (no auth required for SELECT), writes require auth
- Column naming: `user_id` consistently across all tables

---

## Phase 0: Project Bootstrap
**Complexity: S | Dependencies: None**

### Task 0.1: Initialize Next.js project
- Initialize Next.js 15 with App Router, TypeScript, Tailwind, `src/` directory
- Install core dependencies: `@supabase/supabase-js`, `@supabase/ssr`, `papaparse`, `recharts`, `@tanstack/react-table`, `zod`, `clsx`, `tailwind-merge`, `date-fns`
- Install dev deps: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`
- Configure `tsconfig.json` with `@/` path alias
- Create `.env.example` with all required env vars
- Create `.gitignore` (include `.env.local`, `.next`, `node_modules`)
- **AC:** `npm run dev` starts without errors, `npm run build` succeeds

### Task 0.2: Configure shadcn/ui and design system
- Run `npx shadcn@latest init` with dark theme
- Install shadcn/ui components: button, card, input, label, select, textarea, badge, table, dialog, dropdown-menu, skeleton, tabs, tooltip, separator, toast, chart
- Configure `tailwind.config.ts` with custom colors: status (keep=green, discard=gray, crash=red), 11 domain badge colors
- Set `class="dark"` on root html element (dark mode only for V1)
- Install Inter + JetBrains Mono fonts via `next/font`
- Create `src/lib/utils/cn.ts` (clsx + tailwind-merge)
- **AC:** All shadcn components importable, dark mode renders correctly, fonts load

---

## Phase 1: Foundation — Types, Constants, Utilities
**Complexity: S | Dependencies: Phase 0**

### Task 1.1: Constants and enums
- Create `src/lib/utils/constants.ts`: `DOMAINS` array (11 items with labels + values), `METRIC_DIRECTIONS`, `EXPERIMENT_STATUSES`, `HYPOTHESIS_STATUSES`, `MAX_TSV_SIZE` (5MB), `MAX_CODE_SIZE` (1MB), `ALLOWED_CODE_EXTENSIONS`
- **AC:** All constants exported and typed

### Task 1.2: Application types
- Create `src/types/hypothesis.ts`: `Hypothesis`, `HypothesisCard` (with run count + best result), `HypothesisFormData`
- Create `src/types/run.ts`: `Run`, `RunCard`, `RunDetail`, `RunFormData`
- Create `src/types/experiment.ts`: `Experiment`, `ParsedTsvRow`, `TsvStats`
- Create `src/types/user.ts`: `UserProfile`
- Create `src/types/api.ts`: `ApiResponse<T>`, `ApiError`
- Create `src/types/pat.ts`: `PersonalAccessToken`, `PatCreateResponse`
- **AC:** All types exported, no `any` types, strict TypeScript

### Task 1.3: Utility functions
- Create `src/lib/utils/format.ts`: `formatMetric(value, decimals)`, `formatPercentage(value)`, `formatNumber(value)`, `formatFileSize(bytes)`
- Create `src/lib/utils/errors.ts`: `AppError` class with code + message, `getErrorMessage(error)`
- Create `src/lib/utils/url.ts`: `hypothesisUrl(id)`, `runUrl(id)`, `userUrl(handle)`
- **AC:** Unit tests pass for all formatters, error handling covers unknown errors

### Task 1.4: Zod validation schemas
- Create `src/lib/validators/hypothesis-schema.ts`: title (10-300 chars), description (20-10000), domain (enum), dataset_url (valid URL), dataset_name, metric_name, metric_direction (enum), optional baseline_to_beat, optional tags
- Create `src/lib/validators/run-schema.ts`: goal (1-500 chars), hardware, time_budget, model_size, optional tags, optional forked_from (uuid)
- Create `src/lib/validators/tsv-schema.ts`: row-level validation (commit string, metric_value number, memory_gb number, status enum, description string)
- **AC:** Unit tests validate correct inputs pass and invalid inputs return specific error messages

---

## Phase 2: TSV Parsing Engine
**Complexity: M | Dependencies: Phase 1**

### Task 2.1: TSV parser
- Create `src/lib/parsers/tsv-parser.ts`: wrapper around PapaParse with config `{ delimiter: '\t', header: true, skipEmptyLines: true, dynamicTyping: false }`
- Accept File or string input, return `{ rows: ParsedTsvRow[], errors: string[] }`
- Enforce max 100,000 rows, max 5MB file size
- Check for binary content (null bytes in first 8KB)
- **AC:** Parses valid fixture TSV correctly, rejects binary files, rejects oversized files

### Task 2.2: TSV validator
- Create `src/lib/parsers/tsv-validator.ts`: validates parsed rows against tsv-schema
- Check: exactly 5 columns, required column headers present, metric_value is numeric, memory_gb is numeric, status is keep/discard/crash
- Return array of errors with row numbers: "Row 47: status must be keep/discard/crash, got 'kept'"
- **AC:** Unit tests cover: valid TSV passes, wrong columns rejected, bad types rejected, empty file rejected

### Task 2.3: TSV stats extractor
- Create `src/lib/parsers/tsv-stats.ts`: compute from parsed rows
- `baseline_metric`: metric_value where commit = "baseline"
- `best_metric`: best metric among keep rows (respects metric_direction parameter)
- `best_description`: description from best keep row
- `num_experiments`, `num_kept`, `num_discarded`, `num_crashed`: counts by status
- `improvement_pct`: `abs(best - baseline) / baseline * 100`
- **AC:** Unit tests with fixture TSV return correct stats, handles no-baseline edge case, handles all-crash edge case

### Task 2.4: Test fixtures
- Create `tests/fixtures/valid-results.tsv`: 125 rows, mix of keep/discard/crash, baseline row first
- Create `tests/fixtures/invalid-results.tsv`: missing columns, bad types
- Create `tests/fixtures/sample-train.py`: sample Python code file (~50 lines)
- **AC:** Fixtures exist and are referenced by parser tests

---

## Phase 3: Database Layer
**Complexity: M | Dependencies: Phase 1**

### Task 3.1: Supabase migrations — tables
- Create migrations for: users, api_tokens, hypotheses, runs, experiments tables
- All enums as Postgres ENUMs
- All FK constraints with ON DELETE CASCADE or SET NULL (forked_from)
- All CHECK constraints (title length, description length, etc.)
- Enable RLS on every table
- **AC:** `supabase db push` succeeds, all tables created with correct columns and constraints

### Task 3.2: Supabase migrations — RLS policies
- Write RLS policies per security architecture:
  - All tables: SELECT open to all (including anonymous) for public data
  - INSERT/UPDATE/DELETE: restricted to `auth.uid() = user_id`
  - Experiments: INSERT requires ownership of parent run
  - API tokens: all operations restricted to owner only
- **AC:** RLS policies created, test that anonymous can read hypotheses/runs, cannot write

### Task 3.3: Supabase migrations — indexes and functions
- Create indexes per architecture: domain+created_at composite, GIN for text search, hypothesis_id+best_metric for run leaderboards, run_id+sequence for experiments
- Create `hypothesis_feed` view joining run aggregates (run_count, best_metric, best_user)
- **AC:** Indexes created, view returns correct aggregated data for sample data

### Task 3.4: Supabase migrations — storage
- Create `run-files` bucket (private)
- Storage policies: public read for all files, authenticated write with path validation
- Content-Type override to `text/plain` on download
- **AC:** Can upload and download files via Supabase Storage API

### Task 3.5: Seed data
- Create `supabase/seed.sql` with 3 sample hypotheses, 5-8 runs across them, experiments parsed from fixture TSV
- Include 2 sample users
- **AC:** Seed data loads, feed shows hypotheses with run counts

---

## Phase 4: Supabase Client + Auth
**Complexity: M | Dependencies: Phase 3**

### Task 4.1: Supabase client setup
- Create `src/lib/supabase/client.ts` — browser client using `createBrowserClient`
- Create `src/lib/supabase/server.ts` — server client using `createServerClient` with cookie handling
- Create `src/lib/supabase/admin.ts` — service-role client for API routes (PAT validation)
- **AC:** All three clients instantiate correctly, server client reads auth from cookies

### Task 4.2: Auth middleware
- Create `src/lib/supabase/middleware.ts` — session refresh logic
- Create `middleware.ts` at project root — refresh session on every request
- **AC:** Session refreshes automatically, expired sessions redirect to login

### Task 4.3: OAuth flow
- Create `src/app/auth/callback/route.ts` — exchange OAuth code for session
- Create `src/app/auth/login/page.tsx` — "Sign in with X" button
- Create `src/app/auth/signout/route.ts` — clear session, redirect to home
- Configure Supabase Auth with X/Twitter OAuth provider
- Create auth trigger to sync X profile data to `public.users` on login
- **AC:** Full OAuth flow works: login → callback → session created → user row in public.users → signout clears session

---

## Phase 5: Data Access Layer
**Complexity: M | Dependencies: Phase 4**

### Task 5.1: Hypothesis queries
- Create `src/lib/queries/hypothesis-queries.ts`:
  - `getHypotheses(filters, sort, cursor)` — feed query using `hypothesis_feed` view, cursor-based pagination
  - `getHypothesisById(id)` — full hypothesis with poster info
- **AC:** Feed returns paginated hypotheses with run count/best result, filters by domain/status work, sort by newest/most_active/best_result works

### Task 5.2: Run queries
- Create `src/lib/queries/run-queries.ts`:
  - `getRunsByHypothesis(hypothesisId, sort)` — all runs for a hypothesis, sorted by best_metric/newest/improvement
  - `getRunById(id)` — full run with user info
  - `getExperimentsByRunId(runId)` — all experiment rows ordered by sequence
- **AC:** Runs return with correct sort, experiments return in sequence order

### Task 5.3: User queries
- Create `src/lib/queries/user-queries.ts`:
  - `getCurrentUser()` — from session
  - `getUserByHandle(handle)` — for profile pages
- **AC:** Returns user with correct X profile data

### Task 5.4: Hypothesis actions (mutations)
- Create `src/lib/actions/hypothesis-actions.ts`:
  - `createHypothesis(formData)` — validate with Zod, insert, revalidatePath
  - `updateHypothesis(id, formData)` — validate ownership + Zod, update
  - `deleteHypothesis(id)` — validate ownership, delete (cascades runs/experiments)
- **AC:** Create returns new hypothesis, update modifies only owner's hypothesis, delete cascades

### Task 5.5: Run actions (mutations)
- Create `src/lib/actions/run-actions.ts`:
  - `submitRun(hypothesisId, formData, resultsTsv, codeFile)` — the core flow:
    1. Validate form with Zod
    2. Parse TSV server-side (re-parse, don't trust client)
    3. Validate TSV structure and extract stats
    4. Upload results.tsv to Supabase Storage
    5. Upload code file to Supabase Storage
    6. Insert run row with auto-extracted stats
    7. Batch insert all experiment rows
    8. Revalidate hypothesis detail page
    9. Return run URL
- **AC:** Full submission flow works end-to-end, TSV is re-parsed server-side, stats match fixture expectations, files downloadable from storage

### Task 5.6: PAT actions
- Create `src/lib/actions/pat-actions.ts`:
  - `createPat(name)` — generate `agp_<random>`, store SHA-256 hash, return raw token once
  - `listPats()` — return user's tokens (name, created_at, last_used_at, revoked status, last 4 chars)
  - `revokePat(id)` — set revoked_at timestamp
- **AC:** Token generated with `agp_` prefix, hash stored (not plaintext), revoked token rejects on validation

---

## Phase 6: Layout + Shared Components
**Complexity: S | Dependencies: Phase 4**

### Task 6.1: App layout
- Create `src/app/layout.tsx` — root layout with Inter font, dark mode, Toaster
- Create `src/components/layout/header.tsx` — logo, "New Hypothesis" button (if authed), user menu / login button
- Create `src/components/layout/user-menu.tsx` — avatar dropdown: settings, sign out (client component)
- Create `src/components/layout/footer.tsx` — minimal footer
- **AC:** Layout renders, nav shows correct auth state, responsive on mobile

### Task 6.2: Shared UI components
- Create `src/components/shared/metric-display.tsx` — formatted value with up/down arrow based on direction
- Create `src/components/shared/user-avatar.tsx` — X avatar image with handle link
- Create `src/components/shared/time-ago.tsx` — relative timestamps ("2 hours ago")
- Create `src/components/shared/empty-state.tsx` — icon + heading + description + optional CTA
- Create `src/components/shared/file-upload.tsx` — drag-and-drop zone with validation (client component)
- Create `src/components/shared/error-banner.tsx` — inline error display
- Create `src/components/hypothesis/domain-badge.tsx` — colored badge per domain
- **AC:** All components render correctly with various prop combinations

### Task 6.3: Error and loading pages
- Create `src/app/not-found.tsx` — 404 page
- Create `src/app/error.tsx` — global error boundary (client component)
- Create skeleton components for feed and detail pages
- **AC:** 404 renders for unknown routes, error boundary catches render errors

---

## Phase 7: Hypothesis UI
**Complexity: L | Dependencies: Phase 5, Phase 6**

### Task 7.1: Hypothesis feed page
- Create `src/components/hypothesis/hypothesis-card.tsx` — server component: domain badge, title, dataset, metric info, run count, best result, tags, poster avatar+timestamp
- Create `src/components/hypothesis/hypothesis-feed.tsx` — list of cards with load-more pagination
- Create `src/components/hypothesis/hypothesis-filters.tsx` — client component: domain select, status select, sort select, search input. Pushes to URL search params
- Create `src/app/page.tsx` — server component: reads search params, calls getHypotheses, renders filters + feed
- Create `src/app/loading.tsx` — card skeleton grid
- **AC:** Feed displays hypotheses from seed data, filters work (domain, status, sort), pagination loads more results

### Task 7.2: Create hypothesis page
- Create `src/components/hypothesis/hypothesis-form.tsx` — client component: all fields per schema, domain dropdown, metric direction toggle, Zod validation, submit via server action
- Create `src/app/hypotheses/new/page.tsx` — protected page (redirect to login if not authed)
- **AC:** Form validates all fields, submits successfully, redirects to new hypothesis detail page, appears in feed

### Task 7.3: Hypothesis detail page
- Create `src/components/hypothesis/hypothesis-header.tsx` — title, full description, poster info, timestamps, edit button (if owner)
- Create `src/components/hypothesis/hypothesis-info.tsx` — dataset link, metric name+direction, baseline to beat, starter code, hardware recommendation, tags
- Create `src/components/hypothesis/cross-run-chart.tsx` — client component: Recharts ComposedChart, x=submission order, y=best_metric per run, dots labeled with user handle, optional baseline reference line
- Create `src/components/run/run-card.tsx` — goal, baseline→best (improvement%), experiment counts, hardware/model/time, tags, poster
- Create `src/components/run/run-list.tsx` — sortable list of run-cards, sort toggle (best/newest/most_improved)
- Create `src/app/hypotheses/[hypothesisId]/page.tsx` — server component: fetch hypothesis + runs, render header + info + chart + run list + "Submit Run" button
- **AC:** Detail page renders all sections, cross-run chart shows all runs, run list sorts correctly, "Submit Run" links to submission form

### Task 7.4: Edit hypothesis page
- Create `src/app/hypotheses/[hypothesisId]/edit/page.tsx` — protected (owner only), pre-filled form, calls updateHypothesis action
- **AC:** Only owner can access, form pre-fills, update saves and redirects to detail

---

## Phase 8: Run UI
**Complexity: L | Dependencies: Phase 7, Phase 2**

### Task 8.1: Run submission form
- Create `src/components/run/tsv-preview.tsx` — client component: on file select, parse TSV client-side with PapaParse, show stats (baseline, best, counts, improvement), show first/last 5 rows, show validation errors
- Create `src/components/run/run-form.tsx` — client component: file-upload for results.tsv (triggers tsv-preview), file-upload for code file, goal input, hardware input, time_budget input, model_size input, optional tags, optional forked_from. Submit calls submitRun server action
- Create `src/app/hypotheses/[hypothesisId]/runs/new/page.tsx` — protected page, inherits hypothesis context (metric name, direction shown)
- **AC:** TSV preview shows correct stats on valid file, shows errors on invalid file, form validates all fields, successful submission redirects to new run detail page

### Task 8.2: Run detail page
- Create `src/components/run/run-header.tsx` — goal, poster info, timestamps, download buttons (results.tsv, code file)
- Create `src/components/run/run-stats.tsx` — baseline → best with arrow, improvement %, experiment counts (kept/discarded/crashed with color dots)
- Create `src/components/run/progression-chart.tsx` — client component: Recharts ComposedChart, x=sequence, y=metric_value, dots color-coded (green=keep, gray=discard, red=crash), step line connecting keeps only, baseline reference line, tooltips with commit hash + description
- Create `src/components/run/experiment-table.tsx` — client component: TanStack Table with columns (sequence, commit, metric, memory, status, description), sortable on sequence/metric/memory, filterable by status dropdown, color-coded status badges, best row highlighted
- Create `src/components/run/code-viewer.tsx` — client component: syntax-highlighted code display (use shiki or react-syntax-highlighter), download button, copy button
- Create `src/app/runs/[runId]/page.tsx` — server component: fetch run + experiments + code file content, render all sections
- **AC:** All sections render with seed data, chart shows correct color coding, table sorts and filters, code viewer displays Python with syntax highlighting, download buttons work

---

## Phase 9: API Routes + PAT System
**Complexity: M | Dependencies: Phase 5, Phase 2**

### Task 9.1: CLI run submission API
- Create `src/app/api/runs/route.ts` — POST endpoint
  - Auth: validate PAT from `Authorization: Bearer agp_...` header using admin client
  - Accept: multipart/form-data (results_tsv file, code_file, hypothesis_id, goal, hardware, time_budget, model_size, optional tags, optional forked_from)
  - Process: identical pipeline to browser submitRun (parse TSV, validate, upload, insert)
  - Return: `{ success: true, data: { run_id, run_url } }` or `{ success: false, error: "..." }`
  - Rate limit: 10 submissions per user per hour
- **AC:** Valid PAT + valid TSV = successful run creation, invalid PAT = 401, invalid TSV = 400 with error details, rate limit enforced

### Task 9.2: PAT management API + UI
- Create `src/app/api/pats/route.ts` — POST (create), DELETE (revoke) endpoints, session-authenticated
- Create `src/components/settings/pat-manager.tsx` — client component: list tokens (name, created, last used, status), create button (shows token once in dialog), revoke button
- Create `src/app/settings/page.tsx` — protected page with PAT manager
- **AC:** Can create PAT (shown once), copy to clipboard works, can revoke PAT, revoked PAT no longer works for API auth

---

## Phase 10: X/Twitter Posting
**Complexity: S | Dependencies: Phase 8**

### Task 10.1: X/Twitter post integration
- Create `src/lib/x-twitter/post.ts` — compose tweet text from run data: hypothesis title, baseline→best, improvement%, hardware, run URL. Truncate to fit character limit.
- Create `src/app/api/x-post/route.ts` — POST endpoint, session-authenticated, posts to X on behalf of user
- Add opt-in checkbox to run submission form: "Post to X when submitting"
- X posting is non-blocking: if it fails, the run is still saved
- **AC:** Tweet posts with correct content, failure doesn't block run submission, opt-in works

---

## Phase 11: CLI Tool
**Complexity: M | Dependencies: Phase 9**

### Task 11.1: CLI scaffold
- Initialize `cli/` as standalone npm package (`@agentipedia/cli`)
- Install deps: `commander`, `chalk`, `ora`, `node-fetch`, `papaparse`
- Create `cli/src/lib/config.ts` — read/write `~/.agentipedia` JSON config (api_url, pat)
- Create `cli/src/lib/output.ts` — terminal formatting helpers
- Create `cli/src/index.ts` — commander program with three commands
- **AC:** `npx agentipedia --help` shows commands, `--version` shows version

### Task 11.2: CLI auth command
- Create `cli/src/commands/auth.ts` — prompts for PAT, validates by calling API, stores in config
- **AC:** `agentipedia auth` prompts, stores PAT, subsequent commands use stored PAT

### Task 11.3: CLI submit command
- Create `cli/src/commands/submit.ts`:
  - Required: `--hypothesis <id>`, `--results <path>`, `--code <path>`, `--goal "..."`, `--hardware "..."`, `--time-budget "..."`, `--model-size "..."`
  - Optional: `--tag1`, `--tag2`, `--forked-from <id>`, `--post-to-x`
  - Validates files exist and TSV parses locally (fast fail)
  - Uploads via POST /api/runs with PAT auth
  - Shows spinner during upload, prints run URL on success
- **AC:** Successful submission prints run URL, invalid TSV fails before network call, missing PAT shows helpful error

### Task 11.4: CLI list command
- Create `cli/src/commands/list.ts` — list hypotheses with domain filter, shows id + title + metric + run count
- **AC:** Lists hypotheses in table format, domain filter works

---

## Phase 12: Hardening + Polish
**Complexity: M | Dependencies: All prior phases**

### Task 12.1: Security hardening
- Verify RLS policies with test cases (anonymous read, cross-user write rejection)
- Add CSP headers via `next.config.ts`
- Verify `SUPABASE_SERVICE_ROLE_KEY` never appears in client bundle
- Add `server-only` imports to all server modules accessing secrets
- File upload validation: size limits, extension allowlist, binary check
- **AC:** Security checklist passes, no secrets in client bundle, RLS prevents unauthorized writes

### Task 12.2: Testing
- Unit tests for TSV parser, validator, stats extractor
- Unit tests for Zod schemas
- Unit tests for utility functions
- Component tests for hypothesis-card, run-card
- Integration tests for server actions (hypothesis CRUD, run submission)
- **AC:** 80%+ code coverage on core logic (parsers, validators, actions)

### Task 12.3: Polish and deploy
- Verify all pages render correctly with seed data
- Check responsive layout on mobile viewport
- Verify OAuth flow end-to-end on Vercel preview
- Performance check: bundle size, Core Web Vitals
- Create production Supabase project and run migrations
- Deploy to Vercel with production env vars
- **AC:** Production deploy accessible, OAuth works, seed data visible, all pages functional
