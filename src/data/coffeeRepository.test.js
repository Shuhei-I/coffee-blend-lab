import { describe, expect, test, vi } from "vitest";
import { currentRecipeSeriesFixture, legacyRecipeFixture } from "../domain/coffee/recipeSeries.fixtures.js";
import { createCoffeeRepository, normalizeBeans } from "./coffeeRepository.js";
import { STORAGE_KEYS, createLocalStorageRepository } from "./localStorageRepository.js";

const defaultBeans = [{ id: "default-bean", costPerGram: 4, profile: {} }];
const defaultBrewMethods = [{ id: "default-method" }];

describe("coffee repository", () => {
  test("uses API data when initial state API succeeds", async () => {
    const apiClient = {
      getJson: vi.fn(async () => ({
        beans: [{ id: "api-bean", costPerGram: 5 }],
        brewMethods: [{ id: "api-method" }],
        selectedBrewMethodId: "api-method",
        recipeSeries: [currentRecipeSeriesFixture],
        recipes: [legacyRecipeFixture],
      })),
      putJson: vi.fn(),
    };
    const repository = createCoffeeRepository({ apiClient, localStorageRepository: createLocalStorageRepository(createMemoryStorage()) });

    const state = await repository.loadInitialState({ defaultBeans, defaultBrewMethods });

    expect(state.beans).toEqual([{ id: "api-bean", costPerGram: 5, visibleInRecipes: true, costPerKg: 5000 }]);
    expect(state.brewMethods).toEqual([{ id: "api-method" }]);
    expect(state.selectedBrewMethodId).toBe("api-method");
    expect(state.recipeSeries).toEqual([currentRecipeSeriesFixture]);
    expect(state.storageMode).toBe("sqlite");
    expect(repository.getStorageMode()).toBe("sqlite");
  });

  test("falls back to localStorage when initial state API fails", async () => {
    const storage = createMemoryStorage({
      [STORAGE_KEYS.beans]: JSON.stringify([{ id: "local-bean", costPerKg: 1200 }]),
      [STORAGE_KEYS.brewMethods]: JSON.stringify([{ id: "local-method" }]),
      [STORAGE_KEYS.selectedBrewMethod]: JSON.stringify("local-method"),
      [STORAGE_KEYS.recipeSeries]: JSON.stringify([]),
      [STORAGE_KEYS.legacyRecipes]: JSON.stringify([legacyRecipeFixture]),
    });
    const apiClient = {
      getJson: vi.fn(async () => {
        throw new TypeError("network down");
      }),
      putJson: vi.fn(),
    };
    const repository = createCoffeeRepository({ apiClient, localStorageRepository: createLocalStorageRepository(storage) });

    const state = await repository.loadInitialState({ defaultBeans, defaultBrewMethods });

    expect(state.beans).toEqual([{ id: "local-bean", costPerKg: 1200, visibleInRecipes: true }]);
    expect(state.brewMethods).toEqual([{ id: "local-method" }]);
    expect(state.selectedBrewMethodId).toBe("local-method");
    expect(state.recipeSeries[0].id).toBe("series-recipe-1700000000000");
    expect(state.storageMode).toBe("local");
    expect(repository.canSaveToApi()).toBe(false);
  });

  test("saves through API in API mode", async () => {
    const apiClient = {
      getJson: vi.fn(async () => ({ beans: [], brewMethods: [{ id: "method" }], selectedBrewMethodId: "method", recipeSeries: [], recipes: [] })),
      putJson: vi.fn(async () => undefined),
    };
    const repository = createCoffeeRepository({ apiClient, localStorageRepository: createLocalStorageRepository(createMemoryStorage()) });
    await repository.loadInitialState({ defaultBeans, defaultBrewMethods });

    await repository.saveBeansMaster([{ id: "bean" }]);
    await repository.saveBrewMethodsMaster([{ id: "method" }]);
    await repository.saveRecipeSeries([currentRecipeSeriesFixture]);
    await repository.saveSelectedBrewMethod("method", { selectedSavedRecipeMethod: false, existsInSavedBrewMethods: true });

    expect(apiClient.putJson).toHaveBeenCalledWith("/api/beans", { beans: [{ id: "bean" }] });
    expect(apiClient.putJson).toHaveBeenCalledWith("/api/brew-methods", { brewMethods: [{ id: "method" }] });
    expect(apiClient.putJson).toHaveBeenCalledWith("/api/recipes", { recipeSeries: [currentRecipeSeriesFixture] });
    expect(apiClient.putJson).toHaveBeenCalledWith("/api/settings/selected-brew-method", { selectedBrewMethodId: "method" });
  });

  test("saves locally without API calls in Local mode", async () => {
    const storage = createMemoryStorage();
    const apiClient = {
      getJson: vi.fn(async () => {
        throw new Error("offline");
      }),
      putJson: vi.fn(),
    };
    const repository = createCoffeeRepository({ apiClient, localStorageRepository: createLocalStorageRepository(storage) });
    await repository.loadInitialState({ defaultBeans, defaultBrewMethods });

    repository.saveBeansLocal([{ id: "bean" }]);
    repository.saveBrewMethodsLocal([{ id: "method" }]);
    repository.saveSelectedBrewMethod("method", { selectedSavedRecipeMethod: false, existsInSavedBrewMethods: true });
    await repository.saveRecipeSeries([currentRecipeSeriesFixture]);
    await repository.saveBeansMaster([{ id: "bean" }]);
    await repository.saveBrewMethodsMaster([{ id: "method" }]);
    await repository.saveSelectedBrewMethod("noop", { selectedSavedRecipeMethod: true, existsInSavedBrewMethods: true });

    expect(JSON.parse(storage.getItem(STORAGE_KEYS.beans))).toEqual([{ id: "bean" }]);
    expect(JSON.parse(storage.getItem(STORAGE_KEYS.brewMethods))).toEqual([{ id: "method" }]);
    expect(JSON.parse(storage.getItem(STORAGE_KEYS.selectedBrewMethod))).toBe("method");
    expect(JSON.parse(storage.getItem(STORAGE_KEYS.recipeSeries))).toEqual([currentRecipeSeriesFixture]);
    expect(apiClient.putJson).not.toHaveBeenCalled();
    expect(repository.getStorageMode()).toBe("local");
  });

  test("keeps selected brew method fallback conditions unchanged", async () => {
    const apiClient = {
      getJson: vi.fn(async () => ({ beans: [], brewMethods: [{ id: "method" }], selectedBrewMethodId: "method", recipeSeries: [], recipes: [] })),
      putJson: vi.fn(async () => undefined),
    };
    const repository = createCoffeeRepository({ apiClient, localStorageRepository: createLocalStorageRepository(createMemoryStorage()) });
    await repository.loadInitialState({ defaultBeans, defaultBrewMethods });

    await repository.saveSelectedBrewMethod("saved-recipe-method", { selectedSavedRecipeMethod: true, existsInSavedBrewMethods: true });
    await repository.saveSelectedBrewMethod("new-method", { selectedSavedRecipeMethod: false, existsInSavedBrewMethods: false });

    expect(apiClient.putJson).not.toHaveBeenCalled();
  });

  test("normalizes beans with existing cost and visibility rules", () => {
    expect(normalizeBeans([{ id: "bean", costPerGram: 3 }, { id: "hidden", visibleInRecipes: false, costPerKg: "bad" }])).toEqual([
      { id: "bean", costPerGram: 3, visibleInRecipes: true, costPerKg: 3000 },
      { id: "hidden", visibleInRecipes: false, costPerKg: 0 },
    ]);
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
