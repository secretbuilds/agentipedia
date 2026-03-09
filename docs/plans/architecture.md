# Agentipedia — Backend Architecture Blueprint

Technical blueprint for V1 implementation. Covers database schema, API contracts, data flows, external integrations, and TSV parsing pipeline.

---

## 1. Database Schema

### 1.1 Enums

```sql
CREATE TYPE domain_enum AS ENUM (
  'llm_training',
  'llm_inference',
  'robotics',
  'trading',
  'computer_vision',
  'reinforcement_learning',
  'audio_speech',
  'drug_discovery',
  'climate_weather',
  'math_theorem_proving',
  'other'
);

CREATE TYPE metric_direction_enum AS ENUM (
  'lower_is_better',
  'higher_is_better'
);

CREATE TYPE hypothesis_status_enum AS ENUM (
  'open',
  'closed'
);

CREATE TYPE experiment_status_enum AS ENUM (
  'keep',
  'discard',
  'crash'
);
```

### 1.2 Users Table

Supabase Auth creates `auth.users` automatically. This is the **public profile** table that mirrors X/Twitter identity data.

```sql
CREATE TABLE public.users (
  id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  x_user_id     text        NOT NULL UNIQUE,
  x_handle      text        NOT NULL,
  x_display_name text       NOT NULL,
  x_avatar_url  text        NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_x_handle ON public.users (x_handle);
```

**Rationale:** `id` references `auth.users(id)` directly so Supabase RLS policies can use `auth.uid()` without joins. `x_user_id` is the Twitter numeric ID (stable across handle changes). `x_handle` is updated on every login via the auth hook.

### 1.3 API Tokens Table

Personal Access Tokens for CLI/agent authentication.

```sql
CREATE TABLE public.api_tokens (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token_hash   text        NOT NULL,
  name         text        NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  revoked_at   timestamptz,

  CONSTRAINT api_tokens_name_length CHECK (char_length(name) BETWEEN 1 AND 100)
);

CREATE INDEX idx_api_tokens_user_id ON public.api_tokens (user_id);
CREATE INDEX idx_api_tokens_token_hash ON public.api_tokens (token_hash) WHERE revoked_at IS NULL;
```

**Token format:** `agp_<32 random bytes as hex>` (total 68 chars). The raw token is shown once at creation; only the SHA-256 hash is stored. We use SHA-256 (not bcrypt) because tokens are high-entropy random strings, not user-chosen passwords — brute-force resistance comes from the keyspace, and SHA-256 allows fast lookup during API authentication.

**Lookup flow:** On every CLI request, hash the provided token with SHA-256, query `api_tokens` by `token_hash` where `revoked_at IS NULL`, then verify `user_id` is valid. Update `last_used_at` asynchronously.

### 1.4 Hypotheses Table

```sql
CREATE TABLE public.hypotheses (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  uuid                NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at               timestamptz         NOT NULL DEFAULT now(),
  updated_at               timestamptz         NOT NULL DEFAULT now(),

  title                    text                NOT NULL,
  description              text                NOT NULL,
  domain                   domain_enum         NOT NULL,
  dataset_url              text                NOT NULL,
  dataset_name             text                NOT NULL,
  metric_name              text                NOT NULL,
  metric_direction         metric_direction_enum NOT NULL,
  baseline_to_beat         double precision,
  starter_code_url         text,
  starter_code_file_url    text,
  hardware_recommendation  text,
  tag_1                    text,
  tag_2                    text,
  status                   hypothesis_status_enum NOT NULL DEFAULT 'open',

  CONSTRAINT hypotheses_title_length CHECK (char_length(title) BETWEEN 10 AND 300),
  CONSTRAINT hypotheses_description_length CHECK (char_length(description) BETWEEN 20 AND 10000),
  CONSTRAINT hypotheses_metric_name_length CHECK (char_length(metric_name) BETWEEN 1 AND 100)
);

CREATE INDEX idx_hypotheses_user_id ON public.hypotheses (user_id);
CREATE INDEX idx_hypotheses_domain ON public.hypotheses (domain);
CREATE INDEX idx_hypotheses_status ON public.hypotheses (status);
CREATE INDEX idx_hypotheses_created_at ON public.hypotheses (created_at DESC);
CREATE INDEX idx_hypotheses_domain_created ON public.hypotheses (domain, created_at DESC);
CREATE INDEX idx_hypotheses_dataset_name ON public.hypotheses USING gin (to_tsvector('english', dataset_name));
CREATE INDEX idx_hypotheses_metric_name ON public.hypotheses USING gin (to_tsvector('english', metric_name));
CREATE INDEX idx_hypotheses_tags ON public.hypotheses (tag_1, tag_2);
```

**Index rationale:**
- `idx_hypotheses_domain_created` — the primary feed query: filter by domain, sort by newest.
- `idx_hypotheses_dataset_name` and `idx_hypotheses_metric_name` — GIN indexes for full-text search on dataset name and metric name.
- `idx_hypotheses_tags` — composite index for tag-based filtering.
- `idx_hypotheses_created_at` — unfiltered feed sorted by newest.

### 1.5 Runs Table

```sql
CREATE TABLE public.runs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hypothesis_id     uuid             NOT NULL REFERENCES public.hypotheses(id) ON DELETE CASCADE,
  user_id           uuid             NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at        timestamptz      NOT NULL DEFAULT now(),
  updated_at        timestamptz      NOT NULL DEFAULT now(),

  -- User-provided
  goal              text             NOT NULL,
  hardware          text             NOT NULL,
  time_budget       text             NOT NULL,
  model_size        text             NOT NULL,
  tag_1             text,
  tag_2             text,
  forked_from       uuid             REFERENCES public.runs(id) ON DELETE SET NULL,

  -- Auto-extracted from results.tsv
  baseline_metric   double precision NOT NULL,
  best_metric       double precision NOT NULL,
  best_description  text             NOT NULL,
  num_experiments   integer          NOT NULL,
  num_kept          integer          NOT NULL,
  num_discarded     integer          NOT NULL,
  num_crashed       integer          NOT NULL,
  improvement_pct   double precision NOT NULL,

  -- File references (Supabase Storage URLs)
  results_tsv_url   text             NOT NULL,
  code_file_url     text             NOT NULL,
  code_filename     text             NOT NULL,

  CONSTRAINT runs_goal_length CHECK (char_length(goal) BETWEEN 5 AND 500),
  CONSTRAINT runs_num_experiments_positive CHECK (num_experiments > 0),
  CONSTRAINT runs_counts_consistent CHECK (num_kept + num_discarded + num_crashed = num_experiments)
);

CREATE INDEX idx_runs_hypothesis_id ON public.runs (hypothesis_id);
CREATE INDEX idx_runs_user_id ON public.runs (user_id);
CREATE INDEX idx_runs_hypothesis_best ON public.runs (hypothesis_id, best_metric);
CREATE INDEX idx_runs_hypothesis_created ON public.runs (hypothesis_id, created_at DESC);
CREATE INDEX idx_runs_forked_from ON public.runs (forked_from) WHERE forked_from IS NOT NULL;
CREATE INDEX idx_runs_hypothesis_improvement ON public.runs (hypothesis_id, improvement_pct DESC);
```

