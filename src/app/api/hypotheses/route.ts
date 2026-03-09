import { NextResponse, type NextRequest } from "next/server";
import { getHypotheses } from "@/lib/queries/hypothesis-queries";
import type { HypothesisSortOption } from "@/lib/queries/hypothesis-queries";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const domain = searchParams.get("domain") || undefined;
  const status = searchParams.get("status") || undefined;
  const sort = (searchParams.get("sort") || "newest") as HypothesisSortOption;
  const cursor = searchParams.get("cursor") || undefined;

  const result = await getHypotheses({ domain, status, sort, cursor });

  return NextResponse.json(result);
}
