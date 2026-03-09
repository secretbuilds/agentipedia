import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { HypothesisCard, Hypothesis } from "@/types/hypothesis";
import type { UserSummary } from "@/types/user";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type HypothesisSortOption = "newest" | "most_runs" | "best_result";

export interface HypothesisListParams {
  readonly domain?: string;
  readonly status?: string;
  readonly sort?: HypothesisSortOption;
  readonly cursor?: string;
  readonly limit?: number;
}

export interface HypothesisListResult {
  readonly items: readonly HypothesisCard[];
  readonly next_cursor: string | null;
  readonly has_more: boolean;
}

// ---------------------------------------------------------------------------
// Cursor helpers
// ---------------------------------------------------------------------------

/**
 * ISO 8601 timestamp pattern — must start with a valid date-time prefix.
 * Rejects values containing characters that could manipulate PostgREST filters.
 */
const ISO_TIMESTAMP_REGEX =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/;

/**
 * Standard UUID v4 pattern (case-insensitive).
 */
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function encodeCursor(createdAt: string, id: string): string {
  return Buffer.from(`${createdAt}|${id}`).toString("base64url");
}

function decodeCursor(cursor: string): { createdAt: string; id: string } | null {
  try {
    const decoded = Buffer.from(cursor, "base64url").toString("utf-8");
    const separatorIdx = decoded.indexOf("|");
    if (separatorIdx === -1) return null;

    const createdAt = decoded.slice(0, separatorIdx);
    const id = decoded.slice(separatorIdx + 1);
    if (!createdAt || !id) return null;

    // Validate cursor components to prevent PostgREST filter injection.
    // createdAt must be a valid ISO timestamp; id must be a valid UUID.
    if (!ISO_TIMESTAMP_REGEX.test(createdAt)) return null;
    if (!UUID_REGEX.test(id)) return null;

    return { createdAt, id };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Fetch a paginated list of hypotheses from the `hypothesis_feed` view.
 *
 * Uses cursor-based pagination (cursor = base64url of `created_at|id`).
 * Defaults to "newest" sort (created_at DESC).
 */
export async function getHypotheses(
  params: HypothesisListParams = {},
): Promise<HypothesisListResult> {
  const {
    domain,
    status,
    sort = "newest",
    cursor,
    limit = 20,
  } = params;

  const supabase = await createClient();
  const pageSize = Math.min(Math.max(limit, 1), 100);

  // We fetch pageSize + 1 to detect whether more rows exist
  let query = supabase
    .from("hypothesis_feed")
    .select("*")
    .limit(pageSize + 1);

  // Filters
  if (domain) {
    query = query.eq("domain", domain);
  }
  if (status) {
    query = query.eq("status", status);
  }

  // Sorting
  switch (sort) {
    case "most_runs":
      query = query.order("run_count", { ascending: false }).order("created_at", { ascending: false });
      break;
    case "best_result":
      query = query.order("best_metric", { ascending: true, nullsFirst: false }).order("created_at", { ascending: false });
      break;
    case "newest":
    default:
      query = query.order("created_at", { ascending: false }).order("id", { ascending: false });
      break;
  }

  // Cursor-based pagination (only for "newest" sort — safe default)
  if (cursor) {
    const parsed = decodeCursor(cursor);
    if (parsed) {
      // For descending order: get rows that come *after* the cursor
      query = query.or(
        `created_at.lt.${parsed.createdAt},and(created_at.eq.${parsed.createdAt},id.lt.${parsed.id})`,
      );
    }
  }

  const { data, error } = await query;

  if (error) {
    console.error("getHypotheses error:", error);
    return { items: [], next_cursor: null, has_more: false };
  }

  if (!data || data.length === 0) {
    return { items: [], next_cursor: null, has_more: false };
  }

  const hasMore = data.length > pageSize;
  const rows = hasMore ? data.slice(0, pageSize) : data;

  const items: HypothesisCard[] = rows.map((row) => ({
    id: row.id,
    user_id: row.user_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
    title: row.title,
    description: row.description,
    domain: row.domain,
    dataset_url: row.dataset_url,
    dataset_name: row.dataset_name,
    metric_name: row.metric_name,
    metric_direction: row.metric_direction,
    baseline_to_beat: row.baseline_to_beat,
    starter_code_url: row.starter_code_url,
    starter_code_file_url: row.starter_code_file_url,
    hardware_recommendation: row.hardware_recommendation,
    tag_1: row.tag_1,
    tag_2: row.tag_2,
    status: row.status,
    user: {
      x_handle: row.x_handle,
      x_display_name: row.x_display_name,
      x_avatar_url: row.x_avatar_url,
    } as UserSummary,
    run_count: row.run_count ?? 0,
    best_run: row.best_metric != null
      ? { best_metric: row.best_metric, user_handle: row.best_run_user_handle ?? "" }
      : null,
  }));

  const lastItem = rows[rows.length - 1];
  const nextCursor = hasMore
    ? encodeCursor(lastItem.created_at, lastItem.id)
    : null;

  return { items, next_cursor: nextCursor, has_more: hasMore };
}

/**
 * Fetch a single hypothesis by ID with author info from users table join.
 */
export async function getHypothesisById(
  id: string,
): Promise<(Hypothesis & { user: UserSummary }) | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("hypotheses")
    .select(`
      *,
      users!hypotheses_user_id_fkey (
        x_handle,
        x_display_name,
        x_avatar_url
      )
    `)
    .eq("id", id)
    .single();

  if (error || !data) {
    if (error && error.code !== "PGRST116") {
      console.error("getHypothesisById error:", error);
    }
    return null;
  }

  const userRow = data.users as unknown as UserSummary | null;

  return {
    id: data.id,
    user_id: data.user_id,
    created_at: data.created_at,
    updated_at: data.updated_at,
    title: data.title,
    description: data.description,
    domain: data.domain,
    dataset_url: data.dataset_url,
    dataset_name: data.dataset_name,
    metric_name: data.metric_name,
    metric_direction: data.metric_direction,
    baseline_to_beat: data.baseline_to_beat,
    starter_code_url: data.starter_code_url,
    starter_code_file_url: data.starter_code_file_url,
    hardware_recommendation: data.hardware_recommendation,
    tag_1: data.tag_1,
    tag_2: data.tag_2,
    status: data.status,
    user: userRow ?? {
      x_handle: "",
      x_display_name: "",
      x_avatar_url: "",
    },
  };
}