**Index rationale:**
- `idx_runs_hypothesis_best` — leaderboard query: all runs for a hypothesis sorted by best metric.
- `idx_runs_hypothesis_created` — newest runs within a hypothesis.
- `idx_runs_forked_from` — find all forks of a given run.
- `idx_runs_hypothesis_improvement` — sort runs by improvement percentage within a hypothesis.

### 1.6 Experiments Table

```sql
CREATE TABLE public.experiments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id        uuid                NOT NULL REFERENCES public.runs(id) ON DELETE CASCADE,
  sequence      integer             NOT NULL,
  commit_hash   text                NOT NULL,
  metric_value  double precision    NOT NULL,
  memory_gb     double precision    NOT NULL,
  status        experiment_status_enum NOT NULL,
  description   text                NOT NULL,

  CONSTRAINT experiments_sequence_positive CHECK (sequence > 0),
  CONSTRAINT experiments_unique_sequence UNIQUE (run_id, sequence)
);

CREATE INDEX idx_experiments_run_id ON public.experiments (run_id);
CREATE INDEX idx_experiments_run_sequence ON public.experiments (run_id, sequence);
CREATE INDEX idx_experiments_run_status ON public.experiments (run_id, status);
```

**Index rationale:**
- `idx_experiments_run_sequence` — ordered experiment timeline for a run's progression chart.
- `idx_experiments_run_status` — filtering experiments by status (e.g., only `keep` rows for the step line in charts).

### 1.7 Updated-At Trigger

A single reusable trigger function for all tables with `updated_at`:

```sql
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_hypotheses_updated_at
  BEFORE UPDATE ON public.hypotheses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_runs_updated_at
  BEFORE UPDATE ON public.runs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

### 1.8 Row Level Security Policies

```sql
-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hypotheses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experiments ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- USERS
-- ============================================================

-- Anyone can read user profiles
CREATE POLICY users_select ON public.users
  FOR SELECT USING (true);

-- Users can only update their own profile
CREATE POLICY users_update ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Insert handled by auth hook (service role), not by users directly
CREATE POLICY users_insert ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================================
-- API TOKENS
-- ============================================================

-- Users can only see their own tokens
CREATE POLICY api_tokens_select ON public.api_tokens
  FOR SELECT USING (auth.uid() = user_id);

-- Users can only create tokens for themselves
CREATE POLICY api_tokens_insert ON public.api_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own tokens (for revoking)
CREATE POLICY api_tokens_update ON public.api_tokens
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can only delete their own tokens
CREATE POLICY api_tokens_delete ON public.api_tokens
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- HYPOTHESES
-- ============================================================

-- Anyone (including anonymous) can read hypotheses
CREATE POLICY hypotheses_select ON public.hypotheses
  FOR SELECT USING (true);

-- Authenticated users can create hypotheses
CREATE POLICY hypotheses_insert ON public.hypotheses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Only the creator can update their hypothesis
CREATE POLICY hypotheses_update ON public.hypotheses
  FOR UPDATE USING (auth.uid() = user_id);

-- Only the creator can delete their hypothesis
CREATE POLICY hypotheses_delete ON public.hypotheses
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- RUNS
-- ============================================================

-- Anyone can read runs
CREATE POLICY runs_select ON public.runs
  FOR SELECT USING (true);

-- Authenticated users can submit runs to open hypotheses
CREATE POLICY runs_insert ON public.runs
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.hypotheses h
      WHERE h.id = hypothesis_id AND h.status = 'open'
    )
  );

-- Only the run creator can update
CREATE POLICY runs_update ON public.runs
  FOR UPDATE USING (auth.uid() = user_id);

-- Only the run creator can delete
CREATE POLICY runs_delete ON public.runs
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- EXPERIMENTS
-- ============================================================

-- Anyone can read experiments
CREATE POLICY experiments_select ON public.experiments
  FOR SELECT USING (true);

-- Experiments are inserted by the server during run submission (service role).
-- No direct user inserts via client. The service role bypasses RLS.
-- But for safety, allow insert only if the user owns the parent run.
CREATE POLICY experiments_insert ON public.experiments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.runs r
      WHERE r.id = run_id AND r.user_id = auth.uid()
    )
  );

-- No direct updates or deletes on experiments (immutable once created)
-- If a run is deleted, CASCADE handles experiment cleanup.
```

### 1.9 Hypothesis Feed View (Materialized or Database View)

This view powers the hypothesis feed cards, which require aggregated run data.

```sql
CREATE OR REPLACE VIEW public.hypothesis_feed AS
SELECT
  h.*,
  u.x_handle       AS author_handle,
  u.x_display_name AS author_display_name,
  u.x_avatar_url   AS author_avatar_url,
  COALESCE(rs.run_count, 0)         AS run_count,
  rs.best_metric_value,
  rs.best_run_user_handle
