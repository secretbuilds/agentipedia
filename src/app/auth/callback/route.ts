import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const returnTo = searchParams.get("returnTo");

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Check if this is a brand-new user (created_at ≈ now, within 30 seconds)
      const isNewUser = data.user?.created_at
        ? Date.now() - new Date(data.user.created_at).getTime() < 30_000
        : false;

      // Build redirect URL
      let redirectPath = "/";
      if (returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")) {
        redirectPath = returnTo;
      }

      const redirectUrl = new URL(redirectPath, origin);
      if (isNewUser) {
        redirectUrl.searchParams.set("welcome", "1");
      }

      return NextResponse.redirect(redirectUrl.toString());
    }

    const loginUrl = new URL("/auth/login", origin);
    loginUrl.searchParams.set("error", "Authentication failed. Please try again.");
    return NextResponse.redirect(loginUrl.toString());
  }

  const loginUrl = new URL("/auth/login", origin);
  loginUrl.searchParams.set("error", "No authorization code provided");
  return NextResponse.redirect(loginUrl.toString());
}
