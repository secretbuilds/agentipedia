# Frontend Architecture Blueprint

Detailed frontend blueprint for Agentipedia V1. This document is implementation-ready — a frontend developer agent should be able to build from this without ambiguity.

Tech stack: Next.js 15 (App Router), Tailwind CSS, shadcn/ui, Recharts (via shadcn charts), TanStack Table (via shadcn data table), Supabase client SDK, PapaParse.

---

## 1. Route Structure

All routes use the Next.js App Router under `src/app/`.

```
src/app/
  layout.tsx                    # Root layout (server component)
  page.tsx                      # Feed/Home — hypothesis list
  loading.tsx                   # Root loading skeleton
  error.tsx                     # Root error boundary
  not-found.tsx                 # 404 page

  hypotheses/
    [hypothesisId]/
      page.tsx                  # Hypothesis detail
      loading.tsx
      error.tsx
      submit-run/
        page.tsx                # Submit Run form (within hypothesis context)
        loading.tsx

  runs/
    [runId]/
      page.tsx                  # Run detail
      loading.tsx
      error.tsx

  create-hypothesis/
    page.tsx                    # Create Hypothesis form
    loading.tsx

  users/
    [handle]/
      page.tsx                  # User profile
      loading.tsx
      error.tsx

  auth/
    callback/
      route.ts                 # OAuth callback handler (route handler, not page)
    login/
      page.tsx                 # Login page with X/Twitter OAuth button
    tokens/
      page.tsx                 # PAT generation page (authenticated)
```

### Dynamic Segments

| Segment | Example | Source |
|---------|---------|--------|
| `[hypothesisId]` | `hypotheses/a1b2c3d4-...` | UUID from database |
| `[runId]` | `runs/e5f6g7h8-...` | UUID from database |
| `[handle]` | `users/karpathy` | X/Twitter handle (without @) |

### URL Search Params (Feed Page)

All filter and sort state lives in URL search params for shareability.

| Param | Type | Default | Values |
|-------|------|---------|--------|
| `domain` | string | `""` (all) | Any curated domain slug |
| `dataset` | string | `""` | Free text search |
| `metric` | string | `""` | Free text search |
| `tag` | string | `""` | Free text search |
| `status` | string | `"open"` | `open`, `closed`, `all` |
| `sort` | string | `"newest"` | `newest`, `most_active`, `best_result` |
| `page` | number | `1` | Pagination offset |

Example: `/?domain=llm-training&sort=most_active&tag=attention`

### URL Search Params (Hypothesis Detail — Run List)

| Param | Type | Default | Values |
|-------|------|---------|--------|
| `run_sort` | string | `"best"` | `best`, `newest`, `most_improved`, `most_experiments` |
| `run_hardware` | string | `""` | Free text search |
| `run_model_size` | string | `""` | Free text search |

---

## 2. Layout System

### App Shell

```
+----------------------------------------------------------+
|  TopNav (full width, fixed)                              |
|  [Logo/Wordmark]  [Search]           [Create] [Avatar]  |
+----------------------------------------------------------+
|                                                          |
|  Main Content Area (centered, max-w-5xl)                 |
|                                                          |
|                                                          |
+----------------------------------------------------------+
```

No sidebar. The platform is content-focused with a single-column layout, like GitHub issues. The top nav is the only persistent chrome.

### Root Layout (`src/app/layout.tsx`) — Server Component

Responsibilities:
- HTML shell with dark mode class on `<html>`
- Font loading (Inter for UI, JetBrains Mono for code/metrics)
- `<ThemeProvider>` from shadcn (wraps `next-themes`)
- `<SupabaseProvider>` for auth context
- `<TopNav />` rendered above `{children}`
- `<Toaster />` from shadcn for notifications

### Page Layout Patterns

**Feed layout** (Home):
- Full-width filter bar below nav
- Card grid below filters: single column on mobile, single column on desktop (list layout, not grid — data density matters more than visual tiles)
- Pagination at bottom

**Detail layout** (Hypothesis Detail, Run Detail):
- Breadcrumb at top: `Home > Hypothesis Title` or `Home > Hypothesis Title > Run by @handle`
- Header section (title, metadata, badges)
- Tab-style sections or stacked sections with clear visual dividers
- Sticky "back to top" / "jump to section" not needed for V1

**Form layout** (Create Hypothesis, Submit Run):
- Centered narrow container (max-w-2xl)
- Vertical form with grouped sections
- Sticky submit button bar at bottom on mobile

### Responsive Strategy

Primary audience is desktop (ML researchers at workstations). Mobile is functional but not optimized.

| Breakpoint | Behavior |
|-----------|----------|
| `< 640px` (sm) | Single column, stacked cards, collapsible filter bar, hamburger menu for nav |
| `640px - 1024px` (md) | Single column with more horizontal space for metadata |
| `> 1024px` (lg) | Full layout, charts render at full width, tables scroll horizontally if needed |

Charts and data tables are scroll-responsive on mobile (horizontal scroll wrapper) rather than redesigned.

---

## 3. Component Hierarchy

### Naming Convention

- `PascalCase` for all components
- Prefix with page context where page-specific: `HypothesisCard`, `RunCard`
- Shared components have no prefix: `DomainBadge`, `MetricDisplay`