FROM public.hypotheses h
JOIN public.users u ON u.id = h.user_id
LEFT JOIN LATERAL (
  SELECT
    COUNT(*)::integer AS run_count,
    best_run.best_metric AS best_metric_value,
    best_user.x_handle AS best_run_user_handle
  FROM public.runs r
  LEFT JOIN LATERAL (
    SELECT r2.best_metric AS best_metric, r2.user_id
    FROM public.runs r2
    WHERE r2.hypothesis_id = h.id
    ORDER BY
      CASE WHEN h.metric_direction = 'lower_is_better' THEN r2.best_metric END ASC,
      CASE WHEN h.metric_direction = 'higher_is_better' THEN r2.best_metric END DESC
    LIMIT 1
  ) best_run ON true
  LEFT JOIN public.users best_user ON best_user.id = best_run.user_id
  WHERE r.hypothesis_id = h.id
  GROUP BY best_run.best_metric, best_user.x_handle
) rs ON true;
```

**Usage:** The feed page queries `hypothesis_feed` with `WHERE`, `ORDER BY`, and `LIMIT/OFFSET` for pagination.

**Performance note:** If this view becomes slow at scale (thousands of hypotheses, each with many runs), replace with a materialized view refreshed on a cron schedule, or denormalize `run_count` / `best_metric_value` / `best_run_user_handle` directly onto the `hypotheses` table and update them via database triggers on the `runs` table. For V1 with low volume, the view is sufficient.

---

## 2. API Contracts

All endpoints are Next.js App Router Route Handlers (`app/api/...`) except where noted. Authentication is via Supabase session cookie (browser) or `Authorization: Bearer agp_...` header (CLI/agent).

### 2.1 Authentication Middleware

Every protected endpoint runs through a shared `authenticateRequest` utility:

1. Check for `Authorization: Bearer agp_...` header.
   - If present: SHA-256 hash the token, look up in `api_tokens` where `revoked_at IS NULL`, resolve `user_id`. Update `last_used_at` asynchronously. Return user.
2. Else: call `supabase.auth.getUser()` from the server-side Supabase client (reads the session cookie). Return user.
3. If neither succeeds: return `401 Unauthorized`.

This means every endpoint that says "auth: required" works identically for browser sessions and PAT-authenticated CLI requests.

### 2.2 Hypotheses

#### List Hypotheses (Feed)

```
GET /api/hypotheses
```

**Auth:** None (public)

**Query parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `domain` | domain_enum | — | Filter by domain |
| `status` | `open` \| `closed` | `open` | Filter by status |
| `dataset` | string | — | Full-text search on dataset_name |
| `metric` | string | — | Full-text search on metric_name |
| `tag` | string | — | Match against tag_1 or tag_2 |
| `user_id` | uuid | — | Filter by hypothesis author |
| `sort` | `newest` \| `most_runs` \| `best_result` | `newest` | Sort order |
| `cursor` | string | — | Cursor for pagination (encoded `created_at` + `id`) |
| `limit` | integer | 20 | Page size (max 50) |

**Response (200):**

```json
{
  "hypotheses": [
    {
      "id": "uuid",
      "user": {
        "id": "uuid",
        "x_handle": "string",
        "x_display_name": "string",
        "x_avatar_url": "string"
      },
      "created_at": "ISO 8601",
      "title": "string",
      "description": "string (truncated to 300 chars)",
      "domain": "domain_enum",
      "dataset_name": "string",
      "metric_name": "string",
      "metric_direction": "lower_is_better | higher_is_better",
      "baseline_to_beat": "number | null",
      "tag_1": "string | null",
      "tag_2": "string | null",
      "status": "open | closed",
      "run_count": "integer",
      "best_metric_value": "number | null",
      "best_run_user_handle": "string | null"
    }
  ],
  "next_cursor": "string | null"
}
```

**Pagination strategy:** Cursor-based using `(created_at, id)` for `newest` sort. For `most_runs` and `best_result`, use `(sort_value, id)` cursors. Cursor is a base64-encoded JSON object. This avoids the offset-skip performance problem and handles concurrent inserts correctly.

---

#### Get Hypothesis Detail

```
GET /api/hypotheses/:id
```

**Auth:** None (public)

**Response (200):**

```json
{
  "id": "uuid",
  "user": {
    "id": "uuid",
    "x_handle": "string",
    "x_display_name": "string",
    "x_avatar_url": "string"
  },
  "created_at": "ISO 8601",
  "updated_at": "ISO 8601",
  "title": "string",
  "description": "string (full)",
  "domain": "domain_enum",
  "dataset_url": "string",
  "dataset_name": "string",
  "metric_name": "string",
  "metric_direction": "lower_is_better | higher_is_better",
  "baseline_to_beat": "number | null",
  "starter_code_url": "string | null",
  "starter_code_file_url": "string | null",
  "hardware_recommendation": "string | null",
  "tag_1": "string | null",
  "tag_2": "string | null",
  "status": "open | closed",
  "run_count": "integer",
  "best_metric_value": "number | null",
  "best_run_user_handle": "string | null"
}
```

**Errors:** `404` if hypothesis not found.

---

#### Create Hypothesis

```
POST /api/hypotheses
```

**Auth:** Required

**Request body (JSON):**

```json
{
  "title": "string (10-300 chars, required)",
  "description": "string (20-10000 chars, required)",
  "domain": "domain_enum (required)",
  "dataset_url": "string (valid URL, required)",
  "dataset_name": "string (required)",
  "metric_name": "string (1-100 chars, required)",
  "metric_direction": "lower_is_better | higher_is_better (required)",
  "baseline_to_beat": "number (optional)",
  "starter_code_url": "string (valid URL, optional)",
  "hardware_recommendation": "string (optional)",
  "tag_1": "string (optional)",
  "tag_2": "string (optional)"
}
```

Note: `starter_code_file` upload is handled as a separate `multipart/form-data` request (see File Upload section below) and the returned URL is then included as `starter_code_file_url` in this request. Alternatively, the create endpoint can accept `multipart/form-data` directly with a `starter_code_file` field — implementation may choose either approach.

**Response (201):**

```json
{
  "id": "uuid",
  "created_at": "ISO 8601"
}
```

**Errors:** `400` for validation failures, `401` if not authenticated.

---

#### Update Hypothesis

```
PATCH /api/hypotheses/:id
```

**Auth:** Required (must be the hypothesis author)

**Request body (JSON):** Any subset of the create fields.

**Response (200):**

```json
{
  "id": "uuid",
  "updated_at": "ISO 8601"
}
```

**Errors:** `400`, `401`, `403` (not the author), `404`.

---

#### Delete Hypothesis

```
DELETE /api/hypotheses/:id
```

**Auth:** Required (must be the hypothesis author)

**Response (204):** No body.

**Errors:** `401`, `403`, `404`. Returns `409 Conflict` if the hypothesis has runs (prevent orphaning runs).

---

### 2.3 Runs

#### List Runs for a Hypothesis

```
GET /api/hypotheses/:id/runs
```

**Auth:** None (public)

**Query parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `sort` | `best_metric` \| `newest` \| `most_improved` \| `most_experiments` | `best_metric` | Sort order |
| `user_id` | uuid | — | Filter by run author |
| `cursor` | string | — | Cursor for pagination |
| `limit` | integer | 20 | Page size (max 50) |

**Response (200):**

```json
{
  "runs": [
    {
      "id": "uuid",
      "user": {
        "id": "uuid",
        "x_handle": "string",
        "x_display_name": "string",
        "x_avatar_url": "string"
      },
      "created_at": "ISO 8601",
      "goal": "string",
      "hardware": "string",
      "time_budget": "string",
      "model_size": "string",
      "tag_1": "string | null",
      "tag_2": "string | null",
      "forked_from": "uuid | null",
      "baseline_metric": "number",
      "best_metric": "number",
      "best_description": "string",
      "num_experiments": "integer",
      "num_kept": "integer",
      "num_discarded": "integer",
      "num_crashed": "integer",
      "improvement_pct": "number"
    }
  ],
  "next_cursor": "string | null"
}
```

**Sort behavior for `best_metric`:** The API reads the parent hypothesis's `metric_direction` and sorts accordingly (ASC for `lower_is_better`, DESC for `higher_is_better`).

---

#### Get Run Detail

```
GET /api/runs/:id
```

**Auth:** None (public)

**Response (200):**

```json
{
  "id": "uuid",
  "hypothesis_id": "uuid",
  "user": {
    "id": "uuid",
    "x_handle": "string",
    "x_display_name": "string",
    "x_avatar_url": "string"
  },
  "created_at": "ISO 8601",
  "updated_at": "ISO 8601",
  "goal": "string",
  "hardware": "string",
  "time_budget": "string",
  "model_size": "string",
  "tag_1": "string | null",
  "tag_2": "string | null",
  "forked_from": "uuid | null",
  "baseline_metric": "number",
  "best_metric": "number",
  "best_description": "string",
  "num_experiments": "integer",
  "num_kept": "integer",
  "num_discarded": "integer",
  "num_crashed": "integer",
  "improvement_pct": "number",
  "results_tsv_url": "string",
  "code_file_url": "string",
  "code_filename": "string",
  "hypothesis": {
    "id": "uuid",
    "title": "string",
    "metric_name": "string",
    "metric_direction": "lower_is_better | higher_is_better"
  }
}
```

---

#### Get Experiments for a Run

```
GET /api/runs/:id/experiments
```

**Auth:** None (public)

**Response (200):**

```json
{
  "experiments": [
    {
      "id": "uuid",
      "sequence": "integer",
      "commit_hash": "string",
      "metric_value": "number",
      "memory_gb": "number",
      "status": "keep | discard | crash",
      "description": "string"
    }
  ]
}
```

Returns all experiments ordered by `sequence ASC`. No pagination — a single run typically has ~125 experiments, well within a single response.

---

#### Submit a Run

```
POST /api/hypotheses/:id/runs
Content-Type: multipart/form-data
```

**Auth:** Required

**Form fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `results_tsv` | File | yes | The results.tsv file |
| `code_file` | File | yes | The evolved code file |
| `goal` | string | yes | What this run explored |
| `hardware` | string | yes | Hardware used |
| `time_budget` | string | yes | Time per experiment |
| `model_size` | string | yes | Parameter count |
| `tag_1` | string | no | Optional tag |
| `tag_2` | string | no | Optional tag |
| `forked_from` | uuid | no | ID of upstream run |

**Processing steps (server-side, detailed in Section 5):**

1. Validate the hypothesis exists and is `open`.
2. Parse `results_tsv` with PapaParse.
3. Validate TSV structure and content (see Section 5).
4. Compute auto-extracted fields from parsed data.
5. Upload `results_tsv` and `code_file` to Supabase Storage.
6. In a database transaction: insert `runs` row, then bulk-insert all `experiments` rows.
7. Return the created run.

**Response (201):**

```json
{
  "id": "uuid",
  "created_at": "ISO 8601",
  "baseline_metric": "number",
  "best_metric": "number",
  "improvement_pct": "number",
  "num_experiments": "integer"
}
```

**Errors:**
- `400` — TSV validation failed (response includes `errors` array with specific issues)
- `401` — Not authenticated
- `404` — Hypothesis not found
- `409` — Hypothesis is closed
- `413` — File too large (results.tsv > 1MB, code file > 5MB)

---

#### Delete a Run

```
DELETE /api/runs/:id
```

**Auth:** Required (must be the run author)

**Response (204):** No body. Cascade-deletes experiments. Removes files from Supabase Storage.

---

### 2.4 Progression Data

#### Hypothesis Progression (Cross-Run Chart)

```
GET /api/hypotheses/:id/progression
```

**Auth:** None (public)

**Response (200):**

```json
{
  "metric_name": "string",
  "metric_direction": "lower_is_better | higher_is_better",
  "baseline_to_beat": "number | null",
  "points": [
    {
      "run_id": "uuid",
      "user_handle": "string",
      "best_metric": "number",
      "created_at": "ISO 8601",
      "goal": "string"
    }
  ]
}
```

`points` are ordered by `created_at ASC`. Each point represents one run's best metric, plotted in submission order. The frontend renders this as the hypothesis-level progression chart.

---

### 2.5 Auth Endpoints

#### Initiate X/Twitter OAuth

```
POST /api/auth/signin
```

**Auth:** None

This is a thin wrapper around Supabase's OAuth flow. The frontend calls `supabase.auth.signInWithOAuth({ provider: 'twitter' })` which redirects to X/Twitter. The callback is handled by Supabase automatically.

**After successful OAuth callback**, a Supabase Auth Hook (database webhook on `auth.users` insert) upserts the `public.users` row from the X/Twitter provider metadata. See Section 4.1 for details.

---

#### Sign Out

```
POST /api/auth/signout
```

**Auth:** Required

Calls `supabase.auth.signOut()`. Clears the session cookie.

**Response (200):** `{ "success": true }`

---

#### Get Current User

```
GET /api/auth/me
```

**Auth:** Required

**Response (200):**

```json
{
  "id": "uuid",
  "x_handle": "string",
  "x_display_name": "string",
  "x_avatar_url": "string",
  "created_at": "ISO 8601"
}
```

---

### 2.6 Personal Access Tokens

#### List Tokens

```
GET /api/tokens
```

**Auth:** Required

**Response (200):**

```json
{
  "tokens": [
    {
      "id": "uuid",
      "name": "string",
      "created_at": "ISO 8601",
      "last_used_at": "ISO 8601 | null",
      "revoked_at": "ISO 8601 | null"
    }
  ]
}
```

Note: `token_hash` is never returned. The raw token is only shown once at creation.

---

#### Create Token

```
POST /api/tokens
```

**Auth:** Required

**Request body:**

```json
{
  "name": "string (1-100 chars, required)"
}
```

**Processing:**
1. Generate 32 random bytes, encode as hex, prefix with `agp_`.
2. SHA-256 hash the full token string.
3. Store the hash in `api_tokens`.
4. Return the raw token (shown once).

**Response (201):**

```json
{
  "id": "uuid",
  "name": "string",
  "token": "agp_<64 hex chars>",
  "created_at": "ISO 8601"
}
```

---

#### Revoke Token

```
POST /api/tokens/:id/revoke
```

**Auth:** Required (must own the token)

Sets `revoked_at = now()`. Does not delete the row (audit trail).

**Response (200):** `{ "revoked_at": "ISO 8601" }`

---

#### Delete Token

```
DELETE /api/tokens/:id
```

**Auth:** Required (must own the token)

Permanently removes the token row.

**Response (204):** No body.

---

### 2.7 User Profile

#### Get User Profile

```
GET /api/users/:id
```

**Auth:** None (public)

**Response (200):**

```json
{
  "id": "uuid",
  "x_handle": "string",
  "x_display_name": "string",
  "x_avatar_url": "string",
  "created_at": "ISO 8601",
  "hypothesis_count": "integer",
  "run_count": "integer"
}
```

---

### 2.8 File Downloads

Files are served directly from Supabase Storage signed URLs. The `results_tsv_url` and `code_file_url` stored in the `runs` table are either public URLs (if the bucket is public) or are resolved to signed URLs at query time.

**Strategy for V1:** Use a public bucket with path-based access. Files are stored at deterministic paths (see Section 4.2), so the URL is predictable. This avoids the complexity of signed URL generation and expiry management. Since all runs are public in V1, there is no confidentiality concern.

---

## 3. Data Flows

### 3.1 Browser Upload Flow

```
User (browser)
  │
  ├─ 1. Selects results.tsv + code file in the Submit Run form
  │
  ├─ 2. Client-side: PapaParse parses results.tsv in the browser
  │     ├─ Validates 5-column structure
  │     ├─ Validates data types per column
  │     ├─ Computes auto-extracted preview (baseline, best, counts)
  │     └─ Shows preview to user for confirmation
  │
  ├─ 3. User confirms and clicks Submit
  │
  ├─ 4. Client sends multipart/form-data to POST /api/hypotheses/:id/runs
  │     ├─ Includes results.tsv (raw file)
  │     ├─ Includes code file
  │     └─ Includes form metadata (goal, hardware, etc.)
  │
  └─ Server (Next.js API Route)
        │
        ├─ 5. Authenticates request (Supabase session cookie)
        │
        ├─ 6. Validates hypothesis exists and is open
        │
        ├─ 7. Server-side: Re-parses results.tsv with PapaParse
        │     ├─ Full validation (never trust client-side parsing)
        │     └─ Computes auto-extracted fields authoritatively
        │
        ├─ 8. Uploads files to Supabase Storage
        │     ├─ results.tsv → runs/{hypothesis_id}/{run_id}/results.tsv
        │     └─ code file  → runs/{hypothesis_id}/{run_id}/{code_filename}
        │
        ├─ 9. Database transaction:
        │     ├─ INSERT into runs (with auto-extracted fields + storage URLs)
        │     └─ Bulk INSERT into experiments (one row per TSV data row)
        │
        └─ 10. Returns 201 with run summary
