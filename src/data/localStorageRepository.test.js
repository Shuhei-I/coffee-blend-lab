import { describe, expect, test } from "vitest";
import { currentRecipeSeriesFixture, legacyRecipeFixture } from "../domain/coffee/recipeSeries.fixtures.js";
import {
  STORAGE_KEYS,
  createLocalStorageRepository,
  parseSnapshot,
  parseStoredJson,
  serializeMaster,
  snapshotHasId,
} from "./localStorageRepository.js";

describe("localStorage repository", () => {
  test("loads fallback when data is absent", () => {
    const repository = createLocalStorageRepository(createMemoryStorage());

    expect(repository.loadBeans([{ id: "fallback" }])).toEqual([{ id: "fallback" }]);
    expect(repository.loadBrewMethods([{ id: "method" }])).toEqual([{ id: "method" }]);
    expect(repository.loadSelectedBrewMethod("standard-4-pour")).toBe("standard-4-pour");
    expect(repository.loadRecipeSeries()).toEqual([]);
    expect(repository.loadLegacyRecipes()).toEqual([]);
  });

  test("loads existing data from storage", () => {
    const storage = createMemoryStorage({
      [STORAGE_KEYS.beans]: JSON.stringify([{ id: "ethiopia" }]),
      [STORAGE_KEYS.brewMethods]: JSON.stringify([{ id: "standard-4-pour" }]),
      [STORAGE_KEYS.selectedBrewMethod]: JSON.stringify("standard-4-pour"),
      [STORAGE_KEYS.recipeSeries]: JSON.stringify([currentRecipeSeriesFixture]),
      [STORAGE_KEYS.legacyRecipes]: JSON.stringify([legacyRecipeFixture]),
    });
    const repository = createLocalStorageRepository(storage);

    expect(repository.loadBeans([])).toEqual([{ id: "ethiopia" }]);
    expect(repository.loadBrewMethods([])).toEqual([{ id: "standard-4-pour" }]);
    expect(repository.loadSelectedBrewMethod("fallback")).toBe("standard-4-pour");
    expect(repository.loadRecipeSeries()).toEqual([currentRecipeSeriesFixture]);
    expect(repository.loadLegacyRecipes()).toEqual([legacyRecipeFixture]);
  });

  test("preserves existing invalid JSON fallback behavior", () => {
    const fallback = [{ id: "fallback" }];

    expect(parseStoredJson("{", fallback)).toBe(fallback);
    expect(parseStoredJson(null, fallback)).toBe(fallback);
    expect(parseStoredJson("null", fallback)).toBe(fallback);
    expect(parseSnapshot("{", fallback)).toBe(fallback);
  });

  test("saves beans, brew methods, RecipeSeries, legacy recipes, and selected brew method", () => {
    const storage = createMemoryStorage();
    const repository = createLocalStorageRepository(storage);

    repository.saveBeans([{ id: "ethiopia" }]);
    repository.saveBrewMethods([{ id: "standard-4-pour" }]);
    repository.saveSelectedBrewMethod("standard-4-pour");
    repository.saveRecipeSeries([currentRecipeSeriesFixture]);

    expect(JSON.parse(storage.getItem(STORAGE_KEYS.beans))).toEqual([{ id: "ethiopia" }]);
    expect(JSON.parse(storage.getItem(STORAGE_KEYS.brewMethods))).toEqual([{ id: "standard-4-pour" }]);
    expect(JSON.parse(storage.getItem(STORAGE_KEYS.selectedBrewMethod))).toBe("standard-4-pour");
    expect(JSON.parse(storage.getItem(STORAGE_KEYS.recipeSeries))).toEqual([currentRecipeSeriesFixture]);
    expect(JSON.parse(storage.getItem(STORAGE_KEYS.legacyRecipes))).toEqual(
      currentRecipeSeriesFixture.versions.map((version) => ({ ...version, seriesName: "Morning Blend" })),
    );
  });

  test("keeps existing localStorage keys", () => {
    expect(STORAGE_KEYS).toEqual({
      beans: "coffeeBeansMaster",
      brewMethods: "coffeeBrewMethodsMaster",
      selectedBrewMethod: "coffeeSelectedBrewMethod",
      recipeSeries: "coffeeRecipeSeries",
      legacyRecipes: "coffeeBlendRecipes",
    });
  });

  test("serializes masters and detects ids in snapshots", () => {
    const snapshot = serializeMaster([{ id: "standard-4-pour" }]);

    expect(snapshot).toBe('[{"id":"standard-4-pour"}]');
    expect(snapshotHasId(snapshot, "standard-4-pour")).toBe(true);
    expect(snapshotHasId(snapshot, "missing")).toBe(false);
  });
});

function createMemoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, value);
    },
  };
}
