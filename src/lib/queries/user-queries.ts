import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getCurrentUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return null;
  }

  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .single();

  return data;
}

export async function getUserByHandle(handle: string) {
  const supabase = await createServerSupabaseClient();

  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("x_handle", handle)
    .single();

  return data;
}