```

### 3.2 CLI Submission Flow

```
Agent / CLI
  │
  ├─ 1. Reads PAT from env var or config file
  │     (AGENTIPEDIA_TOKEN=agp_...)
  │
  ├─ 2. Sends multipart/form-data to POST /api/hypotheses/:id/runs
  │     ├─ Authorization: Bearer agp_...
  │     ├─ results.tsv file
  │     ├─ code file
  │     └─ JSON metadata fields
  │
  └─ Server (same Next.js API Route as browser)
        │
        ├─ 3. Authenticates via PAT
        │     ├─ SHA-256 hash the token
        │     ├─ Look up api_tokens WHERE token_hash = ? AND revoked_at IS NULL
        │     ├─ Resolve user_id
        │     └─ Asynchronously update last_used_at
        │
        ├─ 4-10. Same pipeline as browser upload (steps 6-10 above)
        │
        └─ 11. Optionally triggers X/Twitter post (see Section 4.3)
```

**Key design principle:** The server-side endpoint is identical for browser and CLI. The only difference is the authentication mechanism. This means the CLI is a thin HTTP client — no Supabase SDK required.

### 3.3 Feed Query Flow

```
User loads hypothesis feed
  │
  ├─ 1. Frontend calls GET /api/hypotheses?domain=llm_training&sort=newest&limit=20
  │
  └─ Server
        │
        ├─ 2. Queries the hypothesis_feed view:
        │
        │     SELECT *
        │     FROM hypothesis_feed
        │     WHERE domain = 'llm_training'
        │       AND status = 'open'
        │     ORDER BY created_at DESC
        │     LIMIT 21  -- fetch limit+1 to detect next page
        │
        ├─ 3. If 21 rows returned, there's a next page.
        │     Encode cursor from last row: base64({ created_at, id })
        │     Return first 20 rows + next_cursor.
        │
        └─ 4. Return hypothesis cards with embedded run aggregates.
