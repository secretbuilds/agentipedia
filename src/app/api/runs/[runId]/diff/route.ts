import { NextResponse, type NextRequest } from "next/server";
import { getRunCodeSnapshot } from "@/lib/queries/run-queries";
import { resolveCodeSnapshot } from "@/lib/diff/resolve-code-snapshot";
import { computeCodeDiff } from "@/lib/diff/compute-code-diff";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type RouteContext = { params: Promise<{ runId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { runId } = await context.params;

    if (!UUID_REGEX.test(runId)) {
      return NextResponse.json(
        { success: false, error: "Invalid ID" },
        { status: 400 },
      );
    }

    const base = request.nextUrl.searchParams.get("base");

    if (!base) {
      return NextResponse.json(
        { success: false, error: "Missing required query parameter: base" },
        { status: 400 },
      );
    }

    if (!UUID_REGEX.test(base)) {
      return NextResponse.json(
        { success: false, error: "Invalid base ID" },
        { status: 400 },
      );
    }

    const [baseRow, targetRow] = await Promise.all([
      getRunCodeSnapshot(base),
      getRunCodeSnapshot(runId),
    ]);

    if (!baseRow) {
      return NextResponse.json(
        { success: false, error: "Base run not found" },
        { status: 404 },
      );
    }

    if (!targetRow) {
      return NextResponse.json(
        { success: false, error: "Target run not found" },
        { status: 404 },
      );
    }

    const [baseSnapshot, targetSnapshot] = await Promise.all([
      resolveCodeSnapshot(
        baseRow.code_snapshot,
        baseRow.code_file_url,
        baseRow.code_filename,
      ),
      resolveCodeSnapshot(
        targetRow.code_snapshot,
        targetRow.code_file_url,
        targetRow.code_filename,
      ),
    ]);

    const diffResult = computeCodeDiff(
      base,
      runId,
      baseSnapshot ?? {},
      targetSnapshot ?? {},
    );

    return NextResponse.json({ success: true, data: diffResult });
  } catch (err) {
    console.error("GET /api/runs/[runId]/diff error:", err);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
