import { NextResponse, type NextRequest } from "next/server";
import { getHypotheses } from "@/lib/queries/hypothesis-queries";
import type { HypothesisSortOption } from "@/lib/queries/hypothesis-queries";
import { DOMAINS, HYPOTHESIS_STATUSES } from "@/lib/utils/constants";

const VALID_DOMAINS = DOMAINS.map((d) => d.value) as readonly string[];
const VALID_STATUSES = HYPOTHESIS_STATUSES as readonly string[];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const rawDomain = searchParams.get("domain") || undefined;
    const domain = rawDomain && VALID_DOMAINS.includes(rawDomain) ? rawDomain : undefined;
    const rawStatus = searchParams.get("status") || undefined;
    const status = rawStatus && VALID_STATUSES.includes(rawStatus) ? rawStatus : undefined;
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