### Server vs Client Component Decision

**Server components** (default in App Router): Any component that only renders data fetched at request time and has no interactivity. These fetch data directly via Supabase server client.

**Client components** (`"use client"`): Any component that uses hooks, event handlers, browser APIs, or needs to re-render based on user interaction.

### Component Tree

```
src/
  app/
    layout.tsx                          [SERVER]
    page.tsx                            [SERVER] — Feed page, fetches hypotheses
    hypotheses/[hypothesisId]/
      page.tsx                          [SERVER] — Hypothesis detail, fetches hypothesis + runs
      submit-run/page.tsx               [SERVER] — shell for SubmitRunForm
    runs/[runId]/
      page.tsx                          [SERVER] — Run detail, fetches run + experiments
    create-hypothesis/page.tsx          [SERVER] — shell for CreateHypothesisForm
    users/[handle]/page.tsx             [SERVER] — User profile, fetches user data
    auth/login/page.tsx                 [CLIENT] — Login button interaction
    auth/callback/route.ts              [SERVER] — Route handler (not a component)
    auth/tokens/page.tsx                [CLIENT] — PAT management

  components/
    layout/
      TopNav.tsx                        [CLIENT] — Logo, search input, create button, user menu
      Breadcrumb.tsx                    [SERVER] — Path breadcrumb
      PageHeader.tsx                    [SERVER] — Title + description + badges section
      EmptyState.tsx                    [SERVER] — Placeholder for empty lists

    hypothesis/
      HypothesisFeed.tsx                [CLIENT] — Filter bar + card list + pagination
      HypothesisFilterBar.tsx           [CLIENT] — Domain select, search inputs, sort toggle
      HypothesisCard.tsx                [SERVER] — Single hypothesis card in feed
      HypothesisHeader.tsx              [SERVER] — Full header on detail page
      HypothesisChallengeInfo.tsx       [SERVER] — Dataset, metric, starter code, hardware
      HypothesisProgressionChart.tsx    [CLIENT] — Recharts multi-series overlay
      CreateHypothesisForm.tsx          [CLIENT] — Full creation form

    run/
      RunList.tsx                       [CLIENT] — Sort toggle + run card list (within hypothesis)
      RunCard.tsx                       [SERVER] — Single run card
      RunHeader.tsx                     [SERVER] — Full header on detail page
      RunProgressionChart.tsx           [CLIENT] — Recharts color-coded experiment chart
      RunExperimentTable.tsx            [CLIENT] — TanStack Table of experiments
      RunCodeViewer.tsx                 [CLIENT] — Syntax-highlighted code with download
      SubmitRunForm.tsx                 [CLIENT] — File upload + metadata form
      TsvPreviewTable.tsx              [CLIENT] — Auto-parsed TSV confirmation display
      ForkLineage.tsx                   [SERVER] — Chain display: original -> fork 1 -> this run

    user/
      UserAvatar.tsx                    [SERVER] — Avatar image + handle
      UserCard.tsx                      [SERVER] — Profile card (avatar, handle, stats)
      UserHypothesisList.tsx            [SERVER] — Hypotheses posted by user
      UserRunList.tsx                   [SERVER] — Runs submitted by user

    shared/
      DomainBadge.tsx                   [SERVER] — Colored badge for domain
      MetricDisplay.tsx                 [SERVER] — Metric name + direction arrow + value
      MetricDirectionIndicator.tsx      [SERVER] — Up/down arrow icon
      StatusDot.tsx                     [SERVER] — Colored dot: green/gray/red
      TagList.tsx                       [SERVER] — Renders tag_1 and tag_2 as pills
      TimestampDisplay.tsx              [SERVER] — Relative time (e.g., "2 hours ago")
      FileUploadDropzone.tsx            [CLIENT] — Drag-and-drop file upload area
      SortToggle.tsx                    [CLIENT] — Toggle button group for sort options
      Pagination.tsx                    [CLIENT] — Page navigation
      CodeBlock.tsx                     [CLIENT] — Syntax-highlighted code (uses shiki or prism)

    auth/
      LoginButton.tsx                   [CLIENT] — "Sign in with X" button
      AuthGuard.tsx                     [CLIENT] — Wraps pages that require authentication
      PatManager.tsx                    [CLIENT] — PAT generation and management UI

  lib/
    supabase/
      client.ts                        # Browser Supabase client (singleton)
      server.ts                        # Server Supabase client (per-request via cookies)
      middleware.ts                     # Auth session refresh middleware
    tsv-parser.ts                      # PapaParse wrapper for results.tsv
    format.ts                          # Number formatting, relative time, metric display
    constants.ts                       # Domain list, status enums, color mappings
    types.ts                           # TypeScript types mirroring data models
    validators.ts                      # Zod schemas for form validation
    url-state.ts                       # Search param read/write utilities
```

### Component Props (Key Components)

**HypothesisCard**

```ts
type HypothesisCardProps = {
  hypothesis: {
    id: string
    title: string
    domain: Domain
    dataset_name: string
    metric_name: string
    metric_direction: MetricDirection
    baseline_to_beat: number | null
    tag_1: string | null
    tag_2: string | null
    created_at: string
    status: HypothesisStatus
    user: { x_handle: string; x_avatar_url: string }
    run_count: number
    best_run: {
      best_metric: number
      user: { x_handle: string }
    } | null
  }
}
```

