import { describe, expect, test } from "vitest";
import {
  createRecipeVersionData,
  createSavedRecipeBrewMethod,
  flattenRecipeSeries,
  getLatestVersion,
  getNextSeriesVersion,
  getRecipeBean,
  getRecipeBrewMethod,
  getRecipeBrewMethodId,
  normalizeLegacyRecipes,
  normalizeRecipeSeries,
  saveRecipeVersion,
  snapshotBean,
  snapshotBrewMethod,
  sortVersions,
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
      version: 1,
      changeNote: "初回作成",
      ratios: [
        { id: "ethiopia", value: 60, beanSnapshot: snapshotBean(fixtureBeans[0]) },
        { id: "brazil", value: 40, beanSnapshot: snapshotBean(fixtureBeans[1]) },
      ],
      doseGram: 20,
      brewRatio: 16,
      targetBrewGram: 320,
      blendCost: 98.4,
      brewMethodId: "standard-4-pour",
      brewMethodSnapshot: fixtureBrewMethod,
      sensory: { fragrance: 8, flavor: 8, aftertaste: 7, balance: 8 },
      memo: "memo",
      savedAt: "2026-05-21T09:00:00.000Z",
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
});
