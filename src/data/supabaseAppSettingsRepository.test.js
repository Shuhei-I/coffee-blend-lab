import { describe, expect, test, vi } from "vitest";
import { createSupabaseAppSettingsRepository, mapAppSettingsRow } from "./supabaseAppSettingsRepository.js";

const userId = "11111111-1111-4111-8111-111111111111";
const brewMethodId = "22222222-2222-4222-8222-222222222222";

describe("supabaseAppSettingsRepository", () => {
  test("maps DB rows to app settings shape", () => {
    expect(mapAppSettingsRow({ selected_brew_method_id: brewMethodId })).toEqual({
      selectedBrewMethodId: brewMethodId,
    });
    expect(mapAppSettingsRow(null)).toEqual({ selectedBrewMethodId: null });
  });

  test("gets app settings for the authenticated user", async () => {
    const client = createClient({ selectData: { selected_brew_method_id: brewMethodId } });
    const repository = createSupabaseAppSettingsRepository({ client });

    await expect(repository.getAppSettings()).resolves.toEqual({ selectedBrewMethodId: brewMethodId });
    expect(client.auth.getUser).toHaveBeenCalledTimes(1);
    expect(client.from).toHaveBeenCalledWith("app_settings");
    expect(client.query.select).toHaveBeenCalled();
    expect(client.query.maybeSingle).toHaveBeenCalled();
  });

  test("returns null settings when the row does not exist", async () => {
    const repository = createSupabaseAppSettingsRepository({ client: createClient({ selectData: null }) });

    await expect(repository.getAppSettings()).resolves.toEqual({ selectedBrewMethodId: null });
  });

  test("throws auth and DB errors while reading settings", async () => {
    await expect(
      createSupabaseAppSettingsRepository({ client: createClient({ authUser: null }) }).getAppSettings(),
    ).rejects.toThrow("User must be authenticated");

    await expect(
      createSupabaseAppSettingsRepository({ client: createClient({ selectError: new Error("select failed") }) }).getAppSettings(),
    ).rejects.toThrow("select failed");
  });

  test("upserts selected brew method with authenticated user_id", async () => {
    const client = createClient({ mutationData: { selected_brew_method_id: brewMethodId } });
    const repository = createSupabaseAppSettingsRepository({ client });

    await expect(repository.saveSelectedBrewMethodId(brewMethodId)).resolves.toEqual({
      selectedBrewMethodId: brewMethodId,
    });
    expect(client.auth.getUser).toHaveBeenCalledTimes(1);
    expect(client.query.upsert).toHaveBeenCalledWith(
      {
        user_id: userId,
        selected_brew_method_id: brewMethodId,
      },
      { onConflict: "user_id" },
    );
    expect(client.query.upsert.mock.calls[0][0].updated_at).toBeUndefined();
  });

  test("saves null selected brew method", async () => {
    const client = createClient({ mutationData: { selected_brew_method_id: null } });
    const repository = createSupabaseAppSettingsRepository({ client });

    await expect(repository.saveSelectedBrewMethodId(null)).resolves.toEqual({ selectedBrewMethodId: null });
    expect(client.query.upsert).toHaveBeenCalledWith(
      {
        user_id: userId,
        selected_brew_method_id: null,
      },
      { onConflict: "user_id" },
    );
  });

  test("throws save errors and does not accept user_id from UI", async () => {
    await expect(
      createSupabaseAppSettingsRepository({
        client: createClient({ mutationError: new Error("upsert failed") }),
      }).saveSelectedBrewMethodId(brewMethodId),
    ).rejects.toThrow("upsert failed");

    await expect(
      createSupabaseAppSettingsRepository({ client: createClient({ mutationData: null }) }).saveSelectedBrewMethodId(
        brewMethodId,
      ),
    ).rejects.toThrow("App settings were not saved");
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
