import { flattenRecipeSeries } from "../domain/coffee/recipeSeries.js";

export const STORAGE_KEYS = {
  beans: "coffeeBeansMaster",
  brewMethods: "coffeeBrewMethodsMaster",
  selectedBrewMethod: "coffeeSelectedBrewMethod",
  recipeSeries: "coffeeRecipeSeries",
  legacyRecipes: "coffeeBlendRecipes",
};

export function createLocalStorageRepository(storage = localStorage) {
  return {
    readStorageValue(key) {
      return storage.getItem(key);
    },
    readStorage(key, fallback) {
      return parseStoredJson(storage.getItem(key), fallback);
    },
    saveStorage(key, value) {
      storage.setItem(key, JSON.stringify(value));
    },
    loadBeans(fallback) {
      return parseStoredJson(storage.getItem(STORAGE_KEYS.beans), fallback);
    },
    saveBeans(beans) {
      storage.setItem(STORAGE_KEYS.beans, JSON.stringify(beans));
    },
    loadBrewMethods(fallback) {
      return parseStoredJson(storage.getItem(STORAGE_KEYS.brewMethods), fallback);
    },
    saveBrewMethods(brewMethods) {
      storage.setItem(STORAGE_KEYS.brewMethods, JSON.stringify(brewMethods));
    },
    loadSelectedBrewMethod(fallback) {
      return parseStoredJson(storage.getItem(STORAGE_KEYS.selectedBrewMethod), fallback);
    },
    saveSelectedBrewMethod(selectedBrewMethodId) {
      storage.setItem(STORAGE_KEYS.selectedBrewMethod, JSON.stringify(selectedBrewMethodId));
    },
    loadRecipeSeries(fallback = []) {
      return parseStoredJson(storage.getItem(STORAGE_KEYS.recipeSeries), fallback);
    },
    loadLegacyRecipes(fallback = []) {
      return parseStoredJson(storage.getItem(STORAGE_KEYS.legacyRecipes), fallback);
    },
    saveRecipeSeries(recipeSeries) {
      storage.setItem(STORAGE_KEYS.recipeSeries, JSON.stringify(recipeSeries));
      storage.setItem(STORAGE_KEYS.legacyRecipes, JSON.stringify(flattenRecipeSeries(recipeSeries)));
    },
  };
}

export function parseStoredJson(value, fallback) {
  try {
    return JSON.parse(value) || fallback;
  } catch {
    return fallback;
  }
}

export function serializeMaster(value) {
  return JSON.stringify(value);
}

export function parseSnapshot(snapshot, fallback) {
  try {
    return JSON.parse(snapshot);
  } catch {
    return fallback;
  }
}

export function snapshotHasId(snapshot, id) {
  return parseSnapshot(snapshot, []).some((item) => item.id === id);
}
