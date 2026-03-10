import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

const DEMO_EMAIL = "demo@agentipedia.ai";
const DEMO_PASSWORD = "REDACTED";

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Missing Supabase config" },
      { status: 500 },
    );
  }

  const admin = createAdminClient(supabaseUrl, serviceRoleKey);

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
  const { error: signInError } = await supabase.auth.signInWithPassword({
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
      const { error: retryError } = await supabase.auth.signInWithPassword({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
      });
      if (retryError) {
        return NextResponse.json(
          { error: `Dev login failed: ${retryError.message}` },
          { status: 500 },
        );
      }
    } else {
      return NextResponse.json(
        { error: `Dev login failed: ${signInError.message}` },
        { status: 500 },
      );
    }
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return NextResponse.redirect(new URL("/", origin).toString());
}