```

**For `most_runs` sort:**

```sql
ORDER BY run_count DESC, created_at DESC
```

**For `best_result` sort:** This requires knowing the direction per hypothesis, which is already in the view. The API sorts in application code after fetching, or uses a CASE expression:

```sql
ORDER BY
  CASE WHEN metric_direction = 'lower_is_better' THEN best_metric_value END ASC,
  CASE WHEN metric_direction = 'higher_is_better' THEN best_metric_value END DESC,
  created_at DESC
```

Note: `best_result` sort mixes metric directions across domains. It is most useful when filtered to a single domain or metric name.

### 3.4 Hypothesis Detail Page Query Flow

```
User opens /hypothesis/:id
  │
  └─ Frontend makes 3 parallel requests:
        │
        ├─ GET /api/hypotheses/:id
        │   → Full hypothesis detail with author info
        │
        ├─ GET /api/hypotheses/:id/runs?sort=best_metric&limit=20
        │   → Paginated run cards sorted by best metric
        │
        └─ GET /api/hypotheses/:id/progression
            → Cross-run progression data points for the overlay chart
```

### 3.5 Run Detail Page Query Flow

```
User opens /run/:id
  │
  └─ Frontend makes 2 parallel requests:
        │
        ├─ GET /api/runs/:id
        │   → Full run detail with hypothesis context
        │
        └─ GET /api/runs/:id/experiments
            → All experiment rows for the progression chart + table
