import { NextResponse, type NextRequest } from "next/server";
import { getLeavesByHypothesis } from "@/lib/queries/run-queries";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type RouteContext = { params: Promise<{ hypothesisId: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { hypothesisId } = await context.params;

    if (!UUID_REGEX.test(hypothesisId)) {
      return NextResponse.json(
        { success: false, error: "Invalid ID" },
        { status: 400 },
      );
    }

    const leaves = await getLeavesByHypothesis(hypothesisId);

    return NextResponse.json({ success: true, data: leaves });
  } catch (err) {
    console.error("GET /api/hypotheses/[hypothesisId]/leaves error:", err);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
