import { describe, expect, test, vi } from "vitest";
import {
  createSupabaseProfileRepository,
  mapProfileRow,
  mapProfileToPayload,
  normalizeUsername,
  validateProfileInput,
} from "./supabaseProfileRepository.js";

const userId = "11111111-1111-4111-8111-111111111111";

describe("supabaseProfileRepository", () => {
  test("maps DB rows to profile shape", () => {
    expect(
      mapProfileRow({
        user_id: userId,
        username: "shuhey",
        display_name: "Shuhey",
        bio: "Coffee notes",
        avatar_path: "avatars/user.png",
        created_at: "2026-08-15T00:00:00Z",
        updated_at: "2026-08-15T00:00:00Z",
      }),
    ).toEqual({
      userId,
      username: "shuhey",
      displayName: "Shuhey",
      bio: "Coffee notes",
      avatarPath: "avatars/user.png",
      createdAt: "2026-08-15T00:00:00Z",
      updatedAt: "2026-08-15T00:00:00Z",
    });
  });

  test("normalizes and validates username input", () => {
    expect(normalizeUsername(" Shuhey_Inoue ")).toBe("shuhey_inoue");
    expect(validateProfileInput({ username: "shuhey_123" })).toEqual({ valid: true, reason: "" });
    expect(validateProfileInput({ username: "sh" }).valid).toBe(false);
    expect(validateProfileInput({ username: "shuhey-inoue" }).valid).toBe(false);
    expect(validateProfileInput({ username: "a".repeat(21) }).valid).toBe(false);
    expect(validateProfileInput({ username: "shuhey", displayName: "a".repeat(61) }).valid).toBe(false);
    expect(validateProfileInput({ username: "shuhey", bio: "a".repeat(161) }).valid).toBe(false);
  });

  test("maps profile input to an authenticated payload", () => {
    expect(
      mapProfileToPayload(
        {
          username: " Shuhey ",
          displayName: " Shuhey Inoue ",
          bio: " Blend notes ",
          avatarPath: "",
        },
        userId,
      ),
    ).toEqual({
      user_id: userId,
      username: "shuhey",
      display_name: "Shuhey Inoue",
      bio: "Blend notes",
      avatar_path: null,
    });
  });

  test("gets the authenticated user's profile", async () => {
    const client = createClient({
      selectData: {
        user_id: userId,
        username: "shuhey",
        display_name: "Shuhey",
        bio: "",
        avatar_path: null,
      },
    });
    const repository = createSupabaseProfileRepository({ client });

    await expect(repository.getOwnProfile()).resolves.toMatchObject({
      userId,
      username: "shuhey",
      displayName: "Shuhey",
    });
    expect(client.auth.getUser).toHaveBeenCalledTimes(1);
    expect(client.from).toHaveBeenCalledWith("profiles");
    expect(client.query.select).toHaveBeenCalled();
    expect(client.query.maybeSingle).toHaveBeenCalled();
  });

  test("returns null when the profile does not exist", async () => {
    const repository = createSupabaseProfileRepository({ client: createClient({ selectData: null }) });

    await expect(repository.getOwnProfile()).resolves.toBeNull();
  });

  test("upserts the authenticated user's profile", async () => {
    const client = createClient({
      mutationData: {
        user_id: userId,
        username: "shuhey",
        display_name: "Shuhey",
        bio: "Blend notes",
        avatar_path: null,
      },
    });
    const repository = createSupabaseProfileRepository({ client });

    await expect(
      repository.saveOwnProfile({
        username: "Shuhey",
        displayName: "Shuhey",
        bio: "Blend notes",
      }),
    ).resolves.toMatchObject({
      userId,
      username: "shuhey",
      displayName: "Shuhey",
      bio: "Blend notes",
    });
    expect(client.query.upsert).toHaveBeenCalledWith(
      {
        user_id: userId,
        username: "shuhey",
        display_name: "Shuhey",
        bio: "Blend notes",
        avatar_path: null,
      },
      { onConflict: "user_id" },
    );
  });

  test("throws auth, validation, and DB errors", async () => {
    await expect(
      createSupabaseProfileRepository({ client: createClient({ authUser: null }) }).getOwnProfile(),
    ).rejects.toThrow("User must be authenticated");

    await expect(
      createSupabaseProfileRepository({ client: createClient({ selectError: new Error("select failed") }) }).getOwnProfile(),
    ).rejects.toThrow("select failed");

    await expect(
      createSupabaseProfileRepository({ client: createClient() }).saveOwnProfile({ username: "no" }),
    ).rejects.toThrow("Username must be 3-20 lowercase letters, numbers, or underscores.");

    await expect(
      createSupabaseProfileRepository({ client: createClient({ mutationError: new Error("upsert failed") }) }).saveOwnProfile({
        username: "shuhey",
      }),
    ).rejects.toThrow("upsert failed");

    await expect(
      createSupabaseProfileRepository({ client: createClient({ mutationData: null }) }).saveOwnProfile({ username: "shuhey" }),
    ).rejects.toThrow("Profile was not saved");
  });
});

function createClient({
  authUser = { id: userId },
  selectData = null,
  selectError = null,
  mutationData = null,
  mutationError = null,
} = {}) {
  const query = {
    select: vi.fn(() => query),
    maybeSingle: vi.fn(async () => ({ data: selectData, error: selectError })),
    upsert: vi.fn(() => query),
    single: vi.fn(async () => ({ data: mutationData, error: mutationError })),
  };

  return {
    auth: {
      getUser: vi.fn(async () => ({ data: { user: authUser }, error: null })),
    },
    from: vi.fn(() => query),
    query,
  };
}
