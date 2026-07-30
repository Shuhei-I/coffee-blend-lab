import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { currentRecipeSeriesFixture, legacyRecipeFixture } from "../domain/coffee/recipeSeries.fixtures.js";
import { useCoffeeData } from "./useCoffeeData.js";

const defaultBeans = [{ id: "default-bean", costPerGram: 4, profile: {} }];
const defaultBrewMethods = [{ id: "default-method" }];

let dom;
let container;
let root;

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  dom = new JSDOM("<!doctype html><html><body><div id=\"root\"></div></body></html>");
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  container = document.getElementById("root");
});

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  root = undefined;
  dom?.window.close();
  delete globalThis.window;
  delete globalThis.document;
});

describe("useCoffeeData", () => {
  test("loads initial API state and finishes loading", async () => {
    const beanRepository = createBeanRepository({
      beans: [{ id: "supabase-bean", visibleInRecipes: true, costPerKg: 6400 }],
    });
    const repository = createRepository({
      initialState: {
        beans: [{ id: "api-bean", visibleInRecipes: true, costPerKg: 5000 }],
        brewMethods: [{ id: "api-method" }],
        selectedBrewMethodId: "api-method",
        recipeSeries: [currentRecipeSeriesFixture],
        storageMode: "sqlite",
      },
    });
    const rendered = await renderHook(repository, { beanRepository });

    expect(rendered.current.loading).toBe(false);
    expect(rendered.current.loadError).toBeNull();
    expect(rendered.current.beans).toEqual([{ id: "supabase-bean", visibleInRecipes: true, costPerKg: 6400 }]);
    expect(rendered.current.brewMethods).toEqual([{ id: "api-method" }]);
    expect(rendered.current.selectedBrewMethodId).toBe("api-method");
    expect(rendered.current.recipeSeries).toEqual([currentRecipeSeriesFixture]);
    expect(rendered.current.storageMode).toBe("sqlite");
  });

  test("reflects localStorage fallback data when repository returns Local mode", async () => {
    const beanRepository = createBeanRepository({
      beans: [{ id: "supabase-bean", visibleInRecipes: true, costPerKg: 6400 }],
    });
    const repository = createRepository({
      initialState: {
        beans: [{ id: "local-bean", visibleInRecipes: true, costPerKg: 1200 }],
        brewMethods: [{ id: "local-method" }],
        selectedBrewMethodId: "local-method",
        recipeSeries: [legacyRecipeFixture],
        storageMode: "local",
      },
    });
    const rendered = await renderHook(repository, { beanRepository });

    expect(rendered.current.loading).toBe(false);
    expect(rendered.current.loadError).toBeNull();
    expect(rendered.current.storageMode).toBe("local");
    expect(rendered.current.beans[0].id).toBe("supabase-bean");
    expect(rendered.current.recipeSeries).toEqual([legacyRecipeFixture]);
  });

  test("does not fall back to local beans when Supabase bean loading fails", async () => {
    const error = new Error("supabase beans failed");
    const repository = createRepository({
      initialState: {
        beans: [{ id: "local-bean" }],
        brewMethods: [{ id: "api-method" }],
        selectedBrewMethodId: "api-method",
        recipeSeries: [currentRecipeSeriesFixture],
        storageMode: "sqlite",
      },
    });
    const beanRepository = createBeanRepository({
      getBeans: vi.fn(async () => {
        throw error;
      }),
    });
    const rendered = await renderHook(repository, { beanRepository });

    expect(rendered.current.loading).toBe(false);
    expect(rendered.current.loadError).toBe(error);
    expect(rendered.current.beans).toEqual([]);
    expect(rendered.current.brewMethods).toEqual([{ id: "api-method" }]);
    expect(rendered.current.recipeSeries).toEqual([currentRecipeSeriesFixture]);
  });

  test("uses existing default values when no persisted data is available", async () => {
    const repository = createRepository();
    const rendered = await renderHook(repository);

    expect(rendered.current.beans).toEqual(defaultBeans);
    expect(rendered.current.brewMethods).toEqual(defaultBrewMethods);
    expect(rendered.current.selectedBrewMethodId).toBe("default-method");
    expect(rendered.current.recipeSeries).toEqual([]);
    expect(rendered.current.storageMode).toBe("local");
  });

  test("uses module defaults when no defaults are injected", async () => {
    const repository = createRepository({
      getLocalInitialState: vi.fn(({ defaultBeans, defaultBrewMethods }) => ({
        beans: defaultBeans,
        brewMethods: defaultBrewMethods,
        selectedBrewMethodId: defaultBrewMethods[0].id,
        recipeSeries: [],
        storageMode: "local",
      })),
      loadInitialState: vi.fn(async ({ defaultBeans, defaultBrewMethods }) => ({
        beans: defaultBeans,
        brewMethods: defaultBrewMethods,
        selectedBrewMethodId: defaultBrewMethods[0].id,
        recipeSeries: [],
        storageMode: "local",
      })),
    });
    const rendered = await renderHook(repository, { omitDefaults: true });

    expect(rendered.current.beans).toEqual(defaultBeans);
    expect(rendered.current.brewMethods.map((method) => method.id)).toEqual(["standard-4-pour", "sweet-forward"]);
    expect(rendered.current.selectedBrewMethodId).toBe("standard-4-pour");
  });

  test("saves beans master successfully", async () => {
    const repository = createRepository();
    const beanRepository = createBeanRepository();
    const rendered = await renderHook(repository, { beanRepository });

    await act(async () => {
      rendered.current.setBeans([{ ...defaultBeans[0], name: "updated" }]);
    });
    expect(rendered.current.beansDirty).toBe(true);

    await act(async () => {
      await rendered.current.saveBeansMaster();
    });

    expect(repository.saveBeansMaster).not.toHaveBeenCalled();
    expect(beanRepository.updateBean).toHaveBeenCalledWith({ ...defaultBeans[0], name: "updated" });
    expect(rendered.current.masterSaveStatus.beans).toBe("saved");
    expect(rendered.current.saveError).toBeNull();
    expect(rendered.current.beansDirty).toBe(false);
  });

  test("saves brew methods master successfully and persists selected method when still valid", async () => {
    const repository = createRepository({
      initialState: {
        beans: defaultBeans,
        brewMethods: [{ id: "method" }, { id: "method-2" }],
        selectedBrewMethodId: "method",
        recipeSeries: [],
        storageMode: "sqlite",
      },
    });
    const rendered = await renderHook(repository, {
      beanRepository: createBeanRepository(),
    });

    await act(async () => {
      rendered.current.setBrewMethods([{ id: "method", name: "updated" }]);
    });
    await act(async () => {
      await rendered.current.saveBrewMethodsMaster();
    });

    expect(repository.saveBrewMethodsMaster).toHaveBeenCalledWith([{ id: "method", name: "updated" }]);
    expect(repository.queueSelectedBrewMethodSave).toHaveBeenCalledWith("method");
    expect(rendered.current.masterSaveStatus.brewMethods).toBe("saved");
    expect(rendered.current.brewMethodsDirty).toBe(false);
  });

  test("saves RecipeSeries and selected brew method through hook effects", async () => {
    const repository = createRepository({
      initialState: {
        beans: defaultBeans,
        brewMethods: [{ id: "method" }, { id: "method-2" }],
        selectedBrewMethodId: "method",
        recipeSeries: [],
        storageMode: "sqlite",
      },
    });
    const rendered = await renderHook(repository, {
      beanRepository: createBeanRepository(),
    });
    vi.clearAllMocks();

    await act(async () => {
      rendered.current.setRecipeSeries([currentRecipeSeriesFixture]);
    });
    await act(async () => {
      rendered.current.setSelectedBrewMethodId("method-2");
    });

    expect(repository.saveRecipeSeries).toHaveBeenCalledWith([currentRecipeSeriesFixture]);
    expect(repository.saveSelectedBrewMethod).toHaveBeenCalledWith("method-2", {
      selectedSavedRecipeMethod: false,
      existsInSavedBrewMethods: true,
    });
  });

  test("keeps existing save failure behavior", async () => {
    const error = new Error("save failed");
    const repository = createRepository();
    const beanRepository = createBeanRepository({
      updateBean: vi.fn(async () => {
        throw error;
      }),
    });
    const rendered = await renderHook(repository, { beanRepository });
    vi.spyOn(console, "error").mockImplementation(() => {});

    await act(async () => {
      rendered.current.setBeans([{ ...defaultBeans[0], name: "updated" }]);
    });
    await act(async () => {
      await rendered.current.saveBeansMaster();
    });

    expect(rendered.current.masterSaveStatus.beans).toBe("error");
    expect(rendered.current.saveError).toBe(error);
    expect(rendered.current.beansDirty).toBe(true);
    console.error.mockRestore();
  });

  test("creates beans through Supabase and uses the returned UUID", async () => {
    const returnedBean = { ...defaultBeans[0], id: "22222222-2222-4222-8222-222222222222", name: "New" };
    const beanRepository = createBeanRepository({
      createBean: vi.fn(async () => returnedBean),
    });
    const rendered = await renderHook(createRepository(), { beanRepository });

    let created;
    await act(async () => {
      created = await rendered.current.createBeanMaster({ ...defaultBeans[0], id: "11111111-1111-4111-8111-111111111111", name: "New" });
    });

    expect(created).toBe(returnedBean);
    expect(rendered.current.beans.at(-1)).toBe(returnedBean);
    expect(rendered.current.beansDirty).toBe(false);
  });

  test("deletes beans only after Supabase deletion succeeds", async () => {
    const beanRepository = createBeanRepository();
    const rendered = await renderHook(createRepository(), { beanRepository });

    await act(async () => {
      await rendered.current.deleteBeanMaster(defaultBeans[0].id);
    });

    expect(beanRepository.deleteBean).toHaveBeenCalledWith(defaultBeans[0].id);
    expect(rendered.current.beans.map((bean) => bean.id)).toEqual([]);

    const error = new Error("delete failed");
    const failingRepository = createBeanRepository({
      deleteBean: vi.fn(async () => {
        throw error;
      }),
    });
    const failed = await renderHook(createRepository(), { beanRepository: failingRepository });

    await act(async () => {
      await failed.current.deleteBeanMaster(defaultBeans[0].id);
    });

    expect(failed.current.beans).toEqual(defaultBeans);
    expect(failed.current.saveError).toBe(error);
  });

  test("preserves effect order for consecutive selected method and RecipeSeries saves", async () => {
    const repository = createRepository({
      initialState: {
        beans: defaultBeans,
        brewMethods: [{ id: "method" }, { id: "method-2" }],
        selectedBrewMethodId: "method",
        recipeSeries: [],
        storageMode: "sqlite",
      },
    });
    const rendered = await renderHook(repository);
    vi.clearAllMocks();

    await act(async () => {
      rendered.current.setSelectedBrewMethodId("method-2");
      rendered.current.setRecipeSeries([currentRecipeSeriesFixture]);
    });

    expect(repository.saveSelectedBrewMethod.mock.invocationCallOrder[0]).toBeLessThan(
      repository.saveRecipeSeries.mock.invocationCallOrder[0],
    );
  });

  test("does not update state after unmount", async () => {
    const deferred = createDeferred();
    const onBeansReplaced = vi.fn();
    const repository = createRepository({
      loadInitialState: vi.fn(() => deferred.promise),
    });

    const rendered = renderHookSync(repository, { onBeansReplaced });
    act(() => {
      rendered.unmount();
    });
    await act(async () => {
      deferred.resolve({
        beans: [{ id: "late-bean" }],
        brewMethods: [{ id: "late-method" }],
        selectedBrewMethodId: "late-method",
        recipeSeries: [],
        storageMode: "sqlite",
      });
      await deferred.promise;
    });

    expect(onBeansReplaced).not.toHaveBeenCalled();
    expect(rendered.current.loading).toBe(true);
  });
});

