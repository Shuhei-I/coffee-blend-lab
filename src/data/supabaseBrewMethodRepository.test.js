import { describe, expect, test, vi } from "vitest";
import {
  createSupabaseBrewMethodRepository,
  mapBrewMethodRowToBrewMethod,
  mapBrewMethodToInsertPayload,
  mapBrewMethodToUpdatePayload,
  resolveSelectedBrewMethodId,
} from "./supabaseBrewMethodRepository.js";

const userId = "11111111-1111-4111-8111-111111111111";
const methodId = "22222222-2222-4222-8222-222222222222";

describe("supabaseBrewMethodRepository", () => {
  test("maps DB rows to existing application brew method shape", () => {
    const method = mapBrewMethodRowToBrewMethod(createRow({ system_key: "standard-4-pour" }));

    expect(method).toEqual({
      id: methodId,
      name: "Standard",
      note: "Balanced",
      bloomPercent: 12,
      pour1Percent: 28,
      pour2Percent: 30,
      pour3Percent: 30,
      bloomSeconds: 30,
    });
    expect(method.systemKey).toBe("standard-4-pour");
    expect(JSON.stringify(method)).not.toContain("systemKey");
  });

  test("maps application methods to insert payload without accepting user system_key", () => {
    const payload = mapBrewMethodToInsertPayload({ ...appMethod(), systemKey: "must-not-send" }, userId);

    expect(payload).toMatchObject({
      id: methodId,
      user_id: userId,
      system_key: null,
      bloom_percent: 12,
      pour1_percent: 28,
      bloom_seconds: 30,
    });
    expect(payload.systemKey).toBeUndefined();
  });

  test("maps update payload without user_id or system_key", () => {
    const payload = mapBrewMethodToUpdatePayload({ ...appMethod(), systemKey: "standard-4-pour" });

    expect(payload).toMatchObject({ name: "Standard", bloom_percent: 12 });
    expect(payload.user_id).toBeUndefined();
    expect(payload.system_key).toBeUndefined();
    expect(payload.systemKey).toBeUndefined();
  });

  test("gets brew methods sorted by default system key order", async () => {
    const rows = [
      createRow({ id: "33333333-3333-4333-8333-333333333333", system_key: "sweet-forward", name: "Sweet" }),
      createRow({ id: "22222222-2222-4222-8222-222222222222", system_key: "standard-4-pour", name: "Standard" }),
      createRow({ id: "44444444-4444-4444-8444-444444444444", system_key: null, name: "User Method" }),
    ];
    const client = createClient({ selectData: rows });
    const repository = createSupabaseBrewMethodRepository({ client });

    const methods = await repository.getBrewMethods();

    expect(methods.map((method) => method.name)).toEqual(["Standard", "Sweet", "User Method"]);
    expect(client.from).toHaveBeenCalledWith("brew_methods");
    expect(client.query.order).toHaveBeenCalledWith("created_at", { ascending: true });
    expect(client.query.order).toHaveBeenCalledWith("id", { ascending: true });
  });

  test("throws getBrewMethods errors without local fallback", async () => {
    const repository = createSupabaseBrewMethodRepository({
      client: createClient({ selectError: new Error("select failed") }),
    });

    await expect(repository.getBrewMethods()).rejects.toThrow("select failed");
  });

  test("creates brew methods with authenticated user_id and returns saved row", async () => {
    const client = createClient({ mutationData: createRow({ id: methodId }) });
    const repository = createSupabaseBrewMethodRepository({ client });

    const saved = await repository.createBrewMethod(appMethod());

    expect(client.auth.getUser).toHaveBeenCalledTimes(1);
    expect(client.query.insert).toHaveBeenCalledWith(expect.objectContaining({ id: methodId, user_id: userId }));
    expect(saved.id).toBe(methodId);
  });

  test("throws create errors and missing auth user", async () => {
    await expect(
      createSupabaseBrewMethodRepository({
        client: createClient({ mutationError: new Error("insert failed") }),
      }).createBrewMethod(appMethod()),
    ).rejects.toThrow("insert failed");

    await expect(
      createSupabaseBrewMethodRepository({ client: createClient({ authUser: null }) }).createBrewMethod(appMethod()),
    ).rejects.toThrow("User must be authenticated");
  });

  test("updates by id and returns saved row", async () => {
    const client = createClient({ mutationData: createRow({ id: methodId, name: "Updated" }) });
    const repository = createSupabaseBrewMethodRepository({ client });

    const saved = await repository.updateBrewMethod({ ...appMethod(), name: "Updated" });

    expect(client.query.update).toHaveBeenCalledWith(expect.not.objectContaining({ user_id: expect.anything() }));
    expect(client.query.update).toHaveBeenCalledWith(expect.not.objectContaining({ system_key: expect.anything() }));
    expect(client.query.eq).toHaveBeenCalledWith("id", methodId);
    expect(saved.name).toBe("Updated");
  });

  test("throws update missing row and errors", async () => {
    await expect(
      createSupabaseBrewMethodRepository({ client: createClient({ mutationData: null }) }).updateBrewMethod(appMethod()),
    ).rejects.toThrow("Brew method was not found");

    await expect(
      createSupabaseBrewMethodRepository({
        client: createClient({ mutationError: new Error("update failed") }),
      }).updateBrewMethod(appMethod()),
    ).rejects.toThrow("update failed");
  });

  test("deletes by id and reports missing rows", async () => {
    const client = createClient({ deleteData: [{ id: methodId }] });
    const repository = createSupabaseBrewMethodRepository({ client });

    await expect(repository.deleteBrewMethod(methodId)).resolves.toEqual({ id: methodId });
    expect(client.query.delete).toHaveBeenCalledTimes(1);
    expect(client.deleteQuery.eq).toHaveBeenCalledWith("id", methodId);

    await expect(
      createSupabaseBrewMethodRepository({ client: createClient({ deleteData: [] }) }).deleteBrewMethod(methodId),
    ).rejects.toThrow("Brew method was not found");

    await expect(
      createSupabaseBrewMethodRepository({
        client: createClient({ deleteError: new Error("delete failed") }),
      }).deleteBrewMethod(methodId),
    ).rejects.toThrow("delete failed");
  });

  test("resolves legacy selected IDs through system_key", () => {
    const standard = mapBrewMethodRowToBrewMethod(
      createRow({ id: "22222222-2222-4222-8222-222222222222", system_key: "standard-4-pour" }),
    );
    const sweet = mapBrewMethodRowToBrewMethod(
      createRow({ id: "33333333-3333-4333-8333-333333333333", system_key: "sweet-forward" }),
    );

    expect(resolveSelectedBrewMethodId({ brewMethods: [standard, sweet], selectedBrewMethodId: sweet.id })).toBe(sweet.id);
    expect(resolveSelectedBrewMethodId({ brewMethods: [standard, sweet], selectedBrewMethodId: "sweet-forward" })).toBe(
      sweet.id,
    );
    expect(resolveSelectedBrewMethodId({ brewMethods: [standard, sweet], selectedBrewMethodId: "missing" })).toBe(
      standard.id,
    );
    expect(resolveSelectedBrewMethodId({ brewMethods: [], selectedBrewMethodId: "missing" })).toBe("missing");
  });
});

