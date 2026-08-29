import { describe, expect, test, vi } from "vitest";
import {
  createSupabaseBeanRepository,
  mapBeanRowToBean,
  mapBeanToInsertPayload,
  mapBeanToUpdatePayload,
} from "./supabaseBeanRepository.js";

const userId = "11111111-1111-4111-8111-111111111111";
const beanId = "22222222-2222-4222-8222-222222222222";

describe("supabaseBeanRepository", () => {
  test("maps DB rows to existing application bean shape", () => {
    expect(mapBeanRowToBean(createRow({ id: beanId, system_key: "ethiopia" }))).toEqual({
      id: beanId,
      name: "Ethiopia",
      note: "Berry",
      color: "#b85243",
      ratio: 0,
      visibleInRecipes: true,
      costPerKg: 5800,
      roasterName: "Local Roaster",
      origin: "Ethiopia / Yirgacheffe",
      processMethod: "Natural",
      defaultRoastLevel: "浅煎り",
      roastedAt: "2026-08-01",
      purchasedAt: "2026-08-10",
      purchasePlace: "Roaster shop",
      purchaseUrl: "https://example.com/ethiopia",
      packageWeightGram: 200,
      purchasePrice: 1800,
      profile: { acidity: 86, sweetness: 78, bitterness: 32, body: 48, aroma: 92 },
    });
  });

  test("maps application beans to insert payload without accepting user system_key", () => {
    const payload = mapBeanToInsertPayload({ ...appBean(), systemKey: "must-not-send" }, userId);

    expect(payload).toMatchObject({
      id: beanId,
      user_id: userId,
      system_key: null,
      cost_per_kg: 5800,
      visible_in_recipes: true,
      acidity: 86,
      roaster_name: "Local Roaster",
      origin: "Ethiopia / Yirgacheffe",
      default_roast_level: "浅煎り",
      purchase_url: "https://example.com/ethiopia",
      package_weight_gram: 200,
      purchase_price: 1800,
    });
    expect(payload.systemKey).toBeUndefined();
  });

  test("maps update payload without user_id or system_key", () => {
    const payload = mapBeanToUpdatePayload({ ...appBean(), systemKey: "ethiopia" });

    expect(payload).toMatchObject({ name: "Ethiopia", cost_per_kg: 5800 });
    expect(payload.user_id).toBeUndefined();
    expect(payload.system_key).toBeUndefined();
    expect(payload.systemKey).toBeUndefined();
  });

  test("gets beans sorted by default system key order", async () => {
    const rows = [
      createRow({ id: "33333333-3333-4333-8333-333333333333", system_key: "brazil", name: "Brazil" }),
      createRow({ id: "22222222-2222-4222-8222-222222222222", system_key: "ethiopia", name: "Ethiopia" }),
      createRow({ id: "44444444-4444-4444-8444-444444444444", system_key: null, name: "User Bean" }),
    ];
    const client = createClient({ selectData: rows });
    const repository = createSupabaseBeanRepository({ client });

    const beans = await repository.getBeans();

    expect(beans.map((bean) => bean.name)).toEqual(["Ethiopia", "Brazil", "User Bean"]);
    expect(client.from).toHaveBeenCalledWith("beans");
    expect(client.query.select).toHaveBeenCalled();
    expect(client.query.order).toHaveBeenCalledWith("created_at", { ascending: true });
    expect(client.query.order).toHaveBeenCalledWith("id", { ascending: true });
  });

  test("throws getBeans errors without local fallback", async () => {
    const repository = createSupabaseBeanRepository({ client: createClient({ selectError: new Error("select failed") }) });

    await expect(repository.getBeans()).rejects.toThrow("select failed");
  });

  test("creates beans with authenticated user_id and returns saved row", async () => {
    const client = createClient({ mutationData: createRow({ id: beanId }) });
    const repository = createSupabaseBeanRepository({ client });

    const saved = await repository.createBean(appBean());

    expect(client.auth.getUser).toHaveBeenCalledTimes(1);
    expect(client.query.insert).toHaveBeenCalledWith(expect.objectContaining({ id: beanId, user_id: userId }));
    expect(saved.id).toBe(beanId);
  });

  test("throws create errors and missing auth user", async () => {
    await expect(
      createSupabaseBeanRepository({ client: createClient({ mutationError: new Error("insert failed") }) }).createBean(
        appBean(),
      ),
    ).rejects.toThrow("insert failed");

    await expect(
      createSupabaseBeanRepository({ client: createClient({ authUser: null }) }).createBean(appBean()),
    ).rejects.toThrow("User must be authenticated");
  });

  test("updates by id and returns saved row", async () => {
    const client = createClient({ mutationData: createRow({ id: beanId, name: "Updated" }) });
    const repository = createSupabaseBeanRepository({ client });

    const saved = await repository.updateBean({ ...appBean(), name: "Updated" });

    expect(client.query.update).toHaveBeenCalledWith(expect.not.objectContaining({ user_id: expect.anything() }));
    expect(client.query.update).toHaveBeenCalledWith(expect.not.objectContaining({ system_key: expect.anything() }));
    expect(client.query.eq).toHaveBeenCalledWith("id", beanId);
    expect(saved.name).toBe("Updated");
  });

  test("throws update missing row and errors", async () => {
    await expect(
      createSupabaseBeanRepository({ client: createClient({ mutationData: null }) }).updateBean(appBean()),
    ).rejects.toThrow("Bean was not found");

    await expect(
      createSupabaseBeanRepository({ client: createClient({ mutationError: new Error("update failed") }) }).updateBean(
        appBean(),
      ),
    ).rejects.toThrow("update failed");
  });

  test("deletes by id and reports missing rows", async () => {
    const client = createClient({ deleteData: [{ id: beanId }] });
    const repository = createSupabaseBeanRepository({ client });

    await expect(repository.deleteBean(beanId)).resolves.toEqual({ id: beanId });
    expect(client.query.delete).toHaveBeenCalledTimes(1);
    expect(client.deleteQuery.eq).toHaveBeenCalledWith("id", beanId);

    await expect(
      createSupabaseBeanRepository({ client: createClient({ deleteData: [] }) }).deleteBean(beanId),
    ).rejects.toThrow("Bean was not found");

    await expect(
      createSupabaseBeanRepository({ client: createClient({ deleteError: new Error("delete failed") }) }).deleteBean(
        beanId,
      ),
    ).rejects.toThrow("delete failed");
  });
});

