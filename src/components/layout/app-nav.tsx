import { createClient } from "@/lib/supabase/server";
import { TopNav } from "@/components/layout/top-nav";

export async function AppNav() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  const navUser = authUser
    ? {
        x_handle:
          (authUser.user_metadata?.user_name as string) ??
          (authUser.user_metadata?.preferred_username as string) ??
          "",
        x_display_name:
          (authUser.user_metadata?.full_name as string) ??
          (authUser.user_metadata?.name as string) ??
          "",
        x_avatar_url:
          (authUser.user_metadata?.avatar_url as string) ?? "",
      }
    : null;

  return <TopNav user={navUser} />;
}
