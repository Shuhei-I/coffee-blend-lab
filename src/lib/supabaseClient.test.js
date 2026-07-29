import { afterEach, describe, expect, test, vi } from "vitest";

const SUPABASE_URL = "https://example-project.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "publishable-key";

afterEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
});

describe("supabase client", () => {
  test("creates a client when required environment variables are present", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", SUPABASE_URL);
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", SUPABASE_PUBLISHABLE_KEY);

    const { createSupabaseClient, supabase } = await import("./supabaseClient.js");
    const createClientImpl = vi.fn(() => ({ from: vi.fn() }));

    expect(supabase).toBeTruthy();
    expect(typeof supabase.from).toBe("function");
    expect(createSupabaseClient(import.meta.env, createClientImpl)).toEqual({ from: expect.any(Function) });
    expect(createClientImpl).toHaveBeenCalledWith(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  });

  test("throws a clear error when VITE_SUPABASE_URL is missing", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", SUPABASE_PUBLISHABLE_KEY);

    await expect(import("./supabaseClient.js")).rejects.toThrow(
      "Missing required environment variable: VITE_SUPABASE_URL",
    );
  });

  test("throws a clear error when VITE_SUPABASE_PUBLISHABLE_KEY is missing", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", SUPABASE_URL);
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "");

    await expect(import("./supabaseClient.js")).rejects.toThrow(
      "Missing required environment variable: VITE_SUPABASE_PUBLISHABLE_KEY",
    );
  });

  test("does not read secret-style Supabase or database environment variables", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", SUPABASE_URL);
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", SUPABASE_PUBLISHABLE_KEY);
    vi.stubEnv("SUPABASE_SECRET", "must-not-be-used");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "must-not-be-used");
    vi.stubEnv("DATABASE_PASSWORD", "must-not-be-used");

    const { getSupabaseConfig } = await import("./supabaseClient.js");

    expect(getSupabaseConfig(import.meta.env)).toEqual({
      url: SUPABASE_URL,
      publishableKey: SUPABASE_PUBLISHABLE_KEY,
    });
  });
});