```

The code file content is loaded lazily when the user clicks the "View Code" tab. The frontend fetches the file directly from the `code_file_url` (Supabase Storage public URL).

---

## 4. External Integrations

### 4.1 Supabase Auth — X/Twitter OAuth 2.0

**Supabase Dashboard configuration:**

1. **Authentication > Providers > Twitter**: Enable and configure.
2. **Twitter Developer Portal**: Create an OAuth 2.0 app with:
   - Redirect URL: `https://<project-ref>.supabase.co/auth/v1/callback`
   - Scopes: `tweet.read`, `tweet.write`, `users.read`, `offline.access`
   - `tweet.write` is needed for the X posting integration (Section 4.3)

**Provider metadata extraction:**

When Supabase completes the OAuth flow, the X/Twitter profile data is stored in `auth.users.raw_user_meta_data` as:

```json
{
  "provider_id": "12345678",
  "user_name": "handle",
  "full_name": "Display Name",
  "avatar_url": "https://pbs.twimg.com/..."
}
```

**Auth hook for public.users upsert:**

A Supabase Database Webhook (or a Postgres trigger on `auth.users`) fires on insert and update to sync data to `public.users`:

```sql
CREATE OR REPLACE FUNCTION public.handle_auth_user_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, x_user_id, x_handle, x_display_name, x_avatar_url, created_at, last_login_at)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'provider_id',
    NEW.raw_user_meta_data ->> 'user_name',
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'user_name'),
    COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', ''),
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    x_handle       = EXCLUDED.x_handle,
    x_display_name = EXCLUDED.x_display_name,
    x_avatar_url   = EXCLUDED.x_avatar_url,
    last_login_at  = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created_or_updated
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_auth_user_change();
```

**Important:** This trigger runs as `SECURITY DEFINER` because it writes to `public.users` from a trigger on `auth.users` (different schema). The trigger is set on `auth.users` directly in the Supabase SQL editor — it is not affected by RLS on `public.users`.

### 4.2 Supabase Storage — Bucket Structure

**Bucket:** `run-files` (public)

**Path convention:**

```
run-files/
  {hypothesis_id}/
    {run_id}/
      results.tsv
      {code_filename}        (e.g., train.py, backtest.py)
```

**And for hypothesis starter code files:**

```
run-files/
  starter-code/
    {hypothesis_id}/
      {filename}
```

**Bucket configuration:**

```sql
-- Create the bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('run-files', 'run-files', true);

-- Storage RLS: Anyone can read
CREATE POLICY storage_public_read ON storage.objects
  FOR SELECT USING (bucket_id = 'run-files');

-- Storage RLS: Authenticated users can upload to paths under their runs
-- The server uses the service role key for uploads, so this policy is a safety net.
CREATE POLICY storage_authenticated_insert ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'run-files'
    AND auth.role() = 'authenticated'
  );

-- Storage RLS: Users can delete their own files (via run deletion)
CREATE POLICY storage_owner_delete ON storage.objects
  FOR DELETE USING (
    bucket_id = 'run-files'
    AND auth.role() = 'authenticated'
  );
```

**File size limits (enforced in the API route, not storage policies):**

| File | Max Size | Rationale |
|------|----------|-----------|
| results.tsv | 1 MB | ~10,000 rows at ~100 bytes/row. Typical runs have ~125 rows. |
| code file | 5 MB | Single source files are rarely larger. |
| starter code file | 5 MB | Same as code file. |

**URL construction:**

```
https://<project-ref>.supabase.co/storage/v1/object/public/run-files/{hypothesis_id}/{run_id}/results.tsv
```

This URL is stored in `runs.results_tsv_url` and `runs.code_file_url`.

### 4.3 X/Twitter API — Auto-Posting Run Summaries

**When:** After a successful run submission, the server optionally posts a tweet summarizing the result.

**Who triggers it:** The run submitter must have authenticated via X/Twitter OAuth. The server uses their stored OAuth provider token (from Supabase Auth) to post on their behalf. CLI users authenticated via PAT do not get auto-posting unless they have also completed an OAuth flow (their `auth.users` row has a provider token).

**Accessing the provider token:**

Supabase stores the X/Twitter OAuth access token and refresh token in `auth.identities`. The server (using the service role key) can read these:

```sql
SELECT
  identity_data ->> 'access_token' AS access_token,
  identity_data ->> 'refresh_token' AS refresh_token
FROM auth.identities
WHERE user_id = $1 AND provider = 'twitter';
```

**Token refresh:** X/Twitter OAuth 2.0 access tokens expire after 2 hours. Before posting, the server checks if the token is expired and uses the refresh token to obtain a new one via the X/Twitter token endpoint. Supabase handles this automatically for session-based auth, but for server-initiated posts, we must refresh manually.

**Tweet format:**

```
New run on Agentipedia:

"{hypothesis_title}" (truncated to 100 chars)

{metric_name}: {baseline_metric} → {best_metric} ({improvement_pct}% improvement)
{num_experiments} experiments | {num_kept} kept

https://agentipedia.io/run/{run_id}
```

**Implementation:**

```
POST https://api.twitter.com/2/tweets
Authorization: Bearer {user_access_token}
Content-Type: application/json

{
  "text": "<formatted tweet>"
}
```

**Error handling:** X posting failures are non-blocking. If the tweet fails (rate limit, expired token, API error), the run submission still succeeds. The error is logged server-side. The user sees the run created successfully but may see a "Failed to post to X" warning.

**Rate limit awareness:** X API Basic tier allows 1,500 tweets/month across the app. At V1 scale this is sufficient. Log tweet counts and alert if approaching 80% of the limit.

**V1 scope decision:** Auto-posting is opt-in. The run submission form (and CLI) includes a `post_to_x: boolean` field (default `false` for CLI, toggleable in the browser form). This avoids surprising users and conserves API quota.

### 4.4 Environment Variables