**RunCard**

```ts
type RunCardProps = {
  run: {
    id: string
    goal: string
    baseline_metric: number
    best_metric: number
    improvement_pct: number
    num_experiments: number
    num_kept: number
    num_discarded: number
    num_crashed: number
    hardware: string
    model_size: string
    time_budget: string
    tag_1: string | null
    tag_2: string | null
    forked_from: string | null
    created_at: string
    user: { x_handle: string; x_avatar_url: string }
    comment_count: number
  }
  metric_name: string
  metric_direction: MetricDirection
}
```

**HypothesisProgressionChart**

```ts
type HypothesisProgressionChartProps = {
  runs: Array<{
    id: string
    best_metric: number
    created_at: string
    user: { x_handle: string }
  }>
  metric_name: string
  metric_direction: MetricDirection
  baseline_to_beat: number | null
}
```

**RunProgressionChart**

```ts
type RunProgressionChartProps = {
  experiments: Array<{
    sequence: number
    commit_hash: string
    metric_value: number
    memory_gb: number
    status: ExperimentStatus
    description: string
  }>
  metric_name: string
  metric_direction: MetricDirection
}
```

**RunExperimentTable**

```ts
type RunExperimentTableProps = {
  experiments: Array<{
    sequence: number
    commit_hash: string
    metric_value: number
    memory_gb: number
    status: ExperimentStatus
    description: string
  }>
  metric_name: string
  metric_direction: MetricDirection
}
```

---

## 4. State Management

### Principle

No global client state store (no Redux, no Zustand). State is managed through three channels:

1. **Server state**: Data fetched in server components via Supabase server client. This is the primary data path.
2. **URL state**: Filter, sort, and pagination state lives in URL search params. Shareable and bookmarkable.
3. **Local client state**: Form state (React Hook Form + Zod), UI toggles (open/closed), file upload state.

### Server State (Data Fetching)

Every page-level server component fetches its own data. No client-side data fetching library (no SWR, no React Query) for V1 — server components handle it.

```
Feed page:
  - Reads search params from URL
  - Fetches hypotheses with filters/sort/pagination via Supabase server client
  - Passes data as props to HypothesisFeed

Hypothesis detail page:
  - Fetches hypothesis by ID
  - Fetches runs for that hypothesis (with sort from URL params)
  - Fetches run best_metric data for progression chart
  - Passes data as props to child components

Run detail page:
  - Fetches run by ID (includes parent hypothesis for metric context)
  - Fetches all experiments for that run
  - Fetches code file content from Supabase Storage
  - Passes data as props to child components

User profile page:
  - Fetches user by handle
  - Fetches user's hypotheses and runs
  - Passes data as props to child components
```

### URL State (Filters/Sort)

All filter and sort interactions update URL search params via `useRouter().push()` or `useRouter().replace()` from `next/navigation`. This triggers a server component re-fetch.

Implementation pattern in client filter components:

```ts
// In HypothesisFilterBar (client component)
// Read current params
const searchParams = useSearchParams()
const currentDomain = searchParams.get("domain") ?? ""

// Update params on change
const router = useRouter()
const pathname = usePathname()

function updateParam(key: string, value: string) {
  const params = new URLSearchParams(searchParams.toString())
  if (value === "") {
    params.delete(key)
  } else {
    params.set(key, value)
  }
  params.set("page", "1") // Reset pagination on filter change
  router.replace(`${pathname}?${params.toString()}`)
}
```

### Form State

Forms use React Hook Form with Zod validation schemas. No lifting of form state — each form is self-contained.

**CreateHypothesisForm state:**
- All hypothesis fields (title, description, domain, dataset_url, etc.)
- Validation via `createHypothesisSchema` (Zod)
- Submit: POST to Supabase, redirect to new hypothesis page on success

**SubmitRunForm state:**
- File refs for results.tsv and code file
- Parsed TSV preview data (set after file upload, before form submit)
- Metadata fields (goal, hardware, time_budget, model_size, tags, forked_from)
- Multi-step: (1) upload files -> (2) preview parsed metrics -> (3) fill metadata -> (4) submit
- Submit: Upload files to Supabase Storage, insert run + experiments to database, redirect to run page

**TSV Parse Flow (client-side):**
1. User drops `results.tsv` onto `FileUploadDropzone`
2. `FileUploadDropzone` calls `onFileSelected(file)`
3. `SubmitRunForm` reads file with `PapaParse`, validates against TSV schema
4. If valid: extracts auto-parsed fields (baseline_metric, best_metric, counts, etc.), displays in `TsvPreviewTable`
5. If invalid: shows error with specific row/column that failed validation
6. User cannot proceed to metadata step until TSV is valid

### Auth State

Supabase Auth handles session management. A `SupabaseProvider` at the root provides auth context.

```
SupabaseProvider (client component, wraps app)
  - Creates browser Supabase client
  - Listens for auth state changes
  - Provides session/user via React context

useAuth() hook
  - Returns: { user, session, isLoading, signInWithTwitter, signOut }
  - Used by TopNav (avatar/login), AuthGuard, form submit handlers
```

