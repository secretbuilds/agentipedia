import { createServerSupabaseClient } from "@/lib/supabase/server";

export type HypothesisFeedFilters = {
  domain?: string;
  status?: "open" | "closed";
  dataset?: string;
  metric?: string;
  tag?: string;
  userId?: string;
  sort?: "newest" | "most_runs" | "best_result";
  cursor?: string;
  limit?: number;
};

type DecodedCursor = {
  created_at: string;
  id: string;
};

function decodeCursor(cursor: string): DecodedCursor | null {
  try {
    return JSON.parse(atob(cursor));
  } catch {
    return null;
  }
}

function encodeCursor(created_at: string, id: string): string {
  return btoa(JSON.stringify({ created_at, id }));
}

export async function getHypotheses(filters: HypothesisFeedFilters = {}) {
  const supabase = await createServerSupabaseClient();
  const limit = Math.min(filters.limit ?? 20, 50);

  let query = supabase
    .from("hypothesis_feed")
    .select("*")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1); // Fetch one extra to detect next page

  // Apply filters
  if (filters.domain) {
    query = query.eq("domain", filters.domain);
  }
  if (filters.status) {
    query = query.eq("status", filters.status);
  } else {
    query = query.eq("status", "open");
  }
  if (filters.userId) {
    query = query.eq("user_id", filters.userId);
  }
  if (filters.tag) {
    query = query.or(`tag_1.eq.${filters.tag},tag_2.eq.${filters.tag}`);
  }

  // Cursor-based pagination
  if (filters.cursor) {
    const decoded = decodeCursor(filters.cursor);
    if (decoded) {
      query = query.or(
        `created_at.lt.${decoded.created_at},and(created_at.eq.${decoded.created_at},id.lt.${decoded.id})`
      );
    }
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch hypotheses: ${error.message}`);
  }

  const hasMore = (data?.length ?? 0) > limit;
  const items = data?.slice(0, limit) ?? [];
  const nextCursor =
    hasMore && items.length > 0
      ? encodeCursor(
          items[items.length - 1].created_at,
          items[items.length - 1].id
        )
      : null;

  return { hypotheses: items, nextCursor };
}

export async function getHypothesisById(id: string) {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("hypothesis_feed")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return null;
  }

  return data;
}
