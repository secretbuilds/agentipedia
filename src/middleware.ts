import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PROTECTED_PREFIXES = [
  "/hypotheses/new",
  "/settings",
  "/auth/agents",
] as const;

const PROTECTED_PATTERNS = [
  /^\/hypotheses\/[^/]+\/edit$/,
  /^\/hypotheses\/[^/]+\/submit-run$/,
] as const;

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);

  const isProtected =
    PROTECTED_PREFIXES.some((prefix) =>
      request.nextUrl.pathname.startsWith(prefix),
    ) ||
    PROTECTED_PATTERNS.some((pattern) =>
      pattern.test(request.nextUrl.pathname),
    );

  if (isProtected && !user) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("returnTo", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon)
     * - public folder assets (svg, png, jpg, jpeg, gif, webp)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