Server components access auth via `supabase.auth.getUser()` using the server client.

---

## 5. Chart Specifications

### 5a. Hypothesis Progression Chart

**Purpose:** Show how the community has pushed the frontier over time across all runs submitted to a hypothesis.

**Component:** `HypothesisProgressionChart` (client component)

**Recharts Configuration:**

```
Chart type: ComposedChart (ScatterChart + ReferenceLine)
Width: 100% (ResponsiveContainer)
Height: 320px

X-axis:
  - dataKey: "submission_order" (1-based index, runs sorted by created_at)
  - label: "Run #"
  - type: "number"
  - tickCount: auto

Y-axis:
  - dataKey: "best_metric"
  - label: "{metric_name}"
  - domain: [auto-min with padding, auto-max with padding]
  - reversed: true when metric_direction === "lower_is_better"

Data series:
  - Scatter: one dot per run
    - Fill: hsl(var(--chart-1)) from shadcn theme
    - Size: 8px radius
  - ReferenceLine: baseline_to_beat (if set)
    - Stroke: hsl(var(--destructive)) dashed
    - Label: "Baseline to beat: {value}"

Tooltip (custom):
  - Run #{submission_order}
  - @{user.x_handle}
  - {metric_name}: {best_metric}
  - Submitted: {relative_time}

Data transformation:
  - Input: runs array sorted by created_at
  - Map to: [{ submission_order: 1, best_metric: 1.423, handle: "karpathy", ... }, ...]
  - Also compute running best line:
    - Line series connecting the best-so-far at each submission point
    - Stroke: hsl(var(--chart-2)) solid 2px
    - This shows the frontier advancing over time

Interaction:
  - Hover tooltip on each dot
  - Click dot to navigate to run detail page (onClick handler on Scatter)
```

### 5b. Run Progression Chart

**Purpose:** Show the full experiment journey within a single run — every attempt, its outcome, and the step-by-step improvement trajectory.

**Component:** `RunProgressionChart` (client component)

**Recharts Configuration:**

```
Chart type: ComposedChart (Scatter + Line)
Width: 100% (ResponsiveContainer)
Height: 400px

X-axis:
  - dataKey: "sequence"
  - label: "Experiment #"
  - type: "number"

Y-axis:
  - dataKey: "metric_value"
  - label: "{metric_name}"
  - domain: computed to exclude crash values (0) from scale calculation
  - reversed: true when metric_direction === "lower_is_better"

Data series (layered bottom to top):

  1. Scatter (all experiments):
     - Each dot colored by status:
       - keep:    fill = "hsl(142, 71%, 45%)"  (green-500)
       - discard: fill = "hsl(215, 14%, 50%)"  (gray-400, muted)
       - crash:   fill = "hsl(0, 84%, 60%)"    (red-500)
     - Size: keep = 10px, discard = 6px, crash = 8px (with X marker)
     - Discard dots at 50% opacity to visually de-emphasize
     - Crash dots plotted at their position on x-axis but at y = baseline_metric
       (not 0, to keep them on scale)

  2. StepLine (keeps only):
     - Data: filtered to status === "keep" only
     - Stroke: "hsl(142, 71%, 45%)" (green-500), 2px
     - Type: "stepAfter" — shows flat lines between improvements
     - connectNulls: true
     - This is the improvement trajectory

  3. ReferenceLine (baseline):
     - Y value: baseline experiment's metric_value
     - Stroke: hsl(var(--muted-foreground)) dashed 1px
     - Label: "Baseline: {value}"

Tooltip (custom):
  - Experiment #{sequence}
  - Commit: {commit_hash}
  - {metric_name}: {metric_value}
  - Memory: {memory_gb} GB
  - Status: {status} (with colored dot)
  - "{description}" (truncated to 120 chars)

Legend:
  - Green dot: Kept (improvement)
  - Gray dot: Discarded (no improvement)
  - Red dot: Crashed

Interaction:
  - Hover tooltip on each dot
  - No click navigation (experiments don't have their own pages)
```

**Custom Scatter Dot Rendering:**

The Scatter component needs a custom `shape` prop to render different shapes/colors per status. Implementation:

```ts
function ExperimentDot(props: {
  cx: number
  cy: number
  payload: Experiment
}) {
  const { cx, cy, payload } = props
  const status = payload.status

  if (status === "crash") {
    // Red X marker
    return <path d={`M${cx-4},${cy-4} L${cx+4},${cy+4} M${cx+4},${cy-4} L${cx-4},${cy+4}`}
                  stroke="hsl(0, 84%, 60%)" strokeWidth={2} />
  }
  if (status === "discard") {
    // Small gray dot, semi-transparent
    return <circle cx={cx} cy={cy} r={3} fill="hsl(215, 14%, 50%)" opacity={0.5} />
  }
  // keep: larger green dot
  return <circle cx={cx} cy={cy} r={5} fill="hsl(142, 71%, 45%)" />
}
```

---

## 6. Data Table Specification

### Experiment Table

**Component:** `RunExperimentTable` (client component)

**TanStack Table Configuration:**