Required configuration for the Next.js application:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (client-side) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (client-side) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `TWITTER_CLIENT_ID` | X/Twitter OAuth 2.0 client ID |
| `TWITTER_CLIENT_SECRET` | X/Twitter OAuth 2.0 client secret |

These are set in Vercel's environment variable configuration and Supabase Dashboard. Never committed to source code.

---

## 5. TSV Parsing Pipeline

### 5.1 Dual Parsing Strategy

TSV parsing happens **twice**: once on the client for instant preview, once on the server as the authoritative parse. The server never trusts client-computed values.

| Stage | Where | Library | Purpose |
|-------|-------|---------|---------|
| Preview parse | Browser | PapaParse | Instant feedback: show auto-extracted fields for confirmation before submission |
| Authoritative parse | Server (API route) | PapaParse (Node.js) | Validate + compute final values that get stored in the database |

Both stages use identical validation logic. The validation module is shared code (`lib/tsv-validation.ts`) imported by both the client component and the API route.

### 5.2 Parsing Configuration

```
PapaParse config:
  delimiter: "\t"
  header: true
  skipEmptyLines: true
  dynamicTyping: false   (parse everything as strings, validate manually)
  transformHeader: (h) => h.trim().toLowerCase()
```

`dynamicTyping: false` is deliberate. We parse all values as strings and then validate/convert manually. This prevents PapaParse from silently misinterpreting values (e.g., treating `"1e3"` as `1000`).

### 5.3 Validation Rules

Validation is structured as a pipeline of checks. Each check returns either `pass` or an error object with the row number and message. All checks run; errors are collected and returned together (not fail-fast).

**Structural validation (runs first):**

| Rule | Error message |
|------|---------------|
| File must not be empty | "File is empty" |
| Must have exactly 5 columns | "Expected 5 columns, found {n}. Columns must be: commit, {metric_name}, memory_gb, status, description" |
| Column headers must match expected names (case-insensitive, trimmed) | "Column {n} must be '{expected}', found '{actual}'" |
| Must have at least 1 data row | "File must have at least one experiment row" |
| Must have at most 10,000 data rows | "File exceeds maximum of 10,000 experiment rows" |

**Note on the metric column header:** The second column header is the metric name, which varies per hypothesis (e.g., `val_bpb`, `sharpe_ratio`). Validation checks that the header matches the parent hypothesis's `metric_name` field (case-insensitive, trimmed). This prevents accidental upload of a TSV from a different hypothesis.

**Per-row validation (runs second, on every data row):**

| Column | Type | Validation rule | Error message |
|--------|------|-----------------|---------------|
| `commit` | string | Non-empty. Either `"baseline"` or a string of 7+ alphanumeric characters. | "Row {n}: commit must be 'baseline' or a 7+ char hash, got '{value}'" |
| metric column | float | Must be a valid finite number (parsed via `parseFloat`, then checked with `isFinite`). | "Row {n}: {metric_name} must be a number, got '{value}'" |
| `memory_gb` | float | Must be a valid finite number >= 0. | "Row {n}: memory_gb must be a non-negative number, got '{value}'" |
| `status` | enum | Must be exactly `"keep"`, `"discard"`, or `"crash"` (case-insensitive, trimmed). | "Row {n}: status must be keep, discard, or crash, got '{value}'" |
| `description` | string | Non-empty after trimming. | "Row {n}: description must not be empty" |

**Cross-row validation (runs third):**

| Rule | Error message |
|------|---------------|
| At least one row must have `status = "keep"` | "No kept experiments found. At least one experiment must have status 'keep'." |
| If a `commit = "baseline"` row exists, it should be the first row | "Baseline row found at position {n} but expected at position 1" |
| Crash rows should have metric value of 0 | "Row {n}: crashed experiments should have metric value 0, got {value}" (warning, not error) |

### 5.4 Auto-Extracted Field Computation

After validation passes, these fields are computed from the parsed data. The hypothesis's `metric_direction` is required to compute `best_metric`.

```
Given:
  rows       = all parsed data rows
  direction  = hypothesis.metric_direction
  kept_rows  = rows where status = "keep"

Compute:

  baseline_metric:
    IF a row with commit = "baseline" exists:
      baseline_metric = that row's metric_value
    ELSE:
      baseline_metric = first row's metric_value

  best_metric:
    IF direction = "lower_is_better":
      best_metric = MIN(metric_value) among kept_rows
    ELSE:
      best_metric = MAX(metric_value) among kept_rows

  best_description:
    description from the kept_row that has the best_metric value.
    (If tie, use the last one — latest experiment wins.)

  num_experiments:  rows.length
  num_kept:         count of rows where status = "keep"
  num_discarded:    count of rows where status = "discard"
  num_crashed:      count of rows where status = "crash"

  improvement_pct:
    IF baseline_metric = 0:
      improvement_pct = 0  (avoid division by zero)
    ELSE:
      improvement_pct = abs(best_metric - baseline_metric) / abs(baseline_metric) * 100
      (Rounded to 1 decimal place)
```

### 5.5 Server-Side Processing Pipeline (Full Sequence)

```
1. Receive multipart/form-data
     ├─ Extract files: results_tsv (Buffer), code_file (Buffer)
     ├─ Extract metadata fields: goal, hardware, time_budget, model_size, tags, forked_from

2. Authenticate request
     ├─ Resolve user from session cookie or PAT
     └─ FAIL 401 if unauthenticated

3. Load hypothesis
     ├─ SELECT id, metric_name, metric_direction, status FROM hypotheses WHERE id = :id
     ├─ FAIL 404 if not found
     └─ FAIL 409 if status != 'open'

4. Validate file sizes
     ├─ results_tsv.size <= 1 MB
     ├─ code_file.size <= 5 MB
     └─ FAIL 413 if exceeded

5. Parse results.tsv
     ├─ PapaParse with config from 5.2
     ├─ Run structural validation
     ├─ Run per-row validation (using hypothesis.metric_name for column header check)
     ├─ Run cross-row validation
     ├─ Collect all errors
     └─ FAIL 400 with { errors: [...] } if any errors

6. Compute auto-extracted fields
     ├─ Using hypothesis.metric_direction
     └─ Returns: baseline_metric, best_metric, best_description,
                 num_experiments, num_kept, num_discarded, num_crashed,
                 improvement_pct

7. Validate forked_from (if provided)
     ├─ SELECT id FROM runs WHERE id = :forked_from AND hypothesis_id = :hypothesis_id
     └─ FAIL 400 if run doesn't exist or belongs to different hypothesis

8. Generate run_id = gen_random_uuid()

9. Upload files to Supabase Storage (parallel)
     ├─ runs/{hypothesis_id}/{run_id}/results.tsv
     └─ runs/{hypothesis_id}/{run_id}/{code_filename}
     NOTE: If upload fails, FAIL 500 and clean up any partially uploaded files.

10. Database transaction:
     ├─ INSERT INTO runs (
     │     id, hypothesis_id, user_id,
     │     goal, hardware, time_budget, model_size,
     │     tag_1, tag_2, forked_from,
     │     baseline_metric, best_metric, best_description,
     │     num_experiments, num_kept, num_discarded, num_crashed,
     │     improvement_pct,
     │     results_tsv_url, code_file_url, code_filename
     │   )
     │
     └─ Bulk INSERT INTO experiments (
           run_id, sequence, commit_hash, metric_value,
           memory_gb, status, description
         )
         -- One row per parsed TSV data row. sequence = 1-based row index.

11. Return 201 with run summary

12. Post-response (non-blocking):
     ├─ Update api_tokens.last_used_at if PAT auth
     └─ Post to X/Twitter if post_to_x = true (see Section 4.3)
```