function appBean() {
  return {
    id: beanId,
    name: "Ethiopia",
    note: "Berry",
    color: "#b85243",
    ratio: 0,
    visibleInRecipes: true,
    costPerKg: 5800,
    roasterName: "Local Roaster",
    origin: "Ethiopia / Yirgacheffe",
    processMethod: "Natural",
    defaultRoastLevel: "浅煎り",
    roastedAt: "2026-08-01",
    purchasedAt: "2026-08-10",
    purchasePlace: "Roaster shop",
    purchaseUrl: "https://example.com/ethiopia",
    packageWeightGram: 200,
    purchasePrice: 1800,
    profile: { acidity: 86, sweetness: 78, bitterness: 32, body: 48, aroma: 92 },
  };
}

function createRow(overrides = {}) {
  return {
    id: beanId,
    system_key: null,
    name: "Ethiopia",
    note: "Berry",
    color: "#b85243",
    ratio: 0,
    visible_in_recipes: true,
    cost_per_kg: 5800,
    roaster_name: "Local Roaster",
    origin: "Ethiopia / Yirgacheffe",
    process_method: "Natural",
    default_roast_level: "浅煎り",
    roasted_at: "2026-08-01",
    purchased_at: "2026-08-10",
    purchase_place: "Roaster shop",
    purchase_url: "https://example.com/ethiopia",
    package_weight_gram: 200,
    purchase_price: 1800,
    acidity: 86,
    sweetness: 78,
    bitterness: 32,
    body: 48,
    aroma: 92,
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
  deleteData = [{ id: beanId }],
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
