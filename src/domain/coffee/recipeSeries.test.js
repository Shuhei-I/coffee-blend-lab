import { describe, expect, test } from "vitest";
import {
  archiveRecipeSeriesData,
  createRecipeVersionData,
  createSavedRecipeBrewMethod,
  deleteRecipeVersionData,
  flattenRecipeSeries,
  getLatestVersion,
  getNextSeriesVersion,
  getRecipeBean,
  getRecipeBrewMethod,
  getRecipeBrewMethodId,
  normalizeLegacyRecipes,
  normalizeRecipeSeries,
  resolvePersistedBrewMethodId,
  restoreRecipeSeriesData,
  saveRecipeData,
  saveRecipeVersion,
  snapshotBean,
  snapshotBrewMethod,
  sortVersions,
  validateRecipeSaveInput,
} from "./recipeSeries.js";
import {
  currentRecipeSeriesFixture,
  fixtureBeans,
  fixtureBrewMethod,
  legacyRecipeFixture,
} from "./recipeSeries.fixtures.js";

describe("recipe series compatibility", () => {
  test("loads legacy localStorage recipes as current RecipeSeries", () => {
    expect(normalizeRecipeSeries([], [legacyRecipeFixture])).toEqual([
      {
        id: "series-recipe-1700000000000",
        name: "Morning Blend",
        goal: "",
        status: "active",
        currentVersionId: "recipe-1700000000000",
        createdAt: "2026-05-17T09:00:00.000Z",
        updatedAt: "2026-05-17T09:00:00.000Z",
        versions: [
          {
            ...legacyRecipeFixture,
            seriesId: "series-recipe-1700000000000",
            version: 1,
            changeNote: "既存レシピから移行",
          },
        ],
      },
    ]);
  });

  test("loads current RecipeSeries and preserves unknown fields", () => {
    const input = [{ ...currentRecipeSeriesFixture, unknownField: "keep-me" }];
    const [series] = normalizeRecipeSeries(input, [legacyRecipeFixture]);

    expect(series.unknownField).toBe("keep-me");
    expect(series.status).toBe("active");
    expect(series.versions.map((version) => version.version)).toEqual([2, 1]);
    expect(series.versions[0].seriesId).toBe("series-1700000000000");
  });

  test("normalizes a single-version RecipeSeries", () => {
    const [series] = normalizeRecipeSeries([{ ...currentRecipeSeriesFixture, versions: [currentRecipeSeriesFixture.versions[1]] }]);

    expect(series.versions).toHaveLength(1);
    expect(series.versions[0].version).toBe(1);
  });

  test("sorts multiple versions descending and falls back missing version numbers to 1", () => {
    const [series] = normalizeRecipeSeries([
      {
        ...currentRecipeSeriesFixture,
        versions: [
          { id: "recipe-missing", name: "Missing", ratios: [], savedAt: "2026-05-19T09:00:00.000Z" },
          { ...currentRecipeSeriesFixture.versions[0], version: 3 },
          { ...currentRecipeSeriesFixture.versions[1], version: 2 },
        ],
      },
    ]);

    expect(series.versions.map((version) => [version.id, version.version])).toEqual([
      ["recipe-1700000001000", 3],
      ["recipe-1700000000000", 2],
      ["recipe-missing", 1],
    ]);
  });

  test("keeps missing bean and brew method snapshots as existing data represents them", () => {
    const recipe = {
      ...legacyRecipeFixture,
      ratios: [{ id: "ethiopia", value: 100 }],
      brewMethodSnapshot: null,
    };
    const [series] = normalizeRecipeSeries([], [recipe]);

    expect(series.versions[0].ratios[0].beanSnapshot).toBeUndefined();
    expect(series.versions[0].brewMethodSnapshot).toBeNull();
    expect(getRecipeBean(series.versions[0].ratios[0], fixtureBeans)).toEqual(fixtureBeans[0]);
    expect(getRecipeBrewMethod(series.versions[0], [fixtureBrewMethod])).toEqual(fixtureBrewMethod);
  });

  test("applies existing fallbacks for missing optional fields", () => {
    const [series] = normalizeLegacyRecipes([{ id: "recipe-minimal", ratios: [], savedAt: "2026-05-20T09:00:00.000Z" }]);

    expect(series).toMatchObject({
      id: "series-recipe-minimal",
      name: "無題のシリーズ",
      goal: "",
      status: "active",
      currentVersionId: "recipe-minimal",
      createdAt: "2026-05-20T09:00:00.000Z",
      updatedAt: "2026-05-20T09:00:00.000Z",
    });
    expect(series.versions[0]).toMatchObject({
      id: "recipe-minimal",
      seriesId: "series-recipe-minimal",
      version: 1,
      changeNote: "既存レシピから移行",
    });
  });

  test("preserves empty, null, undefined, and partially invalid inputs", () => {
    expect(normalizeRecipeSeries([], [])).toEqual([]);
    expect(normalizeRecipeSeries(null, null)).toEqual([]);
    expect(normalizeRecipeSeries(undefined, undefined)).toEqual([]);
    expect(() => normalizeRecipeSeries([{ id: "series-invalid", versions: "bad" }])).toThrow(TypeError);
  });

  test("flattens RecipeSeries without changing saved legacy JSON shape", () => {
    expect(flattenRecipeSeries([currentRecipeSeriesFixture])).toEqual(
      currentRecipeSeriesFixture.versions.map((version) => ({ ...version, seriesName: "Morning Blend" })),
    );
  });

  test("calculates next version and latest version using existing ordering rules", () => {
    expect(getNextSeriesVersion(currentRecipeSeriesFixture)).toBe(3);
    expect(getNextSeriesVersion({ versions: [{ version: undefined }, { version: "bad" }] })).toBe(1);
    expect(getLatestVersion(currentRecipeSeriesFixture).id).toBe("recipe-1700000001000");
    expect(sortVersions([{ version: 1 }, { version: 3 }, { version: 2 }]).map((version) => version.version)).toEqual([3, 2, 1]);
  });

  test("creates deterministic recipe versions when time and id are injected", () => {
    const result = createRecipeVersionData({
      recipeSeries: [],
      editingRecipeSource: null,
      blendName: "  Test Blend  ",
      changeNote: "",
      blendBeans: fixtureBeans,
      doseGram: 20,
      brewRatio: 16,
      grindSize: "medium_fine",
      brewTemperatureC: 92,
      targetBrewGram: 320,
      blendCost: 98.4,
      selectedBrewMethod: fixtureBrewMethod,
      sensory: { fragrance: 8, flavor: 8, aftertaste: 7, balance: 8 },
      memo: "  memo  ",
      now: "2026-05-21T09:00:00.000Z",
      seriesIdSeed: 1800000000000,
      versionIdSeed: 1800000000001,
    });

    expect(result.currentSeries).toBeUndefined();
    expect(result.recipe).toEqual({
      seriesId: "series-1800000000000",
      id: "recipe-1800000000001",
      name: "Test Blend",
      goal: "",
      version: 1,
      changeNote: "初回作成",
      ratios: [
        { id: "ethiopia", value: 60, roastLevel: "", beanSnapshot: snapshotBean(fixtureBeans[0]) },
        { id: "brazil", value: 40, roastLevel: "", beanSnapshot: snapshotBean(fixtureBeans[1]) },
      ],
      doseGram: 20,
      brewRatio: 16,
      grindSize: "medium_fine",
      brewTemperatureC: 92,
      targetBrewGram: 320,
      blendCost: 98.4,
      brewMethodId: "standard-4-pour",
      brewMethodSnapshot: fixtureBrewMethod,
      sensory: { fragrance: 8, flavor: 8, aftertaste: 7, balance: 8 },
      memo: "memo",
      savedAt: "2026-05-21T09:00:00.000Z",
    });
  });

  test("omits zero percent beans from saved recipe ratios", () => {
    const { recipe } = createRecipeVersionData({
      recipeSeries: [],
      editingRecipeSource: null,
      blendName: "Zero Bean Blend",
      changeNote: "",
      blendBeans: [
        { ...fixtureBeans[0], ratio: 100 },
        { ...fixtureBeans[1], ratio: 0 },
      ],
      doseGram: 20,
      brewRatio: 16,
      targetBrewGram: 320,
      blendCost: 98.4,
      selectedBrewMethod: fixtureBrewMethod,
      sensory: { fragrance: 8, flavor: 8, aftertaste: 7, balance: 8 },
      memo: "",
      now: "2026-05-21T09:00:00.000Z",
      seriesIdSeed: 1800000000000,
      versionIdSeed: 1800000000001,
    });

    expect(recipe.ratios).toEqual([
      { id: "ethiopia", value: 100, roastLevel: "", beanSnapshot: snapshotBean({ ...fixtureBeans[0], ratio: 100 }) },
    ]);
  });

  test("validates recipe save inputs before persistence", () => {
    expect(validateRecipeSaveInput({ blendBeans: fixtureBeans, total: 100, doseGram: 20, brewRatio: 16 })).toEqual({
      valid: true,
      reason: "",
    });
    expect(
      validateRecipeSaveInput({
        blendBeans: fixtureBeans.map((bean) => ({ ...bean, ratio: 0 })),
        total: 0,
        doseGram: 20,
        brewRatio: 16,
      }),
    ).toEqual({
      valid: false,
      reason: "豆比率の合計を100%にしてください。",
    });
    expect(validateRecipeSaveInput({ blendBeans: fixtureBeans, total: 95, doseGram: 20, brewRatio: 16 })).toEqual({
      valid: false,
      reason: "豆比率の合計を100%にしてください。",
    });
    expect(validateRecipeSaveInput({ blendBeans: fixtureBeans, total: 100, doseGram: 0, brewRatio: 16 })).toEqual({
      valid: false,
      reason: "粉量と抽出比率は1以上にしてください。",
    });
    expect(validateRecipeSaveInput({ blendBeans: fixtureBeans, total: 100, doseGram: 20, brewRatio: 0 })).toEqual({
      valid: false,
      reason: "粉量と抽出比率は1以上にしてください。",
    });
  });

  test("creates a new version for an existing series with unchanged version rules", () => {
    const { recipe, currentSeries } = createRecipeVersionData({
      recipeSeries: [currentRecipeSeriesFixture],
      editingRecipeSource: { seriesId: "series-1700000000000", versionId: "recipe-1700000001000" },
      blendName: "",
      changeNote: " next ",
      blendBeans: fixtureBeans,
      doseGram: 22,
      brewRatio: 15,
      targetBrewGram: 330,
      blendCost: 102.3,
      selectedBrewMethod: { ...fixtureBrewMethod, id: "saved-brew-x", sourceBrewMethodId: "standard-4-pour", displayName: "保存時" },
      sensory: { fragrance: 7, flavor: 7, aftertaste: 7, balance: 7 },
      memo: "",
      now: "2026-05-22T09:00:00.000Z",
      idSeed: 1800000000001,
    });

    expect(currentSeries).toBe(currentRecipeSeriesFixture);
    expect(recipe.version).toBe(3);
    expect(recipe.name).toBe("Morning Blend");
    expect(recipe.changeNote).toBe("next");
    expect(recipe.brewMethodId).toBe("standard-4-pour");
    expect(recipe.brewMethodSnapshot.id).toBe("standard-4-pour");
  });

  test("stores roast level on recipe ratio data without changing bean snapshots", () => {
    const { recipe } = createRecipeVersionData({
      recipeSeries: [],
      editingRecipeSource: null,
      blendName: "Roast Blend",
      changeNote: "",
      blendBeans: [
        { ...fixtureBeans[0], roastLevel: "full-city" },
        { ...fixtureBeans[1], roastLevel: "medium" },
      ],
      doseGram: 20,
      brewRatio: 16,
      targetBrewGram: 320,
      blendCost: 98.4,
      selectedBrewMethod: fixtureBrewMethod,
      sensory: legacyRecipeFixture.sensory,
      memo: "",
      now: "2026-05-22T10:00:00.000Z",
      seriesIdSeed: 1800000000100,
      versionIdSeed: 1800000000101,
    });

    expect(recipe.ratios).toEqual([
      { id: "ethiopia", value: 60, roastLevel: "full-city", beanSnapshot: snapshotBean(fixtureBeans[0]) },
      { id: "brazil", value: 40, roastLevel: "medium", beanSnapshot: snapshotBean(fixtureBeans[1]) },
    ]);
  });

  test("retains the snapshot-only marker when saving a recipe with a deleted bean", () => {
    const { recipe } = createRecipeVersionData({
      recipeSeries: [],
      editingRecipeSource: null,
      blendName: "Snapshot Blend",
      changeNote: "",
      blendBeans: [{ ...fixtureBeans[0], ratio: 100, isSnapshotOnly: true }],
      doseGram: 20,
      brewRatio: 16,
      targetBrewGram: 320,
      blendCost: 0,
      selectedBrewMethod: null,
      sensory: legacyRecipeFixture.sensory,
      memo: "",
      now: "2026-05-22T10:30:00.000Z",
      seriesIdSeed: 1800000000150,
      versionIdSeed: 1800000000151,
    });

    expect(recipe.ratios[0]).toMatchObject({ id: "ethiopia", value: 100, isSnapshotOnly: true });
  });

  test("can persist a recipe without a brew method FK while keeping the brew method snapshot", () => {
    const deletedSnapshotMethod = {
      ...fixtureBrewMethod,
      id: "saved-brew-version-1",
      sourceBrewMethodId: "deleted-method-id",
      displayName: "保存時",
    };

    const { recipe } = createRecipeVersionData({
      recipeSeries: [currentRecipeSeriesFixture],
      editingRecipeSource: { seriesId: "series-1700000000000", versionId: "recipe-1700000001000" },
      blendName: "Snapshot Blend",
      changeNote: "resave",
      blendBeans: fixtureBeans,
      doseGram: 20,
      brewRatio: 16,
      targetBrewGram: 320,
      blendCost: 98.4,
      selectedBrewMethod: deletedSnapshotMethod,
      persistedBrewMethodId: null,
      sensory: legacyRecipeFixture.sensory,
      memo: "",
      now: "2026-05-22T11:00:00.000Z",
      idSeed: 1800000000201,
    });

    expect(recipe.brewMethodId).toBeNull();
    expect(recipe.brewMethodSnapshot).toEqual({ ...fixtureBrewMethod, id: "deleted-method-id" });
  });

  test("uses a resolved current brew method FK while snapshot data remains independent", () => {
    const { recipe } = createRecipeVersionData({
      recipeSeries: [currentRecipeSeriesFixture],
      editingRecipeSource: { seriesId: "series-1700000000000", versionId: "recipe-1700000001000" },
      blendName: "Current Method Blend",
      changeNote: "resave",
      blendBeans: fixtureBeans,
      doseGram: 20,
      brewRatio: 16,
      targetBrewGram: 320,
      blendCost: 98.4,
      selectedBrewMethod: { ...fixtureBrewMethod, id: "saved-brew-version-1", sourceBrewMethodId: "legacy-method" },
      persistedBrewMethodId: "22222222-2222-4222-8222-222222222222",
      sensory: legacyRecipeFixture.sensory,
      memo: "",
      now: "2026-05-22T11:30:00.000Z",
      idSeed: 1800000000202,
    });

    expect(recipe.brewMethodId).toBe("22222222-2222-4222-8222-222222222222");
    expect(recipe.brewMethodSnapshot.id).toBe("legacy-method");
  });

  test("saves recipe versions with existing insertion and sort behavior", () => {
    const { recipe, currentSeries } = createRecipeVersionData({
      recipeSeries: [currentRecipeSeriesFixture],
      editingRecipeSource: { seriesId: "series-1700000000000" },
      blendName: "Updated Blend",
      changeNote: "v3",
      blendBeans: fixtureBeans,
      doseGram: 20,
      brewRatio: 16,
      targetBrewGram: 320,
      blendCost: 98.4,
      selectedBrewMethod: fixtureBrewMethod,
      sensory: legacyRecipeFixture.sensory,
      memo: legacyRecipeFixture.memo,
      now: "2026-05-23T09:00:00.000Z",
      idSeed: 1800000000002,
    });

    const [series] = saveRecipeVersion([currentRecipeSeriesFixture], currentSeries, recipe, recipe.savedAt);

    expect(series.name).toBe("Updated Blend");
    expect(series.currentVersionId).toBe("recipe-1800000000002");
    expect(series.updatedAt).toBe("2026-05-23T09:00:00.000Z");
    expect(series.versions.map((version) => version.version)).toEqual([3, 2, 1]);
  });

  test("saves a new series through pure save data helper", () => {
    const result = saveRecipeData({
      recipeSeries: [],
      editingRecipeSource: null,
      blendName: "  Test Blend  ",
      changeNote: "",
      blendBeans: fixtureBeans,
      doseGram: 20,
      brewRatio: 16,
      targetBrewGram: 320,
      blendCost: 98.4,
      selectedBrewMethod: fixtureBrewMethod,
      sensory: { fragrance: 8, flavor: 8, aftertaste: 7, balance: 8 },
      memo: "  memo  ",
      now: "2026-05-21T09:00:00.000Z",
      seriesIdSeed: 1800000000000,
      versionIdSeed: 1800000000001,
    });

    expect(result.savedSeriesId).toBe("series-1800000000000");
    expect(result.savedVersionId).toBe("recipe-1800000000001");
    expect(result.currentSeries).toBeUndefined();
    expect(result.recipeSeries).toEqual([
      {
        id: "series-1800000000000",
        name: "Test Blend",
        goal: "",
        status: "active",
        currentVersionId: "recipe-1800000000001",
        createdAt: "2026-05-21T09:00:00.000Z",
        updatedAt: "2026-05-21T09:00:00.000Z",
        versions: [result.recipe],
      },
    ]);
    expect(result.recipe).toMatchObject({
      seriesId: "series-1800000000000",
      id: "recipe-1800000000001",
      name: "Test Blend",
      version: 1,
      changeNote: "初回作成",
      doseGram: 20,
      brewRatio: 16,
      targetBrewGram: 320,
      blendCost: 98.4,
      brewMethodId: "standard-4-pour",
      sensory: { fragrance: 8, flavor: 8, aftertaste: 7, balance: 8 },
      memo: "memo",
      savedAt: "2026-05-21T09:00:00.000Z",
    });
    expect(result.recipe.ratios).toEqual([
      { id: "ethiopia", value: 60, roastLevel: "", beanSnapshot: snapshotBean(fixtureBeans[0]) },
      { id: "brazil", value: 40, roastLevel: "", beanSnapshot: snapshotBean(fixtureBeans[1]) },
    ]);
    expect(result.recipe.brewMethodSnapshot).toEqual(fixtureBrewMethod);
  });

  test("adds a version to an existing series through pure save data helper", () => {
    const original = [clone(currentRecipeSeriesFixture), { ...clone(currentRecipeSeriesFixture), id: "series-other" }];
    const oldVersions = original[0].versions;
    const result = saveRecipeData({
      recipeSeries: original,
      editingRecipeSource: { seriesId: "series-1700000000000", versionId: "recipe-1700000001000" },
      blendName: "Renamed Blend",
      changeNote: " next ",
      blendBeans: fixtureBeans,
      doseGram: 22,
      brewRatio: 15,
      targetBrewGram: 330,
      blendCost: 102.3,
      selectedBrewMethod: { ...fixtureBrewMethod, id: "saved-brew-x", sourceBrewMethodId: "standard-4-pour", displayName: "保存時" },
      sensory: { fragrance: 7, flavor: 7, aftertaste: 7, balance: 7 },
      memo: "",
      now: "2026-05-22T09:00:00.000Z",
      versionIdSeed: 1800000000001,
    });

    expect(result.savedSeriesId).toBe("series-1700000000000");
    expect(result.savedVersionId).toBe("recipe-1800000000001");
    expect(result.currentSeries).toEqual(original[0]);
    expect(result.recipe.version).toBe(3);
    expect(result.recipe.brewMethodId).toBe("standard-4-pour");
    expect(result.recipe.brewMethodSnapshot).toEqual(fixtureBrewMethod);
    expect(result.recipeSeries.map((series) => series.id)).toEqual(["series-1700000000000", "series-other"]);
    expect(result.recipeSeries[0]).toMatchObject({
      name: "Renamed Blend",
      status: "active",
      currentVersionId: "recipe-1800000000001",
      createdAt: "2026-05-17T09:00:00.000Z",
      updatedAt: "2026-05-22T09:00:00.000Z",
    });
    expect(result.recipeSeries[0].versions.map((version) => version.version)).toEqual([3, 2, 1]);
    expect(result.recipeSeries[0].versions[1]).toEqual(original[0].versions[0]);
    expect(result.recipeSeries[1]).toBe(original[1]);
    expect(original[0].versions).toBe(oldVersions);
    expect(original[0].versions).toHaveLength(2);
  });

  test("keeps existing archived series save behavior and uses injected time and ids", () => {
    const archived = { ...clone(currentRecipeSeriesFixture), status: "archived" };
    const result = saveRecipeData({
      recipeSeries: [archived],
      editingRecipeSource: { seriesId: archived.id },
      blendName: "",
      changeNote: "",
      blendBeans: fixtureBeans,
      doseGram: 20,
      brewRatio: 16,
      targetBrewGram: 320,
      blendCost: 98.4,
      selectedBrewMethod: null,
      sensory: legacyRecipeFixture.sensory,
      memo: legacyRecipeFixture.memo,
      now: "2026-05-24T09:00:00.000Z",
      seriesIdSeed: 1,
      versionIdSeed: 2,
    });

    expect(result.recipe.id).toBe("recipe-2");
    expect(result.recipe.seriesId).toBe(archived.id);
    expect(result.recipe.changeNote).toBe("");
    expect(result.recipe.brewMethodId).toBeNull();
    expect(result.recipe.brewMethodSnapshot).toBeNull();
    expect(result.recipeSeries[0].status).toBe("active");
    expect(result.recipeSeries[0].updatedAt).toBe("2026-05-24T09:00:00.000Z");
  });

  test("handles snapshots and saved brew method helpers with existing fallback behavior", () => {
    expect(snapshotBean(null)).toBeNull();
    expect(snapshotBrewMethod(null)).toBeNull();
    expect(getRecipeBrewMethodId({ id: "saved", sourceBrewMethodId: "source" })).toBe("source");
    expect(snapshotBrewMethod({ ...fixtureBrewMethod, id: "saved", sourceBrewMethodId: "standard-4-pour", displayName: "保存時" })).toEqual(fixtureBrewMethod);
    expect(createSavedRecipeBrewMethod(legacyRecipeFixture)).toEqual({
      ...fixtureBrewMethod,
      id: "saved-brew-recipe-1700000000000",
      sourceBrewMethodId: "standard-4-pour",
      displayName: "標準 4投式（保存時）",
    });
  });

  test("resolves only currently loaded brew method IDs for persistence", () => {
    const brewMethods = [
      { id: "11111111-1111-4111-8111-111111111111" },
      { id: "22222222-2222-4222-8222-222222222222" },
    ];

    expect(
      resolvePersistedBrewMethodId({
        selectedBrewMethodId: "11111111-1111-4111-8111-111111111111",
        sourceBrewMethodId: "22222222-2222-4222-8222-222222222222",
        brewMethods,
      }),
    ).toBe("11111111-1111-4111-8111-111111111111");
    expect(
      resolvePersistedBrewMethodId({
        selectedBrewMethodId: "saved-brew-version-1",
        sourceBrewMethodId: "22222222-2222-4222-8222-222222222222",
        brewMethods,
      }),
    ).toBe("22222222-2222-4222-8222-222222222222");
    expect(
      resolvePersistedBrewMethodId({
        selectedBrewMethodId: "saved-brew-version-1",
        sourceBrewMethodId: "33333333-3333-4333-8333-333333333333",
        brewMethods,
      }),
    ).toBeNull();
    expect(
      resolvePersistedBrewMethodId({
        selectedBrewMethodId: "standard-4-pour",
        sourceBrewMethodId: null,
        brewMethods,
      }),
    ).toBeNull();
    expect(
      resolvePersistedBrewMethodId({
        selectedBrewMethodId: "33333333-3333-4333-8333-333333333333",
        sourceBrewMethodId: null,
        brewMethods,
      }),
    ).toBeNull();
    expect(resolvePersistedBrewMethodId({ selectedBrewMethodId: null, sourceBrewMethodId: null, brewMethods })).toBeNull();
    expect(
      resolvePersistedBrewMethodId({
        selectedBrewMethodId: "11111111-1111-4111-8111-111111111111",
        sourceBrewMethodId: "22222222-2222-4222-8222-222222222222",
        brewMethods: [],
      }),
    ).toBeNull();
  });
});

