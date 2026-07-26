import { describe, expect, test, vi } from "vitest";
import { API_BASE_URL, buildApiUrl, getJson, putJson } from "./apiClient.js";

describe("api client", () => {
  test("gets JSON from the API base URL", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ beans: [] }),
    }));

    await expect(getJson("/api/state", { fetchImpl })).resolves.toEqual({ beans: [] });
    expect(fetchImpl).toHaveBeenCalledWith(`${API_BASE_URL}/api/state`);
  });

  test("puts JSON to the API base URL", async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true }));
    const body = { beans: [{ id: "ethiopia" }] };

    await expect(putJson("/api/beans", body, { fetchImpl })).resolves.toBeUndefined();
    expect(fetchImpl).toHaveBeenCalledWith(`${API_BASE_URL}/api/beans`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  });

  test("throws on non-2xx responses", async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 500 }));

    await expect(getJson("/api/state", { fetchImpl })).rejects.toThrow("Request failed: 500");
    await expect(putJson("/api/beans", {}, { fetchImpl })).rejects.toThrow("Request failed: 500");
  });

  test("propagates invalid JSON errors", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => {
        throw new SyntaxError("bad json");
      },
    }));

    await expect(getJson("/api/state", { fetchImpl })).rejects.toThrow(SyntaxError);
  });

  test("propagates network errors", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("network down");
    });

    await expect(getJson("/api/state", { fetchImpl })).rejects.toThrow("network down");
    await expect(putJson("/api/beans", {}, { fetchImpl })).rejects.toThrow("network down");
  });

  test("builds URLs from a custom API base URL", () => {
    expect(buildApiUrl("/api/state", "http://localhost:9999")).toBe("http://localhost:9999/api/state");
  });
});
