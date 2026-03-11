import "server-only";

import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Profile data extracted from a Supabase auth user for upserting into public.users.
 */
type XProfileData = {
  readonly id: string;
  readonly x_user_id: string;
  readonly x_handle: string;
  readonly x_display_name: string;
  readonly x_avatar_url: string;
};

/**
 * Extracts X/Twitter profile fields from a Supabase auth user.
 *
 * Supabase stores provider data in user_metadata and identities.
 * We check multiple field names because the shape varies between
 * X OAuth and manually-created dev users.
 */
export function extractXProfile(user: User): XProfileData {
  const meta = user.user_metadata ?? {};
  const identity = user.identities?.[0];

  const x_user_id =
    meta.provider_id ??
    identity?.id ??
    user.id;

  const x_handle =
    meta.preferred_username ??
    meta.user_name ??
    meta.x_handle ??
    "unknown";

  const x_display_name =
    meta.full_name ??
    meta.name ??
    meta.x_display_name ??
    x_handle;

  const x_avatar_url =
    meta.avatar_url ??
    meta.picture ??
    meta.x_avatar_url ??
    "";

  return {
    id: user.id,
    x_user_id: String(x_user_id),
    x_handle: String(x_handle),
    x_display_name: String(x_display_name),
    x_avatar_url: String(x_avatar_url),
  };
}

/**
 * Upserts a user's X/Twitter profile into public.users.
 *
 * Uses the admin client to bypass RLS. On conflict (returning user),
 * updates profile fields and last_login_at. This is best-effort:
 * errors are logged but never thrown, so the caller's redirect flow
 * is never interrupted.
 */
export async function syncUserProfile(user: User): Promise<void> {
  try {
    const profile = extractXProfile(user);

    const admin = createAdminClient();

    const { error } = await admin.from("users").upsert(
      {
        id: profile.id,
        x_user_id: profile.x_user_id,
        x_handle: profile.x_handle,
        x_display_name: profile.x_display_name,
        x_avatar_url: profile.x_avatar_url,
        last_login_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

    if (error) {
      console.error(
        "[syncUserProfile] Failed to upsert public.users:",
        error.message,
      );
    }
  } catch (err) {
    console.error(
      "[syncUserProfile] Unexpected error:",
      err instanceof Error ? err.message : err,
    );
  }
}
