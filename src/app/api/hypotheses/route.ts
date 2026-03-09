import { NextResponse, type NextRequest } from "next/server";
import { getHypotheses } from "@/lib/queries/hypothesis-queries";
import type { HypothesisSortOption } from "@/lib/queries/hypothesis-queries";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const domain = searchParams.get("domain") || undefined;
    const status = searchParams.get("status") || undefined;
    const VALID_SORTS = ["newest", "most_runs", "best_result"] as const;
    const rawSort = searchParams.get("sort") || "newest";
    const sort = (VALID_SORTS.includes(rawSort as typeof VALID_SORTS[number]) ? rawSort : "newest") as HypothesisSortOption;
    const cursor = searchParams.get("cursor") || undefined;

    const result = await getHypotheses({ domain, status, sort, cursor });

    return NextResponse.json(result);
  } catch (err) {
    console.error("GET /api/hypotheses unexpected error:", err);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred. Please try again." },
      { status: 500 },
    );
  }
}
