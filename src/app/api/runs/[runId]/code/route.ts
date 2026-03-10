import { NextResponse, type NextRequest } from "next/server";
import { getRunCodeSnapshot } from "@/lib/queries/run-queries";
import { resolveCodeSnapshot } from "@/lib/diff/resolve-code-snapshot";

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

    const row = await getRunCodeSnapshot(runId);

    if (!row) {
      return NextResponse.json(
        { success: false, error: "Run not found" },
        { status: 404 },
      );
    }

    const snapshot = await resolveCodeSnapshot(
      row.code_snapshot,
      row.code_file_url,
      row.code_filename,
    );

    if (!snapshot) {
      return NextResponse.json(
        { success: false, error: "No code available for this run" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: { code_snapshot: snapshot },
    });
  } catch (err) {
    console.error("GET /api/runs/[runId]/code error:", err);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