```
Columns:

| Column ID     | Header        | Width  | Sortable | Filterable | Cell Rendering |
|---------------|---------------|--------|----------|------------|----------------|
| sequence      | #             | 60px   | yes      | no         | Right-aligned number |
| commit_hash   | Commit        | 90px   | no       | no         | Monospace font, truncated |
| metric_value  | {metric_name} | 120px  | yes      | no         | 6 decimal places, monospace. Bold if this row is the best kept. |
| memory_gb     | Memory (GB)   | 100px  | yes      | no         | 1 decimal place. "—" for crashes. |
| status        | Status        | 100px  | no       | yes        | StatusDot + label. Color-coded: green/gray/red. |
| description   | Description   | flex   | no       | yes        | Truncated to 2 lines. Full text in tooltip on hover. |

Default sort: sequence ascending (chronological order)

Status filter:
  - Dropdown with options: All, Keep, Discard, Crash
  - Maps to column filter on "status"

Description filter:
  - Text input for searching within descriptions
  - Maps to global filter or column filter

Pagination:
  - 50 rows per page (typical run has ~125 experiments)
  - Bottom pagination controls

Row styling:
  - Keep rows: left border 3px solid green-500
  - Discard rows: default styling, text at 70% opacity
  - Crash rows: left border 3px solid red-500, text at 70% opacity
  - Best kept row: background highlight with subtle green tint

Header:
  - Dynamic column header for metric: reads metric_name from parent hypothesis
  - Sort indicator arrows on sortable columns

Mobile behavior:
  - Horizontal scroll wrapper
  - sequence, metric_value, and status columns pinned (not pinned in V1 — just scroll)
```

**TanStack Table Setup:**

```ts
const columns: ColumnDef<Experiment>[] = [
  {
    accessorKey: "sequence",
    header: ({ column }) => <SortableHeader column={column} label="#" />,
    cell: ({ row }) => <span className="font-mono text-right">{row.getValue("sequence")}</span>,
    size: 60,
  },
  {
    accessorKey: "commit_hash",
    header: "Commit",
    cell: ({ row }) => <code className="font-mono text-xs">{row.getValue("commit_hash")}</code>,
    size: 90,
    enableSorting: false,
  },
  {
    accessorKey: "metric_value",
    header: ({ column }) => <SortableHeader column={column} label={metricName} />,
    cell: ({ row }) => {
      const value = row.getValue<number>("metric_value")
      const isBest = row.original.sequence === bestKeptSequence
      return (
        <span className={cn("font-mono", isBest && "font-bold text-green-400")}>
          {value.toFixed(6)}
        </span>
      )
    },
    size: 120,
  },
  {
    accessorKey: "memory_gb",
    header: ({ column }) => <SortableHeader column={column} label="Memory (GB)" />,
    cell: ({ row }) => {
      const status = row.original.status
      if (status === "crash") return <span className="text-muted-foreground">--</span>
      return <span className="font-mono">{row.getValue<number>("memory_gb").toFixed(1)}</span>
    },
    size: 100,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusCell status={row.getValue("status")} />,
    filterFn: "equals",
    size: 100,
    enableSorting: false,
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="line-clamp-2 text-sm">{row.getValue("description")}</span>
          </TooltipTrigger>
          <TooltipContent className="max-w-md">
            <p>{row.getValue("description")}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    ),
    enableSorting: false,
  },
]
```

---

## 7. CSS Architecture

### Approach

Tailwind CSS utility classes as the primary styling mechanism. shadcn/ui components provide the base design system. No custom CSS files except for a single `globals.css` that defines CSS custom properties.

### Dark Mode Implementation

Dark mode is the default and only mode for V1. Implemented via:

1. `<html class="dark">` set in root layout (hardcoded, no toggle for V1)
2. shadcn/ui's CSS custom properties in `globals.css` define all colors
3. All component color references use `hsl(var(--...))` tokens
4. If light mode is added later: swap to `next-themes` with system preference detection

### Design Tokens

**`src/app/globals.css`** — shadcn dark theme overrides plus Agentipedia-specific tokens:

```css
@layer base {
  :root {
    /* shadcn default dark theme tokens — customized */
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;

    /* Agentipedia-specific tokens */
    --status-keep: 142 71% 45%;
    --status-discard: 215 14% 50%;
    --status-crash: 0 84% 60%;

    --metric-improved: 142 71% 45%;
    --metric-worsened: 0 84% 60%;
    --metric-neutral: 215 14% 50%;

    /* Chart palette (shadcn chart tokens) */
    --chart-1: 220 70% 50%;
    --chart-2: 160 60% 45%;
    --chart-3: 30 80% 55%;
    --chart-4: 280 65% 60%;
    --chart-5: 340 75% 55%;

    /* Domain badge colors — one per curated domain */
    --domain-llm-training: 220 90% 56%;
    --domain-llm-inference: 200 90% 48%;
    --domain-robotics: 280 70% 55%;
    --domain-trading: 45 95% 50%;
    --domain-computer-vision: 160 70% 42%;
    --domain-reinforcement-learning: 320 70% 55%;
    --domain-audio-speech: 30 85% 55%;
    --domain-drug-discovery: 170 60% 45%;
    --domain-climate-weather: 190 75% 42%;
    --domain-math-theorem-proving: 260 50% 60%;
    --domain-other: 215 14% 50%;
  }
}
```

