import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * OAuth callback handler.
 * Supabase redirects here after the user authenticates with X/Twitter.
 * Exchanges the auth code for a session, then syncs X profile data
 * to public.users (upsert).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/login?error=no_code`);
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("OAuth callback error:", error.message);
    return NextResponse.redirect(`${origin}/auth/login?error=exchange_failed`);
  }

  // Sync X profile data to public.users
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const metadata = user.user_metadata;
    const xProfile = {
      id: user.id,
      x_user_id: metadata.provider_id ?? metadata.sub ?? "",
      x_handle: metadata.user_name ?? metadata.preferred_username ?? "",
      x_display_name: metadata.full_name ?? metadata.name ?? "",
      x_avatar_url: metadata.avatar_url ?? "",
      last_login_at: new Date().toISOString(),
    };

    const { error: upsertError } = await supabase.from("users").upsert(
      xProfile,
      { onConflict: "id" }
    );

    if (upsertError) {
      console.error("User profile sync error:", upsertError.message);
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
