import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncUserProfile } from "@/lib/auth/sync-user-profile";

const DEMO_EMAIL = "demo@agentipedia.ai";
const DEMO_PASSWORD = "REDACTED";

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const admin = createAdminClient();

  // Ensure the demo user exists (created through admin API so GoTrue knows about it)
  const { data: listData } = await admin.auth.admin.listUsers();
  const demoUser = listData?.users.find((u) => u.email === DEMO_EMAIL);

  if (!demoUser) {
    // Create the demo user through the admin API
    const { error: createError } = await admin.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: {
        x_handle: "demo_user",
        x_display_name: "Demo User",
      },
    });

    if (createError) {
      return NextResponse.json(
        { error: `Failed to create demo user: ${createError.message}` },
        { status: 500 },
      );
    }
  }

  // Sign in with password — sets session cookies via the server client
  const supabase = await createClient();
  const { data: signInData, error: signInError } =
    await supabase.auth.signInWithPassword({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    });

  if (signInError) {
    // If password is wrong (user existed before), update it and retry
    if (signInError.message.includes("Invalid login credentials")) {
      await admin.auth.admin.updateUserById(
        demoUser?.id ?? "",
        { password: DEMO_PASSWORD },
      );
      const { data: retryData, error: retryError } =
        await supabase.auth.signInWithPassword({
          email: DEMO_EMAIL,
          password: DEMO_PASSWORD,
        });
      if (retryError) {
        return NextResponse.json(
          { error: `Dev login failed: ${retryError.message}` },
          { status: 500 },
        );
      }
      // Best-effort sync of demo user profile into public.users
      if (retryData.user) {
        try {
          await syncUserProfile(retryData.user);
        } catch (err) {
          console.error("[dev-login] syncUserProfile error:", err);
        }
      }
    } else {
      return NextResponse.json(
        { error: `Dev login failed: ${signInError.message}` },
        { status: 500 },
      );
    }
  } else if (signInData.user) {
    // Best-effort sync of demo user profile into public.users
    try {
      await syncUserProfile(signInData.user);
    } catch (err) {
      console.error("[dev-login] syncUserProfile error:", err);
    }
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return NextResponse.redirect(new URL("/", origin).toString());
}
