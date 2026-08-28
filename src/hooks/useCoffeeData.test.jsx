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
  test("loads initial Supabase state and finishes loading", async () => {
    const beanRepository = createBeanRepository({
      beans: [{ id: "supabase-bean", visibleInRecipes: true, costPerKg: 6400 }],
    });
    const brewMethodRepository = createBrewMethodRepository({
      brewMethods: [{ id: "supabase-method" }],
    });
    const repository = createRepository({
      initialState: {
        beans: [{ id: "api-bean", visibleInRecipes: true, costPerKg: 5000 }],
        brewMethods: [{ id: "api-method" }],
        selectedBrewMethodId: "api-method",
        recipeSeries: [currentRecipeSeriesFixture],
      },
    });
    const recipeRepository = createRecipeRepositoryMock({ recipeSeries: [currentRecipeSeriesFixture] });
    const rendered = await renderHook(repository, { beanRepository, brewMethodRepository, recipeRepository });

    expect(rendered.current.loading).toBe(false);
    expect(rendered.current.loadError).toBeNull();
    expect(rendered.current.beans).toEqual([{ id: "supabase-bean", visibleInRecipes: true, costPerKg: 6400 }]);
    expect(rendered.current.brewMethods).toEqual([{ id: "supabase-method" }]);
    expect(rendered.current.selectedBrewMethodId).toBe("supabase-method");
    expect(rendered.current.recipeSeries).toEqual([currentRecipeSeriesFixture]);
    expect(recipeRepository.getRecipeSeries).toHaveBeenCalled();
  });

  test("does not use local Repository RecipeSeries as source of truth", async () => {
    const beanRepository = createBeanRepository({
      beans: [{ id: "supabase-bean", visibleInRecipes: true, costPerKg: 6400 }],
    });
    const brewMethodRepository = createBrewMethodRepository({
      brewMethods: [{ id: "supabase-method" }],
    });
    const repository = createRepository({
      initialState: {
        beans: [{ id: "local-bean", visibleInRecipes: true, costPerKg: 1200 }],
        brewMethods: [{ id: "local-method" }],
        selectedBrewMethodId: "local-method",
        recipeSeries: [legacyRecipeFixture],
      },
    });
    const rendered = await renderHook(repository, { beanRepository, brewMethodRepository });

    expect(rendered.current.loading).toBe(false);
    expect(rendered.current.loadError).toBeNull();
    expect(rendered.current.beans[0].id).toBe("supabase-bean");
    expect(rendered.current.brewMethods).toEqual([{ id: "supabase-method" }]);
    expect(rendered.current.recipeSeries).toEqual([]);
  });

  test("does not fall back to local beans when Supabase bean loading fails", async () => {
    const error = new Error("supabase beans failed");
    const repository = createRepository({
      initialState: {
        beans: [{ id: "local-bean" }],
        brewMethods: [{ id: "api-method" }],
        selectedBrewMethodId: "api-method",
        recipeSeries: [currentRecipeSeriesFixture],
      },
    });
    const beanRepository = createBeanRepository({
      getBeans: vi.fn(async () => {
        throw error;
      }),
    });
    const rendered = await renderHook(repository, {
      beanRepository,
      brewMethodRepository: createBrewMethodRepository({ brewMethods: [{ id: "supabase-method" }] }),
      recipeRepository: createRecipeRepositoryMock({ recipeSeries: [currentRecipeSeriesFixture] }),
    });

    expect(rendered.current.loading).toBe(false);
    expect(rendered.current.loadError).toBe(error);
    expect(rendered.current.beans).toEqual([]);
    expect(rendered.current.brewMethods).toEqual([{ id: "supabase-method" }]);
    expect(rendered.current.recipeSeries).toEqual([currentRecipeSeriesFixture]);
  });

  test("does not fall back to local brew methods when Supabase brew method loading fails", async () => {
    const error = new Error("supabase brew methods failed");
    const repository = createRepository({
      initialState: {
        beans: [{ id: "local-bean" }],
        brewMethods: [{ id: "local-method" }],
        selectedBrewMethodId: "local-method",
        recipeSeries: [currentRecipeSeriesFixture],
      },
    });
    const rendered = await renderHook(repository, {
      beanRepository: createBeanRepository({ beans: [{ id: "supabase-bean" }] }),
      recipeRepository: createRecipeRepositoryMock({ recipeSeries: [currentRecipeSeriesFixture] }),
      brewMethodRepository: createBrewMethodRepository({
        getBrewMethods: vi.fn(async () => {
          throw error;
        }),
      }),
    });

    expect(rendered.current.loading).toBe(false);
    expect(rendered.current.loadError).toBe(error);
    expect(rendered.current.beans).toEqual([{ id: "supabase-bean" }]);
    expect(rendered.current.brewMethods).toEqual([]);
    expect(rendered.current.recipeSeries).toEqual([currentRecipeSeriesFixture]);
  });

  test("uses existing default values when no persisted data is available", async () => {
    const repository = createRepository();
    const rendered = await renderHook(repository);

    expect(rendered.current.beans).toEqual(defaultBeans);
    expect(rendered.current.brewMethods).toEqual(defaultBrewMethods);
    expect(rendered.current.selectedBrewMethodId).toBe("default-method");
    expect(rendered.current.recipeSeries).toEqual([]);
  });

  test("uses module defaults when no defaults are injected", async () => {
    const repository = createRepository();
    const rendered = await renderHook(repository, { omitDefaults: true });

    expect(rendered.current.beans).toEqual(defaultBeans);
    expect(rendered.current.brewMethods).toEqual(defaultBrewMethods);
    expect(rendered.current.selectedBrewMethodId).toBe("default-method");
  });

  test("resolves legacy selected brew method IDs from Supabase system keys", async () => {
    const standard = createBrewMethodWithSystemKey({ id: "uuid-standard", systemKey: "standard-4-pour" });
    const sweet = createBrewMethodWithSystemKey({ id: "uuid-sweet", systemKey: "sweet-forward" });
    const repository = createRepository({
      initialState: {
        beans: defaultBeans,
        brewMethods: [{ id: "standard-4-pour" }, { id: "sweet-forward" }],
        selectedBrewMethodId: "sweet-forward",
        recipeSeries: [],
      },
    });

    const rendered = await renderHook(repository, {
      brewMethodRepository: createBrewMethodRepository({ brewMethods: [standard, sweet] }),
      appSettingsRepository: createAppSettingsRepository({ selectedBrewMethodId: "sweet-forward" }),
    });

    expect(rendered.current.brewMethods).toEqual([standard, sweet]);
    expect(rendered.current.selectedBrewMethodId).toBe("uuid-sweet");
  });

  test("uses a safe selected brew method when Supabase app settings are null or invalid", async () => {
    const methods = [{ id: "method-1" }, { id: "method-2" }];

    const nullSettings = await renderHook(createRepository(), {
      brewMethodRepository: createBrewMethodRepository({ brewMethods: methods }),
      appSettingsRepository: createAppSettingsRepository({ selectedBrewMethodId: null }),
    });
    expect(nullSettings.current.selectedBrewMethodId).toBe("method-1");
    act(() => {
      nullSettings.unmount();
    });

    const invalidSettings = await renderHook(createRepository(), {
      brewMethodRepository: createBrewMethodRepository({ brewMethods: methods }),
      appSettingsRepository: createAppSettingsRepository({ selectedBrewMethodId: "missing-method" }),
    });
    expect(invalidSettings.current.selectedBrewMethodId).toBe("method-1");
  });

  test("does not fall back to old selected brew method when Supabase app settings loading fails", async () => {
    const error = new Error("settings load failed");
    const rendered = await renderHook(
      createRepository({
        initialState: {
          beans: defaultBeans,
          brewMethods: [{ id: "old-local-method" }],
          selectedBrewMethodId: "old-local-method",
          recipeSeries: [legacyRecipeFixture],
        },
      }),
      {
        beanRepository: createBeanRepository({ beans: [{ id: "supabase-bean" }] }),
        brewMethodRepository: createBrewMethodRepository({ brewMethods: [{ id: "method-1" }] }),
        recipeRepository: createRecipeRepositoryMock({ recipeSeries: [currentRecipeSeriesFixture] }),
        appSettingsRepository: createAppSettingsRepository({
          getAppSettings: vi.fn(async () => {
            throw error;
          }),
        }),
      },
    );

    expect(rendered.current.loadError).toBe(error);
    expect(rendered.current.beans).toEqual([{ id: "supabase-bean" }]);
    expect(rendered.current.brewMethods).toEqual([{ id: "method-1" }]);
    expect(rendered.current.recipeSeries).toEqual([currentRecipeSeriesFixture]);
    expect(rendered.current.selectedBrewMethodId).toBe("method-1");
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

  test("saves bean additions and deletions only when master save runs", async () => {
    const newBean = { id: "new-bean", name: "New", profile: {} };
    const beanRepository = createBeanRepository();
    const rendered = await renderHook(createRepository(), { beanRepository });

    await act(async () => {
      rendered.current.setBeans([...defaultBeans, newBean]);
    });

    expect(rendered.current.beansDirty).toBe(true);
    expect(beanRepository.createBean).not.toHaveBeenCalled();

    await act(async () => {
      await rendered.current.saveBeansMaster();
    });

    expect(beanRepository.createBean).toHaveBeenCalledWith(newBean);
    expect(rendered.current.beansDirty).toBe(false);

    await act(async () => {
      rendered.current.setBeans([]);
    });

    expect(rendered.current.beansDirty).toBe(true);
    expect(beanRepository.deleteBean).not.toHaveBeenCalled();

    await act(async () => {
      await rendered.current.saveBeansMaster();
    });

    expect(beanRepository.deleteBean).toHaveBeenCalledWith(defaultBeans[0].id);
    expect(beanRepository.deleteBean).toHaveBeenCalledWith(newBean.id);
    expect(rendered.current.beansDirty).toBe(false);
  });

  test("saves brew methods through Supabase without old selected method persistence", async () => {
    const brewMethodRepository = createBrewMethodRepository({
      brewMethods: [{ id: "method" }, { id: "method-2" }],
    });
    const appSettingsRepository = createAppSettingsRepository();
    const repository = createRepository({
      initialState: {
        beans: defaultBeans,
        brewMethods: [{ id: "old-method" }],
        selectedBrewMethodId: "method",
        recipeSeries: [],
      },
    });
    const rendered = await renderHook(repository, { brewMethodRepository, appSettingsRepository });

    await act(async () => {
      rendered.current.setBrewMethods([{ id: "method", name: "updated" }]);
    });
    expect(rendered.current.brewMethodsDirty).toBe(true);

    await act(async () => {
      await rendered.current.saveBrewMethodsMaster();
    });

    expect(repository.saveBrewMethodsMaster).not.toHaveBeenCalled();
    expect(brewMethodRepository.updateBrewMethod).toHaveBeenCalledWith({ id: "method", name: "updated" });
    expect(brewMethodRepository.deleteBrewMethod).toHaveBeenCalledWith("method-2");
    expect(appSettingsRepository.saveSelectedBrewMethodId).toHaveBeenCalledWith("method");
    expect(repository.queueSelectedBrewMethodSave).not.toHaveBeenCalled();
    expect(rendered.current.masterSaveStatus.brewMethods).toBe("saved");
    expect(rendered.current.brewMethodsDirty).toBe(false);
  });

  test("saves selected brew method through Supabase app settings without old RecipeSeries autosave", async () => {
    const repository = createRepository({
      initialState: {
        beans: defaultBeans,
        brewMethods: [{ id: "method" }, { id: "method-2" }],
        selectedBrewMethodId: "method",
        recipeSeries: [],
      },
    });
    const appSettingsRepository = createAppSettingsRepository();
    const rendered = await renderHook(repository, {
      beanRepository: createBeanRepository(),
      brewMethodRepository: createBrewMethodRepository({ brewMethods: [{ id: "method" }, { id: "method-2" }] }),
      appSettingsRepository,
    });
    vi.clearAllMocks();

    await act(async () => {
      await rendered.current.saveSelectedBrewMethodId("method-2");
    });

    expect(repository.saveRecipeSeries).not.toHaveBeenCalled();
    expect(repository.saveSelectedBrewMethod).not.toHaveBeenCalled();
    expect(appSettingsRepository.saveSelectedBrewMethodId).toHaveBeenCalledWith("method-2");
    expect(rendered.current.selectedBrewMethodId).toBe("method-2");
  });

  test("keeps selected brew method state when Supabase app settings save fails", async () => {
    const error = new Error("settings save failed");
    const appSettingsRepository = createAppSettingsRepository({
      selectedBrewMethodId: "method",
      saveSelectedBrewMethodId: vi.fn(async () => {
        throw error;
      }),
    });
    const repository = createRepository({
      initialState: {
        beans: defaultBeans,
        brewMethods: [{ id: "method" }, { id: "method-2" }],
        selectedBrewMethodId: "old-local-method",
        recipeSeries: [],
      },
    });
    const rendered = await renderHook(repository, {
      brewMethodRepository: createBrewMethodRepository({ brewMethods: [{ id: "method" }, { id: "method-2" }] }),
      appSettingsRepository,
    });
    vi.spyOn(console, "error").mockImplementation(() => {});

    await act(async () => {
      await rendered.current.saveSelectedBrewMethodId("method-2");
    });

    expect(rendered.current.selectedBrewMethodId).toBe("method");
    expect(rendered.current.saveError).toBe(error);
    expect(repository.saveSelectedBrewMethod).not.toHaveBeenCalled();
    console.error.mockRestore();
  });

  test("does not save temporary saved recipe brew method IDs to app settings", async () => {
    const appSettingsRepository = createAppSettingsRepository({ selectedBrewMethodId: "method" });
    const rendered = await renderHook(createRepository(), {
      savedRecipeBrewMethod: { id: "saved-brew-version-1" },
      brewMethodRepository: createBrewMethodRepository({ brewMethods: [{ id: "method" }] }),
      appSettingsRepository,
    });
    vi.clearAllMocks();

    await act(async () => {
      await rendered.current.saveSelectedBrewMethodId("saved-brew-version-1");
    });

    expect(appSettingsRepository.saveSelectedBrewMethodId).not.toHaveBeenCalled();
    expect(rendered.current.selectedBrewMethodId).toBe("saved-brew-version-1");
    expect(rendered.current.saveError).toBeNull();
  });

  test("saves RecipeVersions through Supabase Recipe Repository and uses returned series", async () => {
    const updatedRecipeSeries = [{ ...currentRecipeSeriesFixture, id: "saved-series" }];
    const recipeRepository = createRecipeRepositoryMock({
      saveRecipeVersion: vi.fn(async () => updatedRecipeSeries),
    });
    const repository = createRepository();
    const rendered = await renderHook(repository, { recipeRepository });
    vi.clearAllMocks();

    await act(async () => {
      await rendered.current.saveRecipeVersion({ name: "Saved", ratios: [] });
    });

    expect(recipeRepository.saveRecipeVersion).toHaveBeenCalledWith({ name: "Saved", ratios: [] });
    expect(repository.saveRecipeSeries).not.toHaveBeenCalled();
    expect(rendered.current.recipeSeries).toBe(updatedRecipeSeries);
    expect(rendered.current.saveError).toBeNull();
  });

  test("keeps RecipeSeries state when Supabase Recipe save fails", async () => {
    const error = new Error("recipe save failed");
    const recipeRepository = createRecipeRepositoryMock({
      recipeSeries: [currentRecipeSeriesFixture],
      saveRecipeVersion: vi.fn(async () => {
        throw error;
      }),
    });
    const rendered = await renderHook(createRepository(), { recipeRepository });
    vi.spyOn(console, "error").mockImplementation(() => {});

    await act(async () => {
      await rendered.current.saveRecipeVersion({ name: "Failed", ratios: [] });
    });

    expect(rendered.current.recipeSeries).toEqual([currentRecipeSeriesFixture]);
    expect(rendered.current.saveError).toBe(error);
    console.error.mockRestore();
  });

  test("copies a published blend and reloads its recipe and imported beans together", async () => {
    const copiedVersion = { ...currentRecipeSeriesFixture.versions[0], id: "copied-version", seriesId: "copied-series" };
    const copiedSeries = { ...currentRecipeSeriesFixture, id: "copied-series", versions: [copiedVersion] };
    const importedBeans = [{ ...defaultBeans[0], id: "imported-bean", name: "Imported" }];
    const recipeRepository = createRecipeRepositoryMock({
      getRecipeSeries: vi.fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([copiedSeries]),
      copyPublishedBlend: vi.fn(async () => ({ seriesId: "copied-series", versionId: "copied-version" })),
    });
    const beanRepository = createBeanRepository({
      getBeans: vi.fn()
        .mockResolvedValueOnce(defaultBeans)
        .mockResolvedValueOnce(importedBeans),
    });
    const onBeansReplaced = vi.fn();
    const rendered = await renderHook(createRepository(), { recipeRepository, beanRepository, onBeansReplaced });
    onBeansReplaced.mockClear();

    let copied;
    await act(async () => {
      copied = await rendered.current.copyPublishedBlend("post-1");
    });

    expect(recipeRepository.copyPublishedBlend).toHaveBeenCalledWith("post-1");
    expect(copied).toEqual({
      seriesId: "copied-series",
      versionId: "copied-version",
      series: copiedSeries,
      version: copiedVersion,
    });
    expect(rendered.current.recipeSeries).toEqual([copiedSeries]);
    expect(rendered.current.beans).toEqual(importedBeans);
    expect(onBeansReplaced).toHaveBeenCalledWith(importedBeans);
    expect(rendered.current.saveError).toBeNull();
  });

  test("keeps local coffee data unchanged when a published blend copy fails", async () => {
    const error = new Error("copy failed");
    const recipeRepository = createRecipeRepositoryMock({
      recipeSeries: [currentRecipeSeriesFixture],
      copyPublishedBlend: vi.fn(async () => {
        throw error;
      }),
    });
    const rendered = await renderHook(createRepository(), { recipeRepository });
    const initialBeans = rendered.current.beans;
    vi.spyOn(console, "error").mockImplementation(() => {});

    let copied;
    await act(async () => {
      copied = await rendered.current.copyPublishedBlend("post-1");
    });

    expect(copied).toBeNull();
    expect(rendered.current.recipeSeries).toEqual([currentRecipeSeriesFixture]);
    expect(rendered.current.beans).toBe(initialBeans);
    expect(rendered.current.saveError).toBe(error);
    console.error.mockRestore();
  });

  test("archives restores and deletes recipes through Supabase Recipe Repository", async () => {
    const archived = [{ ...currentRecipeSeriesFixture, status: "archived" }];
    const restored = [currentRecipeSeriesFixture];
    const deleted = [{ ...currentRecipeSeriesFixture, versions: [currentRecipeSeriesFixture.versions[0]] }];
    const recipeRepository = createRecipeRepositoryMock({
      archiveRecipeSeries: vi.fn(async () => archived),
      restoreRecipeSeries: vi.fn(async () => restored),
      deleteRecipeVersion: vi.fn(async () => deleted),
    });
    const rendered = await renderHook(createRepository(), { recipeRepository });

    await act(async () => {
      await rendered.current.archiveRecipeSeries("series-1");
    });
    expect(recipeRepository.archiveRecipeSeries).toHaveBeenCalledWith("series-1");
    expect(rendered.current.recipeSeries).toBe(archived);

    await act(async () => {
      await rendered.current.restoreRecipeSeries("series-1");
    });
    expect(recipeRepository.restoreRecipeSeries).toHaveBeenCalledWith("series-1");
    expect(rendered.current.recipeSeries).toBe(restored);

    await act(async () => {
      await rendered.current.deleteRecipeVersion({ seriesId: "series-1", versionId: "version-1" });
    });
    expect(recipeRepository.deleteRecipeVersion).toHaveBeenCalledWith({ seriesId: "series-1", versionId: "version-1" });
    expect(rendered.current.recipeSeries).toBe(deleted);
    expect(rendered.current.saveError).toBeNull();
  });

  test("keeps RecipeSeries state when Supabase archive restore or delete fails", async () => {
    const error = new Error("recipe action failed");
    const recipeRepository = createRecipeRepositoryMock({
      recipeSeries: [currentRecipeSeriesFixture],
      archiveRecipeSeries: vi.fn(async () => {
        throw error;
      }),
      restoreRecipeSeries: vi.fn(async () => {
        throw error;
      }),
      deleteRecipeVersion: vi.fn(async () => {
        throw error;
      }),
    });
    const rendered = await renderHook(createRepository(), { recipeRepository });
    vi.spyOn(console, "error").mockImplementation(() => {});

    await act(async () => {
      await rendered.current.archiveRecipeSeries("series-1");
    });
    expect(rendered.current.recipeSeries).toEqual([currentRecipeSeriesFixture]);
    expect(rendered.current.saveError).toBe(error);

    await act(async () => {
      await rendered.current.restoreRecipeSeries("series-1");
    });
    expect(rendered.current.recipeSeries).toEqual([currentRecipeSeriesFixture]);

    await act(async () => {
      await rendered.current.deleteRecipeVersion({ seriesId: "series-1", versionId: "version-1" });
    });
    expect(rendered.current.recipeSeries).toEqual([currentRecipeSeriesFixture]);
    console.error.mockRestore();
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

  test("keeps brew method save failure behavior", async () => {
    const error = new Error("brew save failed");
    const brewMethodRepository = createBrewMethodRepository({
      updateBrewMethod: vi.fn(async () => {
        throw error;
      }),
    });
    const rendered = await renderHook(createRepository(), { brewMethodRepository });
    vi.spyOn(console, "error").mockImplementation(() => {});

    await act(async () => {
      rendered.current.setBrewMethods([{ ...defaultBrewMethods[0], name: "updated" }]);
    });
    await act(async () => {
      await rendered.current.saveBrewMethodsMaster();
    });

    expect(rendered.current.masterSaveStatus.brewMethods).toBe("error");
    expect(rendered.current.saveError).toBe(error);
    expect(rendered.current.brewMethodsDirty).toBe(true);
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

  test("updates one bean through Supabase and keeps master state saved", async () => {
    const updatedBean = { ...defaultBeans[0], name: "Updated" };
    const beanRepository = createBeanRepository({
      updateBean: vi.fn(async () => updatedBean),
    });
    const onBeansReplaced = vi.fn();
    const rendered = await renderHook(createRepository(), { beanRepository, onBeansReplaced });

    let saved;
    await act(async () => {
      saved = await rendered.current.updateBeanMaster(updatedBean);
    });

    expect(saved).toBe(updatedBean);
    expect(beanRepository.updateBean).toHaveBeenCalledWith(updatedBean);
    expect(rendered.current.beans).toEqual([updatedBean]);
    expect(rendered.current.beansDirty).toBe(false);
    expect(rendered.current.masterSaveStatus.beans).toBe("saved");
    expect(onBeansReplaced).toHaveBeenLastCalledWith([updatedBean]);
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

  test("creates brew methods through Supabase and uses the returned UUID", async () => {
    const returnedMethod = { ...defaultBrewMethods[0], id: "22222222-2222-4222-8222-222222222222", name: "New" };
    const brewMethodRepository = createBrewMethodRepository({
      createBrewMethod: vi.fn(async () => returnedMethod),
    });
    const rendered = await renderHook(createRepository(), { brewMethodRepository });

    let created;
    await act(async () => {
      created = await rendered.current.createBrewMethodMaster({
        ...defaultBrewMethods[0],
        id: "11111111-1111-4111-8111-111111111111",
        name: "New",
      });
    });

    expect(created).toBe(returnedMethod);
    expect(rendered.current.brewMethods.at(-1)).toBe(returnedMethod);
    expect(rendered.current.brewMethodsDirty).toBe(false);
  });

  test("updates one brew method through Supabase and keeps master state saved", async () => {
    const updatedMethod = { ...defaultBrewMethods[0], name: "Updated" };
    const brewMethodRepository = createBrewMethodRepository({
      updateBrewMethod: vi.fn(async () => updatedMethod),
    });
    const rendered = await renderHook(createRepository(), { brewMethodRepository });

    let saved;
    await act(async () => {
      saved = await rendered.current.updateBrewMethodMaster(updatedMethod);
    });

    expect(saved).toBe(updatedMethod);
    expect(brewMethodRepository.updateBrewMethod).toHaveBeenCalledWith(updatedMethod);
    expect(rendered.current.brewMethods).toEqual([updatedMethod]);
    expect(rendered.current.brewMethodsDirty).toBe(false);
    expect(rendered.current.masterSaveStatus.brewMethods).toBe("saved");
  });

  test("deletes brew methods only after Supabase deletion succeeds", async () => {
    const brewMethodRepository = createBrewMethodRepository();
    const rendered = await renderHook(createRepository(), { brewMethodRepository });

    await act(async () => {
      await rendered.current.deleteBrewMethodMaster(defaultBrewMethods[0].id);
    });

    expect(brewMethodRepository.deleteBrewMethod).toHaveBeenCalledWith(defaultBrewMethods[0].id);
    expect(rendered.current.brewMethods.map((method) => method.id)).toEqual([]);

    const error = new Error("delete failed");
    const failingRepository = createBrewMethodRepository({
      deleteBrewMethod: vi.fn(async () => {
        throw error;
      }),
    });
    const failed = await renderHook(createRepository(), { brewMethodRepository: failingRepository });

    await act(async () => {
      await failed.current.deleteBrewMethodMaster(defaultBrewMethods[0].id);
    });

    expect(failed.current.brewMethods).toEqual(defaultBrewMethods);
    expect(failed.current.saveError).toBe(error);
  });

  test("raw selected method state changes do not trigger old selected or RecipeSeries autosave", async () => {
    const repository = createRepository({
      initialState: {
        beans: defaultBeans,
        brewMethods: [{ id: "method" }, { id: "method-2" }],
        selectedBrewMethodId: "method",
        recipeSeries: [],
      },
    });
    const rendered = await renderHook(repository, {
      brewMethodRepository: createBrewMethodRepository({ brewMethods: [{ id: "method" }, { id: "method-2" }] }),
    });
    vi.clearAllMocks();

    await act(async () => {
      rendered.current.setSelectedBrewMethodId("method-2");
      rendered.current.setRecipeSeries([currentRecipeSeriesFixture]);
    });

    expect(repository.saveSelectedBrewMethod).not.toHaveBeenCalled();
    expect(repository.saveRecipeSeries).not.toHaveBeenCalled();
  });

  test("does not update state after unmount", async () => {
    const deferred = createDeferred();
    const onBeansReplaced = vi.fn();
    const beanRepository = createBeanRepository({
      getBeans: vi.fn(() => deferred.promise),
    });

    const rendered = renderHookSync(createRepository(), { beanRepository, onBeansReplaced });
    act(() => {
      rendered.unmount();
    });
    await act(async () => {
      deferred.resolve([{ id: "late-bean" }]);
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
      brewMethodRepository: options.brewMethodRepository || createBrewMethodRepository(),
      recipeRepository: options.recipeRepository || createRecipeRepositoryMock(),
      appSettingsRepository: options.appSettingsRepository || createAppSettingsRepository(),
      savedRecipeBrewMethod: options.savedRecipeBrewMethod,
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

function createBrewMethodRepository(overrides = {}) {
  const { brewMethods = defaultBrewMethods, ...repositoryOverrides } = overrides;
  return {
    getBrewMethods: vi.fn(async () => brewMethods),
    createBrewMethod: vi.fn(async (brewMethod) => brewMethod),
    updateBrewMethod: vi.fn(async (brewMethod) => brewMethod),
    deleteBrewMethod: vi.fn(async () => ({ id: "deleted" })),
    ...repositoryOverrides,
  };
}

function createBrewMethodWithSystemKey({ id, systemKey }) {
  const method = { id };
  Object.defineProperty(method, "systemKey", {
    value: systemKey,
    enumerable: false,
  });
  return method;
}

function createRecipeRepositoryMock(overrides = {}) {
  const { recipeSeries = [], ...repositoryOverrides } = overrides;
  return {
    getRecipeSeries: vi.fn(async () => recipeSeries),
    saveRecipeVersion: vi.fn(async () => recipeSeries),
    copyPublishedBlend: vi.fn(async () => ({ seriesId: "copied-series", versionId: "copied-version" })),
    archiveRecipeSeries: vi.fn(async () => recipeSeries),
    restoreRecipeSeries: vi.fn(async () => recipeSeries),
    deleteRecipeVersion: vi.fn(async () => recipeSeries),
    ...repositoryOverrides,
  };
}

function createAppSettingsRepository(overrides = {}) {
  const { selectedBrewMethodId = null, ...repositoryOverrides } = overrides;
  return {
    getAppSettings: vi.fn(async () => ({ selectedBrewMethodId })),
    saveSelectedBrewMethodId: vi.fn(async (id) => ({ selectedBrewMethodId: id || null })),
    ...repositoryOverrides,
  };
}

function createRepository(overrides = {}) {
  const initialState = overrides.initialState || {
    beans: defaultBeans,
    brewMethods: defaultBrewMethods,
    selectedBrewMethodId: defaultBrewMethods[0].id,
    recipeSeries: [],
  };

  return {
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
