import { describe, expect, test, vi } from "vitest";
import { createSupabaseRecipeRepository } from "./supabaseRecipeRepository.js";

const userId = "11111111-1111-4111-8111-111111111111";
const seriesId = "22222222-2222-4222-8222-222222222222";
const versionId = "33333333-3333-4333-8333-333333333333";
const beanId = "44444444-4444-4444-8444-444444444444";

describe("supabaseRecipeRepository", () => {
  test("gets recipe series from three flat queries", async () => {
    const client = createClient({
      tableData: {
        recipe_series: [seriesRow()],
        recipe_versions: [versionRow()],
        recipe_version_beans: [beanRow()],
      },
    });
    const repository = createSupabaseRecipeRepository({ client });

    const series = await repository.getRecipeSeries();

    expect(series).toHaveLength(1);
    expect(series[0].currentVersionId).toBe(versionId);
    expect(series[0].versions[0].ratios[0]).toEqual({
      id: beanId,
      value: 100,
      roastLevel: "medium",
      beanSnapshot: { id: beanId, name: "Ethiopia" },
    });
    expect(client.from).toHaveBeenCalledWith("recipe_series");
    expect(client.from).toHaveBeenCalledWith("recipe_versions");
    expect(client.from).toHaveBeenCalledWith("recipe_version_beans");
    expect(client.queryCalls.recipe_series[0].order).toHaveBeenCalledWith("updated_at", { ascending: false });
    expect(client.queryCalls.recipe_versions[0].order).toHaveBeenCalledWith("version_number", { ascending: false });
    expect(client.queryCalls.recipe_version_beans[0].order).toHaveBeenCalledWith("position", { ascending: true });
  });

  test("returns an empty list without querying child tables", async () => {
    const client = createClient({ tableData: { recipe_series: [] } });
    const repository = createSupabaseRecipeRepository({ client });

    await expect(repository.getRecipeSeries()).resolves.toEqual([]);
    expect(client.from).toHaveBeenCalledTimes(1);
  });

  test("throws select and auth errors", async () => {
    await expect(
      createSupabaseRecipeRepository({
        client: createClient({ tableErrors: { recipe_series: new Error("select failed") } }),
      }).getRecipeSeries(),
    ).rejects.toThrow("select failed");

    await expect(
      createSupabaseRecipeRepository({ client: createClient({ authError: new Error("auth failed") }) }).getRecipeSeries(),
    ).rejects.toThrow("auth failed");
  });

  test("saves recipe versions through RPC and reloads latest series", async () => {
    const client = createClient({
      tableData: {
        recipe_series: [seriesRow()],
        recipe_versions: [versionRow()],
        recipe_version_beans: [beanRow()],
      },
      rpcData: [{ saved_series_id: seriesId, saved_version_id: versionId, saved_version_number: 1 }],
    });
    const repository = createSupabaseRecipeRepository({ client });

    const series = await repository.saveRecipeVersion({
      seriesId,
      seriesName: "Morning Blend",
      name: "Morning Blend",
      ratios: [{ id: beanId, value: 100, roastLevel: "medium", beanSnapshot: { id: beanId, name: "Ethiopia" } }],
    });

    expect(client.rpc).toHaveBeenCalledWith("save_recipe_version", {
      payload: expect.objectContaining({
        seriesId,
        seriesName: "Morning Blend",
        beans: [{ beanId, ratio: 100, roastLevel: "medium", beanSnapshot: { id: beanId, name: "Ethiopia" }, position: 0 }],
      }),
    });
    expect(series[0].id).toBe(seriesId);
  });

  test("throws RPC errors", async () => {
    await expect(
      createSupabaseRecipeRepository({ client: createClient({ rpcError: new Error("rpc failed") }) }).saveRecipeVersion({
        name: "Blend",
        ratios: [{ id: beanId, value: 100 }],
      }),
    ).rejects.toThrow("rpc failed");
  });

  test("passes null brew method FK to RPC while preserving brew method snapshot", async () => {
    const client = createClient({
      tableData: {
        recipe_series: [seriesRow()],
        recipe_versions: [versionRow()],
        recipe_version_beans: [beanRow()],
      },
    });

    await createSupabaseRecipeRepository({ client }).saveRecipeVersion({
      name: "Snapshot Blend",
      ratios: [{ id: beanId, value: 100 }],
      brewMethodId: null,
      brewMethodSnapshot: { id: "deleted-method-id", name: "Deleted Method" },
    });

    expect(client.rpc).toHaveBeenCalledWith("save_recipe_version", {
      payload: expect.objectContaining({
        brewMethodId: null,
        brewMethodSnapshot: { id: "deleted-method-id", name: "Deleted Method" },
      }),
    });
  });

  test("passes a resolved current brew method FK to RPC", async () => {
    const currentBrewMethodId = "77777777-7777-4777-8777-777777777777";
    const client = createClient({
      tableData: {
        recipe_series: [seriesRow()],
        recipe_versions: [versionRow()],
        recipe_version_beans: [beanRow()],
      },
    });

    await createSupabaseRecipeRepository({ client }).saveRecipeVersion({
      name: "Current Method Blend",
      ratios: [{ id: beanId, value: 100 }],
      brewMethodId: currentBrewMethodId,
      brewMethodSnapshot: { id: "deleted-method-id", name: "Deleted Method" },
    });

    expect(client.rpc).toHaveBeenCalledWith("save_recipe_version", {
      payload: expect.objectContaining({
        brewMethodId: currentBrewMethodId,
        brewMethodSnapshot: { id: "deleted-method-id", name: "Deleted Method" },
      }),
    });
  });

  test("archives and restores recipe series then reloads", async () => {
    const archiveClient = createClient({ tableData: { recipe_series: [seriesRow({ status: "archived" })] } });
    const restoreClient = createClient({ tableData: { recipe_series: [seriesRow({ status: "active" })] } });

    await createSupabaseRecipeRepository({ client: archiveClient }).archiveRecipeSeries(seriesId);
    expect(archiveClient.queryCalls.recipe_series[0].update).toHaveBeenCalledWith({ status: "archived" });
    expect(archiveClient.queryCalls.recipe_series[0].eq).toHaveBeenCalledWith("id", seriesId);

    await createSupabaseRecipeRepository({ client: restoreClient }).restoreRecipeSeries(seriesId);
    expect(restoreClient.queryCalls.recipe_series[0].update).toHaveBeenCalledWith({ status: "active" });
    expect(restoreClient.queryCalls.recipe_series[0].eq).toHaveBeenCalledWith("id", seriesId);
  });

  test("throws archive restore mutation and reload failures", async () => {
    await expect(
      createSupabaseRecipeRepository({ client: createClient({ mutationData: null }) }).archiveRecipeSeries(seriesId),
    ).rejects.toThrow("Recipe series was not found");

    await expect(
      createSupabaseRecipeRepository({ client: createClient({ mutationError: new Error("update failed") }) }).restoreRecipeSeries(seriesId),
    ).rejects.toThrow("update failed");

    await expect(
      createSupabaseRecipeRepository({
        client: createClient({
          mutationData: { id: seriesId },
          tableErrors: { recipe_series: new Error("reload failed") },
        }),
      }).archiveRecipeSeries(seriesId),
    ).rejects.toThrow("reload failed");
  });

  test("deletes recipe versions only when the series keeps another version", async () => {
    const client = createClient({
      tableData: {
        recipe_series: [seriesRow()],
        recipe_versions: [
          versionRow({ id: versionId }),
          versionRow({ id: "55555555-5555-4555-8555-555555555555", version_number: 1 }),
        ],
        recipe_version_beans: [],
      },
      deleteData: [{ id: versionId }],
    });

    await createSupabaseRecipeRepository({ client }).deleteRecipeVersion({ seriesId, versionId });

    expect(client.queryCalls.recipe_versions[0].eq).toHaveBeenCalledWith("series_id", seriesId);
    expect(client.deleteQuery.eq).toHaveBeenCalledWith("id", versionId);
  });

  test("rejects delete for missing, final, and failed version deletes", async () => {
    await expect(
      createSupabaseRecipeRepository({
        client: createClient({ tableData: { recipe_versions: [versionRow({ id: "other-version" })] } }),
      }).deleteRecipeVersion({ seriesId, versionId }),
    ).rejects.toThrow("Recipe version was not found");

    await expect(
      createSupabaseRecipeRepository({
        client: createClient({ tableData: { recipe_versions: [versionRow({ id: versionId })] } }),
      }).deleteRecipeVersion({ seriesId, versionId }),
    ).rejects.toThrow("Cannot delete the last recipe version");

    await expect(
      createSupabaseRecipeRepository({
        client: createClient({
          tableData: { recipe_versions: [versionRow({ id: versionId }), versionRow({ id: "other-version" })] },
          deleteData: [],
        }),
      }).deleteRecipeVersion({ seriesId, versionId }),
    ).rejects.toThrow("Recipe version was not found");

    await expect(
      createSupabaseRecipeRepository({
        client: createClient({
          tableData: { recipe_versions: [versionRow({ id: versionId }), versionRow({ id: "other-version" })] },
          deleteError: new Error("delete failed"),
        }),
      }).deleteRecipeVersion({ seriesId, versionId }),
    ).rejects.toThrow("delete failed");
  });
});