async function renderHook(repository, options = {}) {
  const rendered = renderHookSync(repository, options);
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  return rendered;
}

function renderHookSync(repository, options = {}) {
  const rendered = { current: null };

  function TestComponent() {
    const hookOptions = {
      repository,
      beanRepository: options.beanRepository || createBeanRepository(),
      onBeansReplaced: options.onBeansReplaced,
    };
    if (!options.omitDefaults) {
      hookOptions.defaultBeans = defaultBeans;
      hookOptions.defaultBrewMethods = defaultBrewMethods;
    }
    rendered.current = useCoffeeData(hookOptions);
    return null;
  }

  act(() => {
    root = createRoot(container);
    root.render(<TestComponent />);
  });

  return {
    get current() {
      return rendered.current;
    },
    unmount() {
      root.unmount();
      root = undefined;
    },
  };
}

function createBeanRepository(overrides = {}) {
  const { beans = defaultBeans, ...repositoryOverrides } = overrides;
  return {
    getBeans: vi.fn(async () => beans),
    createBean: vi.fn(async (bean) => bean),
    updateBean: vi.fn(async (bean) => bean),
    deleteBean: vi.fn(async () => ({ id: "deleted" })),
    ...repositoryOverrides,
  };
}

function createRepository(overrides = {}) {
  const initialState = overrides.initialState || {
    beans: defaultBeans,
    brewMethods: defaultBrewMethods,
    selectedBrewMethodId: defaultBrewMethods[0].id,
    recipeSeries: [],
    storageMode: "local",
  };

  return {
    getLocalInitialState: vi.fn(() => ({
      beans: defaultBeans,
      brewMethods: defaultBrewMethods,
      selectedBrewMethodId: defaultBrewMethods[0].id,
      recipeSeries: [],
      storageMode: "local",
    })),
    loadInitialState: vi.fn(async () => initialState),
    saveBeansLocal: vi.fn(),
    saveBrewMethodsLocal: vi.fn(),
    saveSelectedBrewMethod: vi.fn(async () => undefined),
    saveRecipeSeries: vi.fn(async () => undefined),
    saveBeansMaster: vi.fn(async () => undefined),
    saveBrewMethodsMaster: vi.fn(async () => undefined),
    queueSelectedBrewMethodSave: vi.fn(async () => undefined),
    ...overrides,
  };
}

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}