### Domain Badge Colors (mapped in constants)

```ts
// src/lib/constants.ts
const DOMAIN_COLORS: Record<Domain, string> = {
  "LLM Training":           "bg-[hsl(var(--domain-llm-training))]",
  "LLM Inference":          "bg-[hsl(var(--domain-llm-inference))]",
  "Robotics":               "bg-[hsl(var(--domain-robotics))]",
  "Trading":                "bg-[hsl(var(--domain-trading))]",
  "Computer Vision":        "bg-[hsl(var(--domain-computer-vision))]",
  "Reinforcement Learning": "bg-[hsl(var(--domain-reinforcement-learning))]",
  "Audio / Speech":         "bg-[hsl(var(--domain-audio-speech))]",
  "Drug Discovery":         "bg-[hsl(var(--domain-drug-discovery))]",
  "Climate / Weather":      "bg-[hsl(var(--domain-climate-weather))]",
  "Math / Theorem Proving": "bg-[hsl(var(--domain-math-theorem-proving))]",
  "Other":                  "bg-[hsl(var(--domain-other))]",
}
```

### Status Color Coding

Used consistently across charts, table rows, and status indicators:

| Status | Color Token | Hex (approx) | Usage |
|--------|------------|---------------|-------|
| keep | `--status-keep` | `#22c55e` | Green dot, green border, green chart point |
| discard | `--status-discard` | `#71717a` | Gray dot, muted text, semi-transparent chart point |
| crash | `--status-crash` | `#ef4444` | Red dot, red border, X marker on chart |

### Metric Direction Indicators

| Direction | Icon | Color |
|-----------|------|-------|
| `lower_is_better` | Down arrow (lucide `ArrowDown`) | Shown next to metric name |
| `higher_is_better` | Up arrow (lucide `ArrowUp`) | Shown next to metric name |
| Improvement | | `--metric-improved` (green) |
| Worsening | | `--metric-worsened` (red) |

### Typography Scale

Tailwind defaults with these specific applications:

| Element | Class | Font |
|---------|-------|------|
| Page title | `text-2xl font-bold tracking-tight` | Inter |
| Card title | `text-lg font-semibold` | Inter |
| Section heading | `text-base font-semibold text-muted-foreground uppercase tracking-wide` | Inter |
| Body text | `text-sm` | Inter |
| Metric values | `text-sm font-mono` | JetBrains Mono |
| Commit hashes | `text-xs font-mono` | JetBrains Mono |
| Code viewer | `text-sm font-mono` | JetBrains Mono |
| Badge/tag text | `text-xs font-medium` | Inter |
| Timestamp | `text-xs text-muted-foreground` | Inter |

### shadcn/ui Components Used

Install these via `npx shadcn@latest add`:

| Component | Usage |
|-----------|-------|
| `button` | All buttons |
| `card` | HypothesisCard, RunCard |
| `badge` | DomainBadge, StatusDot, tags |
| `input` | Form fields, search |
| `textarea` | Description fields |
| `select` | Domain dropdown, filters |
| `table` | Experiment table shell |
| `tooltip` | Truncated text, chart points |
| `dialog` | Confirmation dialogs |
| `tabs` | Sort toggles on hypothesis detail |
| `separator` | Visual dividers between sections |
| `avatar` | User avatars |
| `dropdown-menu` | User menu in nav, sort options |
| `form` | React Hook Form integration |
| `label` | Form labels |
| `toast` / `sonner` | Success/error notifications |
| `skeleton` | Loading states |
| `chart` | Recharts wrapper with theme |
| `data-table` | TanStack Table wrapper |
| `command` | Search palette (stretch goal) |
| `breadcrumb` | Navigation breadcrumbs |

---

## 8. Loading & Error States

### Loading States (per route)

Each route has a `loading.tsx` that renders skeletons matching the page layout.

**Feed loading (`app/loading.tsx`):**
- Skeleton filter bar (3 rounded rectangles)
- 6 skeleton cards (rectangle with internal skeleton lines for title, metadata, tags)

**Hypothesis detail loading:**
- Skeleton header (title line, 3 metadata lines)
- Skeleton chart (gray rectangle, 320px tall)
- 3 skeleton run cards

**Run detail loading:**
- Skeleton header
- Skeleton chart (gray rectangle, 400px tall)
- Skeleton table (header row + 10 skeleton rows)
- Skeleton code block (gray rectangle)

**Form loading:**
- Skeleton form fields (6 input-shaped rectangles)

### Error States (per route)

Each route has an `error.tsx` client component with:
- Error message display
- "Try again" button (calls `reset()`)
- "Go home" link

**Specific error handling:**

| Error | Display |
|-------|---------|
| Hypothesis not found | 404 page: "This hypothesis doesn't exist or has been removed." |
| Run not found | 404 page: "This run doesn't exist or has been removed." |
| User not found | 404 page: "No user found with handle @{handle}." |
| Supabase fetch error | Generic error: "Something went wrong loading this page." + retry button |
| Auth required | Redirect to `/auth/login?redirect={current_path}` |
| TSV parse error | Inline error in SubmitRunForm: "Invalid results.tsv: {specific_error}" |
| File upload error | Toast notification: "Upload failed. Please try again." |

