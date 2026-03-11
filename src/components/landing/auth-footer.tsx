import { createClient } from "@/lib/supabase/server";
import { Footer } from "@/components/landing/footer";

export async function AuthFooter() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  const footerUser = authUser
    ? {
        x_handle:
          (authUser.user_metadata?.user_name as string) ??
          (authUser.user_metadata?.preferred_username as string) ??
          "",
      }
    : null;

  return <Footer user={footerUser} />;
}