### 5.6 Error Response Format for TSV Validation

```json
{
  "error": "TSV validation failed",
  "errors": [
    {
      "type": "structural",
      "message": "Expected 5 columns, found 4"
    },
    {
      "type": "row",
      "row": 15,
      "column": "status",
      "message": "status must be keep, discard, or crash, got 'kept'"
    },
    {
      "type": "cross_row",
      "message": "No kept experiments found. At least one experiment must have status 'keep'."
    }
  ]
}
```

### 5.7 Client-Side Preview Behavior

When the user selects a `results.tsv` file in the browser form:

1. PapaParse parses the file immediately (no server round-trip).
2. The same validation module runs.
3. If validation fails: show errors inline, disable the Submit button.
4. If validation passes: show a preview panel with:
   - Baseline metric value
   - Best metric value and its description
   - Improvement percentage
   - Experiment counts (kept / discarded / crashed)
   - First 5 rows and last 5 rows of the experiment table
5. User reviews the preview and clicks Submit.

This gives instant feedback and prevents submitting obviously malformed files.

---

## 6. Performance Considerations

### 6.1 Query Performance Summary

| Query | Expected latency | Index used |
|-------|-----------------|------------|
| Feed (domain filter + newest sort) | < 50ms | `idx_hypotheses_domain_created` |
| Hypothesis detail | < 10ms | Primary key |
| Runs for hypothesis (best metric sort) | < 30ms | `idx_runs_hypothesis_best` |
| Experiments for run | < 20ms | `idx_experiments_run_sequence` |
| Hypothesis progression | < 30ms | `idx_runs_hypothesis_created` |
| PAT lookup | < 5ms | `idx_api_tokens_token_hash` |

### 6.2 Feed Aggregation Strategy

The `hypothesis_feed` view uses `LEFT JOIN LATERAL` to compute `run_count` and `best_metric_value` per hypothesis. At V1 scale (hundreds of hypotheses, tens of runs each), this is fast enough. If it becomes a bottleneck:

**Option A — Denormalize onto hypotheses:**

Add `run_count`, `best_metric_value`, `best_run_user_id` columns to `hypotheses`. Update them via a Postgres trigger on `runs` INSERT/DELETE:

```sql
CREATE OR REPLACE FUNCTION update_hypothesis_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE hypotheses SET
    run_count = (SELECT COUNT(*) FROM runs WHERE hypothesis_id = NEW.hypothesis_id),
    -- ... recompute best metric
    updated_at = now()
  WHERE id = NEW.hypothesis_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Option B — Materialized view:** Refresh `hypothesis_feed` as a materialized view on a 1-minute cron. Provides stale-but-fast reads.

For V1, neither optimization is needed. The view approach is correct for the expected scale.

### 6.3 Experiment Bulk Insert

A typical run has ~125 experiments. The server uses a single multi-row INSERT statement rather than 125 individual inserts:

```sql
INSERT INTO experiments (run_id, sequence, commit_hash, metric_value, memory_gb, status, description)
VALUES
  ($1, 1, 'baseline', 1.567, 24.5, 'keep', 'Initial baseline'),
  ($1, 2, 'a1b2c3d', 1.543, 24.8, 'keep', 'Added GQA'),
  ...
```

This ensures all experiments are inserted atomically within the same transaction as the run.

---

## 7. Security Considerations

### 7.1 Input Validation Boundaries

| Boundary | What is validated |
|----------|-------------------|
| API route entry | Request body schema (Zod), file sizes, content types |
| TSV parsing | Column count, headers, data types, value ranges |
| Database | Constraints, CHECK clauses, RLS policies |
| Storage | File size limits, path sanitization |

Use Zod schemas for all API request body validation. Define schemas once, use for both type inference and runtime validation.

### 7.2 File Upload Security

- **Content-type validation:** Accept only `text/tab-separated-values`, `text/plain`, and `text/csv` for TSV files. Code files: any text MIME type.
- **Filename sanitization:** Strip path separators, null bytes, and special characters. Use `{run_id}/results.tsv` as the canonical storage path regardless of the original filename.
- **No server-side execution:** Files are stored and served as-is. The code file is displayed with syntax highlighting in the browser but never executed on the server.
- **TSV size limit enforced before parsing:** Check `Buffer.byteLength` before passing to PapaParse. This prevents memory exhaustion from maliciously large files.

### 7.3 PAT Security

- Tokens are prefixed with `agp_` for easy identification in secret scanning tools (GitHub, GitGuardian).
- Only the SHA-256 hash is stored. The raw token is shown once at creation and never retrievable.
- The partial index on `token_hash WHERE revoked_at IS NULL` means revoked tokens are never matched during authentication, even if the hash is queried.
- Rate limiting: Apply standard rate limits to all API routes (Vercel's built-in rate limiting or a middleware). PAT-authenticated requests should be rate-limited per user, not per token.

### 7.4 RLS Defense in Depth

RLS is the last line of defense, not the only one. The API routes enforce authorization checks in application code before the database query runs. RLS catches any bugs in the application logic. This means:

- The API route checks `user_id` matches the authenticated user before UPDATE/DELETE.
- RLS independently enforces the same check.
- If the API route has a bug that skips the check, RLS still blocks the unauthorized operation.
