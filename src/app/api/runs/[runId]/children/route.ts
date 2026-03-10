import { NextResponse, type NextRequest } from "next/server";
import { getRunChildren } from "@/lib/queries/run-queries";

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

    const children = await getRunChildren(runId);

    return NextResponse.json({ success: true, data: children });
  } catch (err) {
    console.error("GET /api/runs/[runId]/children error:", err);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
