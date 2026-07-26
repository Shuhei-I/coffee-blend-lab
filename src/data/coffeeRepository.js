import * as apiClient from "./apiClient.js";
import { createLocalStorageRepository } from "./localStorageRepository.js";
import { normalizeRecipeSeries } from "../domain/coffee/recipeSeries.js";

export function createCoffeeRepository(options = {}) {
  const api = options.apiClient || apiClient;
  const local = options.localStorageRepository || createLocalStorageRepository(options.storage);
  let sqliteEnabled = false;
  let remoteHydrated = false;
  let saveQueue = Promise.resolve();

  function getLocalInitialState({ defaultBeans, defaultBrewMethods }) {
    const beans = normalizeBeans(local.loadBeans(defaultBeans));
    return {
      beans,
      brewMethods: local.loadBrewMethods(defaultBrewMethods),
      selectedBrewMethodId: local.loadSelectedBrewMethod(defaultBrewMethods[0].id),
      recipeSeries: normalizeRecipeSeries(local.loadRecipeSeries([]), local.loadLegacyRecipes([])),
      storageMode: getStorageMode(),
    };
  }

  async function loadInitialState({ defaultBeans, defaultBrewMethods }) {
    try {
      const state = await api.getJson("/api/state");
      const beans = normalizeBeans(state.beans || defaultBeans);
      const brewMethods = state.brewMethods?.length ? state.brewMethods : defaultBrewMethods;
      sqliteEnabled = true;
      remoteHydrated = true;
      return {
        beans,
        brewMethods,
        selectedBrewMethodId: state.selectedBrewMethodId || defaultBrewMethods[0].id,
        recipeSeries: normalizeRecipeSeries(state.recipeSeries || [], state.recipes || []),
        storageMode: getStorageMode(),
      };
    } catch (error) {
      sqliteEnabled = false;
      remoteHydrated = true;
      return getLocalInitialState({ defaultBeans, defaultBrewMethods });
    }
  }

  function getStorageMode() {
    return sqliteEnabled && remoteHydrated ? "sqlite" : "local";
  }

  function canSaveToApi() {
    return sqliteEnabled && remoteHydrated;
  }

  function saveBeansLocal(beans) {
    local.saveBeans(beans);
  }

  function saveBrewMethodsLocal(brewMethods) {
    local.saveBrewMethods(brewMethods);
  }

  function saveSelectedBrewMethod(selectedBrewMethodId, options = {}) {
    if (!options.selectedSavedRecipeMethod) {
      local.saveSelectedBrewMethod(selectedBrewMethodId);
    }
    if (canSaveToApi() && !options.selectedSavedRecipeMethod && options.existsInSavedBrewMethods) {
      return queuePutJson("/api/settings/selected-brew-method", { selectedBrewMethodId });
    }
    return Promise.resolve();
  }

  function saveRecipeSeries(recipeSeries) {
    local.saveRecipeSeries(recipeSeries);
    if (canSaveToApi()) {
      return queuePutJson("/api/recipes", { recipeSeries });
    }
    return Promise.resolve();
  }

  async function saveBeansMaster(beans) {
    if (canSaveToApi()) {
      await api.putJson("/api/beans", { beans });
    }
  }

  async function saveBrewMethodsMaster(brewMethods) {
    if (canSaveToApi()) {
      await api.putJson("/api/brew-methods", { brewMethods });
    }
  }

  function queueSelectedBrewMethodSave(selectedBrewMethodId) {
    return queuePutJson("/api/settings/selected-brew-method", { selectedBrewMethodId });
  }

  function queuePutJson(path, body) {
    const request = saveQueue
      .catch(() => {})
      .then(() => api.putJson(path, body))
      .catch((error) => {
        console.error(`Failed to save ${path}`, error);
    });
    saveQueue = request;
    return request;
  }

  return {
    getLocalInitialState,
    loadInitialState,
    getStorageMode,
    canSaveToApi,
    saveBeansLocal,
    saveBrewMethodsLocal,
    saveSelectedBrewMethod,
    saveRecipeSeries,
    saveBeansMaster,
    saveBrewMethodsMaster,
    queueSelectedBrewMethodSave,
  };
}

export function normalizeBeans(beans) {
  return beans.map((bean) => ({
    ...bean,
    visibleInRecipes: bean.visibleInRecipes !== false,
    costPerKg: Number(bean.costPerKg ?? Number(bean.costPerGram || 0) * 1000) || 0,
  }));
}