describe("recipe series management operations", () => {
  test("archives an active series without changing order, versions, or other series", () => {
    const original = [
      clone(currentRecipeSeriesFixture),
      { ...clone(currentRecipeSeriesFixture), id: "series-2", name: "Other", status: "active" },
    ];
    const firstSeries = original[0];
    const firstVersions = original[0].versions;
    const updated = archiveRecipeSeriesData(original, "series-1700000000000", "2026-06-01T00:00:00.000Z");

    expect(updated.map((series) => series.id)).toEqual(["series-1700000000000", "series-2"]);
    expect(updated[0]).toEqual({ ...firstSeries, status: "archived", updatedAt: "2026-06-01T00:00:00.000Z" });
    expect(updated[0].versions).toBe(firstVersions);
    expect(updated[1]).toBe(original[1]);
    expect(original[0].status).toBe("active");
    expect(updated).not.toBe(original);
    expect(updated[0]).not.toBe(original[0]);
  });

  test("archive keeps existing no-op behavior for missing and already archived series", () => {
    const archived = { ...clone(currentRecipeSeriesFixture), status: "archived" };

    expect(archiveRecipeSeriesData([], "missing", "now")).toEqual([]);
    expect(archiveRecipeSeriesData([archived], "missing", "now")[0]).toBe(archived);
    expect(archiveRecipeSeriesData([archived], archived.id, "now")[0]).toEqual({
      ...archived,
      status: "archived",
      updatedAt: "now",
    });
  });

  test("restores an archived series without changing order, versions, or other series", () => {
    const original = [
      { ...clone(currentRecipeSeriesFixture), status: "archived" },
      { ...clone(currentRecipeSeriesFixture), id: "series-2", name: "Other", status: "active" },
    ];
    const firstVersions = original[0].versions;
    const updated = restoreRecipeSeriesData(original, "series-1700000000000", "2026-06-02T00:00:00.000Z");

    expect(updated.map((series) => series.id)).toEqual(["series-1700000000000", "series-2"]);
    expect(updated[0]).toEqual({ ...original[0], status: "active", updatedAt: "2026-06-02T00:00:00.000Z" });
    expect(updated[0].versions).toBe(firstVersions);
    expect(updated[1]).toBe(original[1]);
    expect(original[0].status).toBe("archived");
  });

  test("restore keeps existing no-op behavior for missing and already active series", () => {
    const active = clone(currentRecipeSeriesFixture);

    expect(restoreRecipeSeriesData([], "missing", "now")).toEqual([]);
    expect(restoreRecipeSeriesData([active], "missing", "now")[0]).toBe(active);
    expect(restoreRecipeSeriesData([active], active.id, "now")[0]).toEqual({
      ...active,
      status: "active",
      updatedAt: "now",
    });
  });

  test("deletes latest version, keeps descending order, and points currentVersionId to latest remaining version", () => {
    const original = [clone(currentRecipeSeriesFixture)];
    const versionsBefore = original[0].versions;
    const updated = deleteRecipeVersionData(
      original,
      "series-1700000000000",
      "recipe-1700000001000",
      "2026-06-03T00:00:00.000Z",
    );

    expect(updated[0].versions.map((version) => version.id)).toEqual(["recipe-1700000000000"]);
    expect(updated[0].versions.map((version) => version.version)).toEqual([1]);
    expect(updated[0].currentVersionId).toBe("recipe-1700000000000");
    expect(updated[0].updatedAt).toBe("2026-06-03T00:00:00.000Z");
    expect(original[0].versions).toBe(versionsBefore);
    expect(original[0].versions).toHaveLength(2);
    expect(updated[0]).not.toBe(original[0]);
    expect(updated[0].versions).not.toBe(original[0].versions);
  });

  test("deletes older version without renumbering or changing currentVersionId", () => {
    const original = [clone(currentRecipeSeriesFixture)];
    const updated = deleteRecipeVersionData(original, "series-1700000000000", "recipe-1700000000000", "now");

    expect(updated[0].versions.map((version) => version.version)).toEqual([2]);
    expect(updated[0].versions[0].id).toBe("recipe-1700000001000");
    expect(updated[0].currentVersionId).toBe("recipe-1700000001000");
    expect(updated[0].updatedAt).toBe("now");
  });

  test("delete version keeps existing no-op behavior for missing ids, empty arrays, and final version", () => {
    const series = clone(currentRecipeSeriesFixture);
    const singleVersionSeries = { ...clone(currentRecipeSeriesFixture), versions: [currentRecipeSeriesFixture.versions[0]] };

    expect(deleteRecipeVersionData([], "series", "recipe", "now")).toEqual([]);
    expect(deleteRecipeVersionData([series], "missing", "recipe-1700000001000", "now")[0]).toBe(series);
    expect(deleteRecipeVersionData([series], series.id, "missing", "now")[0]).toBe(series);
    expect(deleteRecipeVersionData([singleVersionSeries], singleVersionSeries.id, singleVersionSeries.versions[0].id, "now")[0]).toBe(singleVersionSeries);
  });

  test("deletes versions inside archived series and preserves other series references", () => {
    const archived = { ...clone(currentRecipeSeriesFixture), status: "archived" };
    const other = { ...clone(currentRecipeSeriesFixture), id: "series-2" };
    const updated = deleteRecipeVersionData([archived, other], archived.id, "recipe-1700000000000", "now");

    expect(updated[0].status).toBe("archived");
    expect(updated[0].versions.map((version) => version.id)).toEqual(["recipe-1700000001000"]);
    expect(updated[1]).toBe(other);
  });
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}
