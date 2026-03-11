import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncUserProfile } from "@/lib/auth/sync-user-profile";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const origin = requestUrl.origin;
  const code = requestUrl.searchParams.get("code");
  const returnTo = requestUrl.searchParams.get("returnTo");

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Sync X/Twitter profile into public.users — fail if broken
      if (data.user) {
        try {
          await syncUserProfile(data.user);
        } catch (err) {
          console.error("[auth/callback] syncUserProfile error:", err);
          // If profile sync fails, sign out the broken session and redirect to error
          await supabase.auth.signOut();
          const loginUrl = new URL("/auth/login", origin);
          loginUrl.searchParams.set(
            "error",
            "Failed to set up your account. Please try again."
          );
          return NextResponse.redirect(loginUrl.toString());
        }
      }

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
