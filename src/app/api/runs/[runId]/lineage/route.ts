import { NextResponse, type NextRequest } from "next/server";
import { getRunLineage } from "@/lib/queries/run-queries";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type RouteContext = { params: Promise<{ runId: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { runId } = await context.params;

    if (!UUID_REGEX.test(runId)) {
      return NextResponse.json(
        { success: false, error: "Invalid ID" },
        { status: 400 },
      );
    }

    const lineage = await getRunLineage(runId);

    if (lineage.length === 0) {
      return NextResponse.json(
        { success: false, error: "Run not found or has no lineage" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: lineage });
  } catch (err) {
    console.error("GET /api/runs/[runId]/lineage error:", err);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