function createClient({
  authUser = { id: userId },
  authError = null,
  tableData = {},
  tableErrors = {},
  mutationData = { id: seriesId },
  mutationError = null,
  deleteData = [{ id: versionId }],
  deleteError = null,
  rpcData = null,
  rpcError = null,
} = {}) {
  const queries = {};
  const queryCalls = {};
  const deleteQuery = {
    eq: vi.fn(() => deleteQuery),
    select: vi.fn(async () => ({ data: deleteData, error: deleteError })),
  };

  const client = {
    auth: {
      getUser: vi.fn(async () => ({ data: { user: authUser }, error: authError })),
    },
    from: vi.fn((table) => {
      const query = createQuery({ table, tableData, tableErrors, mutationData, mutationError, deleteQuery });
      queries[table] = query;
      if (!queryCalls[table]) {
        queryCalls[table] = [];
      }
      queryCalls[table].push(query);
      return query;
    }),
    rpc: vi.fn(async () => ({ data: rpcData, error: rpcError })),
    queries,
    queryCalls,
    deleteQuery,
  };

  return client;
}

function createQuery({ table, tableData, tableErrors, mutationData, mutationError, deleteQuery }) {
  const query = {
    select: vi.fn(() => query),
    order: vi.fn(() => query),
    update: vi.fn(() => query),
    delete: vi.fn(() => deleteQuery),
    eq: vi.fn(() => query),
    single: vi.fn(async () => ({ data: mutationData, error: mutationError })),
    then(resolve) {
      return Promise.resolve({ data: tableData[table] || [], error: tableErrors[table] || null }).then(resolve);
    },
  };
  return query;
}

function seriesRow(overrides = {}) {
  return {
    id: seriesId,
    name: "Morning Blend",
    goal: "",
    status: "active",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-02T00:00:00.000Z",
    ...overrides,
  };
}

function versionRow(overrides = {}) {
  return {
    id: versionId,
    series_id: seriesId,
    version_number: 1,
    name: "Morning Blend",
    change_note: "",
    tasting_note: "",
    dose_gram: 15,
    brew_ratio: 15,
    target_brew_gram: 225,
    blend_cost: 0,
    brew_method_id: null,
    brew_method_snapshot: null,
    sensory: {},
    saved_at: "2026-01-02T00:00:00.000Z",
    created_at: "2026-01-02T00:00:00.000Z",
    updated_at: "2026-01-02T00:00:00.000Z",
    ...overrides,
  };
}

function beanRow(overrides = {}) {
  return {
    id: "66666666-6666-4666-8666-666666666666",
    recipe_version_id: versionId,
    bean_id: beanId,
    ratio: 100,
    roast_level: "medium",
    bean_snapshot: { id: beanId, name: "Ethiopia" },
    position: 0,
    created_at: "2026-01-02T00:00:00.000Z",
    updated_at: "2026-01-02T00:00:00.000Z",
    ...overrides,
  };
}