---

## 9. TypeScript Types

**`src/lib/types.ts`:**

```ts
// Enums
type MetricDirection = "lower_is_better" | "higher_is_better"
type HypothesisStatus = "open" | "closed"
type ExperimentStatus = "keep" | "discard" | "crash"
type Domain =
  | "LLM Training"
  | "LLM Inference"
  | "Robotics"
  | "Trading"
  | "Computer Vision"
  | "Reinforcement Learning"
  | "Audio / Speech"
  | "Drug Discovery"
  | "Climate / Weather"
  | "Math / Theorem Proving"
  | "Other"

// Entities
type User = {
  id: string
  x_handle: string
  x_display_name: string
  x_avatar_url: string
  created_at: string
}

type Hypothesis = {
  id: string
  user_id: string
  title: string
  description: string
  domain: Domain
  dataset_url: string
  dataset_name: string
  metric_name: string
  metric_direction: MetricDirection
  baseline_to_beat: number | null
  starter_code_url: string | null
  starter_code_file: string | null
  hardware_recommendation: string | null
  tag_1: string | null
  tag_2: string | null
  status: HypothesisStatus
  created_at: string
  updated_at: string
}

type Run = {
  id: string
  hypothesis_id: string
  user_id: string
  goal: string
  hardware: string
  time_budget: string
  model_size: string
  tag_1: string | null
  tag_2: string | null
  forked_from: string | null
  baseline_metric: number
  best_metric: number
  best_description: string
  num_experiments: number
  num_kept: number
  num_discarded: number
  num_crashed: number
  improvement_pct: number
  results_tsv_url: string
  code_file_url: string
  code_filename: string
  created_at: string
  updated_at: string
}

type Experiment = {
  id: string
  run_id: string
  sequence: number
  commit_hash: string
  metric_value: number
  memory_gb: number
  status: ExperimentStatus
  description: string
}

// View models (joined data for display)
type HypothesisCardData = Hypothesis & {
  user: Pick<User, "x_handle" | "x_avatar_url">
  run_count: number
  best_run: {
    best_metric: number
    user: Pick<User, "x_handle">
  } | null
}

type RunCardData = Run & {
  user: Pick<User, "x_handle" | "x_avatar_url">
  comment_count: number
}

type HypothesisDetailData = Hypothesis & {
  user: User
  runs: RunCardData[]
  run_progression: Array<{
    submission_order: number
    best_metric: number
    user_handle: string
    run_id: string
    created_at: string
  }>
}

type RunDetailData = Run & {
  user: User
  hypothesis: Pick<Hypothesis, "id" | "title" | "metric_name" | "metric_direction">
  experiments: Experiment[]
  code_content: string
  forked_from_run: Pick<Run, "id" | "goal"> & {
    user: Pick<User, "x_handle">
  } | null
}

// Form schemas (Zod)
// Defined in src/lib/validators.ts — shapes mirror the form field tables
// in the data model doc
```

---

## 10. Data Flow Diagrams

### Feed Page Flow

```
URL: /?domain=llm-training&sort=most_active

  app/page.tsx (server)
    |-- reads searchParams
    |-- fetches: supabase.from("hypotheses")
    |     .select("*, user:users(*), runs(count), best_run:runs(best_metric, user:users(x_handle))")
    |     .eq("domain", "LLM Training")
    |     .order("run_count", { ascending: false })
    |     .range(0, 19)
    |-- returns: { hypotheses: HypothesisCardData[], total: number }
    |
    +-- <HypothesisFeed>  [CLIENT]
          |-- receives hypotheses as prop
          |-- renders <HypothesisFilterBar> (reads/writes URL params)
          |-- renders <HypothesisCard> for each hypothesis [SERVER-compatible, no state]
          |-- renders <Pagination> (reads/writes URL params)
```

### Hypothesis Detail Flow

```
URL: /hypotheses/[hypothesisId]?run_sort=best

  app/hypotheses/[hypothesisId]/page.tsx (server)
    |-- fetches hypothesis with user join
    |-- fetches runs with user join, sorted by best_metric
    |-- fetches run progression data (best_metric per run, ordered by created_at)
    |
    +-- <Breadcrumb>
    +-- <HypothesisHeader> [SERVER] — title, domain badge, user, timestamp
    +-- <HypothesisChallengeInfo> [SERVER] — dataset, metric, starter code, hardware
    +-- <HypothesisProgressionChart> [CLIENT] — Recharts scatter + line
    +-- <RunList> [CLIENT] — sort toggle (URL params) + RunCard list
          |-- <RunCard> for each run [SERVER-compatible]
```

### Submit Run Flow