function appMethod() {
  return {
    id: methodId,
    name: "Standard",
    note: "Balanced",
    bloomPercent: 12,
    pour1Percent: 28,
    pour2Percent: 30,
    pour3Percent: 30,
    bloomSeconds: 30,
  };
}

function createRow(overrides = {}) {
  return {
    id: methodId,
    system_key: null,
    name: "Standard",
    note: "Balanced",
    bloom_percent: 12,
    pour1_percent: 28,
    pour2_percent: 30,
    pour3_percent: 30,
    bloom_seconds: 30,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function createClient({
  authUser = { id: userId },
  selectData = [],
  selectError = null,
  mutationData = null,
  mutationError = null,
  deleteData = [{ id: methodId }],
  deleteError = null,
} = {}) {
  const query = {
    select: vi.fn(() => query),
    order: vi.fn(() => query),
    insert: vi.fn(() => query),
    update: vi.fn(() => query),
    delete: vi.fn(() => query),
    eq: vi.fn(() => query),
    single: vi.fn(async () => ({ data: mutationData, error: mutationError })),
    then(resolve) {
      return Promise.resolve({ data: selectData, error: selectError }).then(resolve);
    },
  };
  const deleteQuery = {
    eq: vi.fn(() => deleteQuery),
    select: vi.fn(async () => ({ data: deleteData, error: deleteError })),
  };
  const client = {
    auth: {
      getUser: vi.fn(async () => ({ data: { user: authUser }, error: null })),
    },
    from: vi.fn(() => query),
    query,
    deleteQuery,
  };
  query.delete.mockImplementation(() => deleteQuery);
  return client;
}
