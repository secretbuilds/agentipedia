import { describe, it, expect, vi, beforeEach } from "vitest";
import type { User } from "@supabase/supabase-js";

// Mock "server-only" to allow importing in test environment
vi.mock("server-only", () => ({}));

// Mock the admin client module
const mockUpsert = vi.fn();
const mockFrom = vi.fn(() => ({ upsert: mockUpsert }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

// Import after mocks are set up
const { extractXProfile, syncUserProfile } = await import(
  "@/lib/auth/sync-user-profile"
);

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-uuid-123",
    app_metadata: {},
    aud: "authenticated",
    created_at: "2026-01-01T00:00:00Z",
    user_metadata: {},
    ...overrides,
  } as User;
}

describe("extractXProfile", () => {
  it("extracts profile from standard X OAuth user_metadata", () => {
    const user = makeUser({
      user_metadata: {
        provider_id: "x-id-999",
        preferred_username: "alice_x",
        full_name: "Alice Smith",
        avatar_url: "https://pbs.twimg.com/alice.jpg",
      },
    });

    const profile = extractXProfile(user);

    expect(profile).toEqual({
      id: "user-uuid-123",
      x_user_id: "x-id-999",
      x_handle: "alice_x",
      x_display_name: "Alice Smith",
      x_avatar_url: "https://pbs.twimg.com/alice.jpg",
    });
  });

  it("falls back to alternate field names (user_name, name, picture)", () => {
    const user = makeUser({
      user_metadata: {
        provider_id: "x-id-456",
        user_name: "bob_x",
        name: "Bob Jones",
        picture: "https://pbs.twimg.com/bob.jpg",
      },
    });

    const profile = extractXProfile(user);

    expect(profile).toEqual({
      id: "user-uuid-123",
      x_user_id: "x-id-456",
      x_handle: "bob_x",
      x_display_name: "Bob Jones",
      x_avatar_url: "https://pbs.twimg.com/bob.jpg",
    });
  });

  it("falls back to identity id when provider_id is missing", () => {
    const user = makeUser({
      user_metadata: {
        preferred_username: "carol_x",
        full_name: "Carol Danvers",
        avatar_url: "https://pbs.twimg.com/carol.jpg",
      },
      identities: [
        {
          id: "identity-id-789",
          identity_id: "identity-id-789",
          user_id: "user-uuid-123",
          provider: "twitter",
          identity_data: {},
          created_at: "2026-01-01T00:00:00Z",
          last_sign_in_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        },
      ],
    });

    const profile = extractXProfile(user);

    expect(profile.x_user_id).toBe("identity-id-789");
  });

  it("falls back to user.id when both provider_id and identity are missing", () => {
    const user = makeUser({
      id: "fallback-uuid",
      user_metadata: {},
      identities: [],
    });

    const profile = extractXProfile(user);

    expect(profile.x_user_id).toBe("fallback-uuid");
  });

  it("handles demo user metadata with x_handle and x_display_name fields", () => {
    const user = makeUser({
      id: "demo-uuid",
      user_metadata: {
        x_handle: "demo_user",
        x_display_name: "Demo User",
      },
      identities: [],
    });

    const profile = extractXProfile(user);

    expect(profile).toEqual({
      id: "demo-uuid",
      x_user_id: "demo-uuid",
      x_handle: "demo_user",
      x_display_name: "Demo User",
      x_avatar_url: "",
    });
  });

  it("uses 'unknown' for handle when no handle field exists", () => {
    const user = makeUser({
      user_metadata: {},
      identities: [],
    });

    const profile = extractXProfile(user);

    expect(profile.x_handle).toBe("unknown");
  });

  it("uses handle as display name when no name field exists", () => {
    const user = makeUser({
      user_metadata: {
        preferred_username: "just_handle",
      },
      identities: [],
    });

    const profile = extractXProfile(user);

    expect(profile.x_display_name).toBe("just_handle");
  });

  it("uses empty string for avatar when no avatar field exists", () => {
    const user = makeUser({
      user_metadata: {},
      identities: [],
    });

    const profile = extractXProfile(user);

    expect(profile.x_avatar_url).toBe("");
  });

  it("converts non-string values to strings", () => {
    const user = makeUser({
      user_metadata: {
        provider_id: 12345,
      },
      identities: [],
    });

    const profile = extractXProfile(user);

    expect(profile.x_user_id).toBe("12345");
    expect(typeof profile.x_user_id).toBe("string");
  });
});

describe("syncUserProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpsert.mockResolvedValue({ error: null });
  });

  it("calls upsert with correct data from user metadata", async () => {
    const user = makeUser({
      user_metadata: {
        provider_id: "x-id-999",
        preferred_username: "alice_x",
        full_name: "Alice Smith",
        avatar_url: "https://pbs.twimg.com/alice.jpg",
      },
    });

    await syncUserProfile(user);

    expect(mockFrom).toHaveBeenCalledWith("users");
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "user-uuid-123",
        x_user_id: "x-id-999",
        x_handle: "alice_x",
        x_display_name: "Alice Smith",
        x_avatar_url: "https://pbs.twimg.com/alice.jpg",
      }),
      { onConflict: "id" },
    );
  });

  it("includes last_login_at as an ISO string", async () => {
    const user = makeUser({
      user_metadata: { preferred_username: "test" },
    });

    await syncUserProfile(user);

    const upsertArg = mockUpsert.mock.calls[0][0];
    expect(upsertArg.last_login_at).toBeDefined();
    // Verify it parses as a valid date
    expect(Number.isNaN(Date.parse(upsertArg.last_login_at))).toBe(false);
  });

  it("does not throw when upsert fails", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockUpsert.mockResolvedValue({
      error: { message: "duplicate key violation" },
    });

    const user = makeUser({
      user_metadata: { preferred_username: "test" },
    });

    // Should not throw
    await expect(syncUserProfile(user)).resolves.toBeUndefined();

    expect(consoleSpy).toHaveBeenCalledWith(
      "[syncUserProfile] Failed to upsert public.users:",
      "duplicate key violation",
    );

    consoleSpy.mockRestore();
  });

  it("does not throw when upsert rejects with an exception", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockUpsert.mockRejectedValue(new Error("network failure"));

    const user = makeUser({
      user_metadata: { preferred_username: "test" },
    });

    // syncUserProfile catches thrown errors and logs them instead of propagating.
    await expect(syncUserProfile(user)).resolves.toBeUndefined();

    expect(consoleSpy).toHaveBeenCalledWith(
      "[syncUserProfile] Unexpected error:",
      "network failure",
    );

    consoleSpy.mockRestore();
  });
});