```
URL: /hypotheses/[hypothesisId]/submit-run

  app/hypotheses/[hypothesisId]/submit-run/page.tsx (server)
    |-- fetches hypothesis (for context: metric_name, metric_direction)
    |-- checks auth (redirect to login if not authenticated)
    |
    +-- <SubmitRunForm> [CLIENT]
          |-- Step 1: <FileUploadDropzone> for results.tsv
          |     |-- onFileSelected -> PapaParse -> validate -> set parsedData state
          |-- Step 2: <TsvPreviewTable> shows auto-extracted metrics
          |     |-- baseline_metric, best_metric, counts, improvement_pct
          |     |-- User confirms or re-uploads
          |-- Step 3: <FileUploadDropzone> for code file
          |-- Step 4: Metadata form fields (goal, hardware, etc.)
          |-- Step 5: Submit button
          |     |-- Upload files to Supabase Storage
          |     |-- Insert run record
          |     |-- Insert experiment records (batch)
          |     |-- redirect to /runs/[newRunId]
```

---

## 11. Key Implementation Notes

### Supabase Queries

Server components use `createServerClient` from `@supabase/ssr` with cookies. Client components use `createBrowserClient`.

The hypothesis feed query needs a database view or RPC to efficiently get `run_count` and `best_run` without N+1 queries. Recommended: create a `hypothesis_feed_view` in Supabase that joins hypotheses with aggregated run data.

### TSV Parsing

Use PapaParse in the browser (client-side only). The parser configuration:

```ts
Papa.parse(file, {
  delimiter: "\t",
  header: true,
  skipEmptyLines: true,
  dynamicTyping: true,
  transformHeader: (header) => header.trim().toLowerCase(),
  complete: (results) => { /* validate and extract */ },
  error: (error) => { /* show parse error */ },
})
```

Validation rules:
- Exactly 5 columns: commit, val_bpb (or any metric name), memory_gb, status, description
- First data row should have commit === "baseline"
- Status must be one of: keep, discard, crash
- Metric and memory values must be numeric (except 0 for crashes)
- At least 2 rows (baseline + one experiment)

Note: The second column header is the metric name, which varies per hypothesis. The parser should accept any header name for column 2 and map it to `metric_value` internally.

### Code Viewer

Use `shiki` for syntax highlighting (supports all languages, works well in Next.js). Load the language grammar based on the file extension of `code_filename`.

```
RunCodeViewer props:
  - code: string (file content)
  - filename: string (e.g., "train.py")
  - downloadUrl: string (Supabase Storage URL)
```

The component renders:
- File header bar: filename on left, download button on right
- Syntax-highlighted code block with line numbers
- Max height with scroll (600px)

### Pagination Strategy

Offset-based pagination for V1 (simpler, sufficient for expected data volume).

- 20 hypotheses per page on the feed
- 20 runs per page on hypothesis detail
- 50 experiments per page in the experiment table

### Image/Avatar Handling

X/Twitter avatar URLs are stored in the user record. Use Next.js `<Image>` with `remotePatterns` configured for `pbs.twimg.com`. Fallback to a generated avatar (initials or identicon) if the URL fails.

### Font Loading

```ts
// src/app/layout.tsx
import { Inter, JetBrains_Mono } from "next/font/google"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" })
```

Apply via `className={cn(inter.variable, jetbrainsMono.variable)}` on the `<body>` tag.

### Middleware

`src/middleware.ts` handles:
1. Supabase auth session refresh (required for server-side auth)
2. No route protection in middleware for V1 — auth checks happen in individual server components and redirect to login if needed

---

## 12. File Size Estimates

Guideline from coding style: 200-400 lines typical, 800 max.

| File | Estimated Lines | Notes |
|------|----------------|-------|
| `app/layout.tsx` | ~50 | Root layout shell |
| `app/page.tsx` | ~60 | Feed data fetch + render |
| `HypothesisFeed.tsx` | ~80 | Filter bar orchestration |
| `HypothesisFilterBar.tsx` | ~120 | Multiple filter inputs + URL sync |
| `HypothesisCard.tsx` | ~100 | Card layout with all metadata |
| `HypothesisHeader.tsx` | ~80 | Detail page header |
| `HypothesisChallengeInfo.tsx` | ~60 | Dataset/metric/code display |
| `HypothesisProgressionChart.tsx` | ~150 | Recharts config + custom tooltip |
| `CreateHypothesisForm.tsx` | ~250 | Full form with validation |
| `RunList.tsx` | ~60 | Sort toggle + card list |
| `RunCard.tsx` | ~120 | Card layout with all metadata |
| `RunHeader.tsx` | ~80 | Detail page header |
| `RunProgressionChart.tsx` | ~200 | Recharts config + custom dots + tooltip |
| `RunExperimentTable.tsx` | ~250 | TanStack Table full config |
| `RunCodeViewer.tsx` | ~80 | Shiki + download button |
| `SubmitRunForm.tsx` | ~300 | Multi-step form with file upload + parse |
| `TsvPreviewTable.tsx` | ~80 | Auto-parsed metric confirmation |
| `TopNav.tsx` | ~100 | Logo, search, user menu |
| `lib/types.ts` | ~120 | All TypeScript types |
| `lib/constants.ts` | ~80 | Domain list, colors, enums |
| `lib/validators.ts` | ~150 | Zod schemas for all forms |
| `lib/tsv-parser.ts` | ~100 | PapaParse wrapper + validation |
| `lib/format.ts` | ~60 | Formatting utilities |
| `lib/url-state.ts` | ~40 | Search param helpers |
| `globals.css` | ~80 | CSS custom properties |
