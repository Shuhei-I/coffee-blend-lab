import { useCallback, useEffect, useRef, useState } from "react";
import { createSupabaseAppSettingsRepository } from "../data/supabaseAppSettingsRepository.js";
import { createSupabaseBeanRepository } from "../data/supabaseBeanRepository.js";
import {
  createSupabaseBrewMethodRepository,
  resolveSelectedBrewMethodId,
} from "../data/supabaseBrewMethodRepository.js";
import { createSupabaseRecipeRepository } from "../data/supabaseRecipeRepository.js";
import { parseSnapshot, serializeMaster } from "../domain/coffee/masterSnapshot.js";
import { createDefaultCoffeeState } from "../domain/defaultCoffeeData.js";

export function useCoffeeData({
  defaultBeans,
  defaultBrewMethods,
  savedRecipeBrewMethod = null,
  beanRepository,
  brewMethodRepository,
  recipeRepository,
  appSettingsRepository,
  onBeansReplaced,
}) {
  const beanRepositoryRef = useRef(null);
  if (!beanRepositoryRef.current) {
    beanRepositoryRef.current = beanRepository || createSupabaseBeanRepository();
  }
  const brewMethodRepositoryRef = useRef(null);
  if (!brewMethodRepositoryRef.current) {
    brewMethodRepositoryRef.current = brewMethodRepository || createSupabaseBrewMethodRepository();
  }
  const recipeRepositoryRef = useRef(null);
  if (!recipeRepositoryRef.current) {
    recipeRepositoryRef.current = recipeRepository || createSupabaseRecipeRepository();
  }
  const appSettingsRepositoryRef = useRef(null);
  if (!appSettingsRepositoryRef.current) {
    appSettingsRepositoryRef.current = appSettingsRepository || createSupabaseAppSettingsRepository();
  }
  const onBeansReplacedRef = useRef(onBeansReplaced);
  onBeansReplacedRef.current = onBeansReplaced;
  const defaultStateRef = useRef(null);
  if (!defaultStateRef.current) {
    defaultStateRef.current =
      defaultBeans && defaultBrewMethods
        ? {
            beans: defaultBeans,
            brewMethods: defaultBrewMethods,
            selectedBrewMethodId: defaultBrewMethods[0].id,
            recipeSeries: [],
          }
        : createDefaultCoffeeState();
  }
  const defaultState = defaultStateRef.current;

  const [beans, setBeans] = useState(() => defaultState.beans);
  const [brewMethods, setBrewMethods] = useState(() => defaultState.brewMethods);
  const [selectedBrewMethodId, setSelectedBrewMethodId] = useState(() => defaultState.selectedBrewMethodId);
  const [recipeSeries, setRecipeSeries] = useState(() => defaultState.recipeSeries);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [masterSaveStatus, setMasterSaveStatus] = useState({ beans: "saved", brewMethods: "saved" });
  const savedBeansSnapshot = useRef(serializeMaster(defaultState.beans));
  const savedBrewMethodsSnapshot = useRef(serializeMaster(defaultState.brewMethods));

  const beansDirty = serializeMaster(beans) !== savedBeansSnapshot.current;
  const brewMethodsDirty = serializeMaster(brewMethods) !== savedBrewMethodsSnapshot.current;

  useEffect(() => {
    let cancelled = false;

    async function loadState() {
      setLoading(true);
      try {
        setMasterSaveStatus({ beans: "saved", brewMethods: "saved" });
        setSaveError(null);
        const [beansResult, brewMethodsResult, recipeSeriesResult, appSettingsResult] = await Promise.allSettled([
          beanRepositoryRef.current.getBeans(),
          brewMethodRepositoryRef.current.getBrewMethods(),
          recipeRepositoryRef.current.getRecipeSeries(),
          appSettingsRepositoryRef.current.getAppSettings(),
        ]);
        if (cancelled) return;

        if (beansResult.status === "fulfilled") {
          const supabaseBeans = beansResult.value;
          savedBeansSnapshot.current = serializeMaster(supabaseBeans);
          setBeans(supabaseBeans);
          onBeansReplacedRef.current?.(supabaseBeans);
        } else {
          setBeans([]);
          onBeansReplacedRef.current?.([]);
        }

        if (brewMethodsResult.status === "fulfilled") {
          const supabaseBrewMethods = brewMethodsResult.value;
          savedBrewMethodsSnapshot.current = serializeMaster(supabaseBrewMethods);
          setBrewMethods(supabaseBrewMethods);
          setSelectedBrewMethodId(
            resolveLoadedSelectedBrewMethodId({
              brewMethods: supabaseBrewMethods,
              selectedBrewMethodId:
                appSettingsResult.status === "fulfilled" ? appSettingsResult.value.selectedBrewMethodId : null,
              defaultSelectedBrewMethodId: defaultState.selectedBrewMethodId,
            }),
          );
        } else {
          savedBrewMethodsSnapshot.current = serializeMaster([]);
          setBrewMethods([]);
          setSelectedBrewMethodId(
            appSettingsResult.status === "fulfilled"
              ? appSettingsResult.value.selectedBrewMethodId || defaultState.selectedBrewMethodId
              : defaultState.selectedBrewMethodId,
          );
        }

        if (recipeSeriesResult.status === "fulfilled") {
          setRecipeSeries(recipeSeriesResult.value);
        } else {
          setRecipeSeries([]);
        }

        setLoadError(beansResult.reason || brewMethodsResult.reason || recipeSeriesResult.reason || appSettingsResult.reason || null);
      } catch (error) {
        if (cancelled) return;
        setMasterSaveStatus({ beans: "saved", brewMethods: "saved" });
        setLoadError(error);
        setBeans([]);
        setRecipeSeries([]);
        onBeansReplacedRef.current?.([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadState();

    return () => {
      cancelled = true;
    };
  }, [defaultState.beans, defaultState.brewMethods]);

  const saveBeansMaster = useCallback(async () => {
    setMasterSaveStatus((current) => ({ ...current, beans: "saving" }));
    try {
      const savedBeans = parseSnapshot(savedBeansSnapshot.current, []);
      const nextBeans = await saveBeansToSupabase({
        beanRepository: beanRepositoryRef.current,
        savedBeans,
        beans,
      });
      savedBeansSnapshot.current = serializeMaster(nextBeans);
      setBeans(nextBeans);
      onBeansReplacedRef.current?.(nextBeans);
      setSaveError(null);
      setMasterSaveStatus((current) => ({ ...current, beans: "saved" }));
      return true;
    } catch (error) {
      console.error("Failed to save beans", error);
      setSaveError(error);
      setMasterSaveStatus((current) => ({ ...current, beans: "error" }));
      return false;
    }
  }, [beans]);

  const createBeanMaster = useCallback(async (bean) => {
    setMasterSaveStatus((current) => ({ ...current, beans: "saving" }));
    try {
      const savedBean = await beanRepositoryRef.current.createBean(bean);
      setBeans((current) => {
        const nextBeans = [...current, savedBean];
        savedBeansSnapshot.current = serializeMaster(nextBeans);
        return nextBeans;
      });
      setSaveError(null);
      setMasterSaveStatus((current) => ({ ...current, beans: "saved" }));
      return savedBean;
    } catch (error) {
      console.error("Failed to create bean", error);
      setSaveError(error);
      setMasterSaveStatus((current) => ({ ...current, beans: "error" }));
      return null;
    }
  }, []);

  const deleteBeanMaster = useCallback(async (beanId) => {
    setMasterSaveStatus((current) => ({ ...current, beans: "saving" }));
    try {
      await beanRepositoryRef.current.deleteBean(beanId);
      setBeans((current) => {
        const nextBeans = current.filter((bean) => bean.id !== beanId);
        savedBeansSnapshot.current = serializeMaster(nextBeans);
        return nextBeans;
      });
      setSaveError(null);
      setMasterSaveStatus((current) => ({ ...current, beans: "saved" }));
      return true;
    } catch (error) {
      console.error("Failed to delete bean", error);
      setSaveError(error);
      setMasterSaveStatus((current) => ({ ...current, beans: "error" }));
      return false;
    }
  }, []);

  const saveBrewMethodsMaster = useCallback(async () => {
    setMasterSaveStatus((current) => ({ ...current, brewMethods: "saving" }));
    try {
      const savedBrewMethods = parseSnapshot(savedBrewMethodsSnapshot.current, []);
      const nextBrewMethods = await saveBrewMethodsToSupabase({
        brewMethodRepository: brewMethodRepositoryRef.current,
        savedBrewMethods,
        brewMethods,
      });
      savedBrewMethodsSnapshot.current = serializeMaster(nextBrewMethods);
      setBrewMethods(nextBrewMethods);
      setSaveError(null);
      setMasterSaveStatus((current) => ({ ...current, brewMethods: "saved" }));
      return true;
    } catch (error) {
      console.error("Failed to save brewMethods", error);
      setSaveError(error);
      setMasterSaveStatus((current) => ({ ...current, brewMethods: "error" }));
      return false;
    }
  }, [brewMethods, selectedBrewMethodId]);

  const createBrewMethodMaster = useCallback(async (brewMethod) => {
    setMasterSaveStatus((current) => ({ ...current, brewMethods: "saving" }));
    try {
      const savedBrewMethod = await brewMethodRepositoryRef.current.createBrewMethod(brewMethod);
      setBrewMethods((current) => {
        const nextBrewMethods = [...current, savedBrewMethod];
        savedBrewMethodsSnapshot.current = serializeMaster(nextBrewMethods);
        return nextBrewMethods;
      });
      setSaveError(null);
      setMasterSaveStatus((current) => ({ ...current, brewMethods: "saved" }));
      return savedBrewMethod;
    } catch (error) {
      console.error("Failed to create brewMethod", error);
      setSaveError(error);
      setMasterSaveStatus((current) => ({ ...current, brewMethods: "error" }));
      return null;
    }
  }, []);

  const deleteBrewMethodMaster = useCallback(async (brewMethodId) => {
    setMasterSaveStatus((current) => ({ ...current, brewMethods: "saving" }));
    try {
      await brewMethodRepositoryRef.current.deleteBrewMethod(brewMethodId);
      setBrewMethods((current) => {
        const nextBrewMethods = current.filter((method) => method.id !== brewMethodId);
        savedBrewMethodsSnapshot.current = serializeMaster(nextBrewMethods);
        return nextBrewMethods;
      });
      setSaveError(null);
      setMasterSaveStatus((current) => ({ ...current, brewMethods: "saved" }));
      return true;
    } catch (error) {
      console.error("Failed to delete brewMethod", error);
      setSaveError(error);
      setMasterSaveStatus((current) => ({ ...current, brewMethods: "error" }));
      return false;
    }
  }, []);

  const revertBeansMaster = useCallback(() => {
    const savedBeans = parseSnapshot(savedBeansSnapshot.current, beans);
    setBeans(savedBeans);
    onBeansReplacedRef.current?.(savedBeans);
    setMasterSaveStatus((current) => ({ ...current, beans: "saved" }));
  }, [beans]);

  const revertBrewMethodsMaster = useCallback(() => {
    const savedMethods = parseSnapshot(savedBrewMethodsSnapshot.current, brewMethods);
    setBrewMethods(savedMethods);
    if (!savedMethods.some((method) => method.id === selectedBrewMethodId)) {
      setSelectedBrewMethodId(savedMethods[0]?.id || defaultState.selectedBrewMethodId);
    }
    setMasterSaveStatus((current) => ({ ...current, brewMethods: "saved" }));
  }, [brewMethods, defaultState.selectedBrewMethodId, selectedBrewMethodId]);

  const saveRecipeVersion = useCallback(async (recipeInput) => {
    try {
      const updatedRecipeSeries = await recipeRepositoryRef.current.saveRecipeVersion(recipeInput);
      setRecipeSeries(updatedRecipeSeries);
      setSaveError(null);
      return updatedRecipeSeries;
    } catch (error) {
      console.error("Failed to save recipe", error);
      setSaveError(error);
      return null;
    }
  }, []);

  const saveSelectedBrewMethodId = useCallback(async (brewMethodId) => {
    if (savedRecipeBrewMethod?.id === brewMethodId) {
      setSelectedBrewMethodId(brewMethodId);
      setSaveError(null);
      return true;
    }

    try {
      await appSettingsRepositoryRef.current.saveSelectedBrewMethodId(brewMethodId || null);
      setSelectedBrewMethodId(brewMethodId);
      setSaveError(null);
      return true;
    } catch (error) {
      console.error("Failed to save selected brew method", error);
      setSaveError(error);
      return false;
    }
  }, [savedRecipeBrewMethod]);

  const archiveRecipeSeries = useCallback(async (seriesId) => {
    try {
      const updatedRecipeSeries = await recipeRepositoryRef.current.archiveRecipeSeries(seriesId);
      setRecipeSeries(updatedRecipeSeries);
      setSaveError(null);
      return updatedRecipeSeries;
    } catch (error) {
      console.error("Failed to archive recipe series", error);
      setSaveError(error);
      return null;
    }
  }, []);

  const restoreRecipeSeries = useCallback(async (seriesId) => {
    try {
      const updatedRecipeSeries = await recipeRepositoryRef.current.restoreRecipeSeries(seriesId);
      setRecipeSeries(updatedRecipeSeries);
      setSaveError(null);
      return updatedRecipeSeries;
    } catch (error) {
      console.error("Failed to restore recipe series", error);
      setSaveError(error);
      return null;
    }
  }, []);

  const deleteRecipeVersion = useCallback(async ({ seriesId, versionId }) => {
    try {
      const updatedRecipeSeries = await recipeRepositoryRef.current.deleteRecipeVersion({ seriesId, versionId });
      setRecipeSeries(updatedRecipeSeries);
      setSaveError(null);
      return updatedRecipeSeries;
    } catch (error) {
      console.error("Failed to delete recipe version", error);
      setSaveError(error);
      return null;
    }
  }, []);

  return {
    beans,
    brewMethods,
    recipeSeries,
    selectedBrewMethodId,
    loading,
    loadError,
    saveError,
    masterSaveStatus,
    beansDirty,
    brewMethodsDirty,
    setBeans,
    setBrewMethods,
    setRecipeSeries,
    setSelectedBrewMethodId,
    saveSelectedBrewMethodId,
    saveRecipeVersion,
    archiveRecipeSeries,
    restoreRecipeSeries,
    deleteRecipeVersion,
    saveBeansMaster,
    createBeanMaster,
    deleteBeanMaster,
    saveBrewMethodsMaster,
    createBrewMethodMaster,
    deleteBrewMethodMaster,
    revertBeansMaster,
    revertBrewMethodsMaster,
  };
}

async function saveBrewMethodsToSupabase({ brewMethodRepository, savedBrewMethods, brewMethods }) {
  const savedById = new Map(savedBrewMethods.map((method) => [method.id, method]));
  const currentById = new Map(brewMethods.map((method) => [method.id, method]));
  const savedNextBrewMethods = [];

  for (const brewMethod of brewMethods) {
    const savedBrewMethod = savedById.get(brewMethod.id);
    if (!savedBrewMethod) {
      savedNextBrewMethods.push(await brewMethodRepository.createBrewMethod(brewMethod));
    } else if (serializeMaster(savedBrewMethod) !== serializeMaster(brewMethod)) {
      savedNextBrewMethods.push(await brewMethodRepository.updateBrewMethod(brewMethod));
    } else {
      savedNextBrewMethods.push(brewMethod);
    }
  }

  for (const savedBrewMethod of savedBrewMethods) {
    if (!currentById.has(savedBrewMethod.id)) {
      await brewMethodRepository.deleteBrewMethod(savedBrewMethod.id);
    }
  }

  return savedNextBrewMethods;
}

function resolveLoadedSelectedBrewMethodId({ brewMethods, selectedBrewMethodId, defaultSelectedBrewMethodId }) {
  if (brewMethods.length > 0) {
    return resolveSelectedBrewMethodId({ brewMethods, selectedBrewMethodId });
  }
  return selectedBrewMethodId || defaultSelectedBrewMethodId;
}

async function saveBeansToSupabase({ beanRepository, savedBeans, beans }) {
  const savedById = new Map(savedBeans.map((bean) => [bean.id, bean]));
  const currentById = new Map(beans.map((bean) => [bean.id, bean]));
  const savedNextBeans = [];

  for (const bean of beans) {
    const savedBean = savedById.get(bean.id);
    if (!savedBean) {
      savedNextBeans.push(await beanRepository.createBean(bean));
    } else if (serializeMaster(savedBean) !== serializeMaster(bean)) {
      savedNextBeans.push(await beanRepository.updateBean(bean));
    } else {
      savedNextBeans.push(bean);
    }
  }

  for (const savedBean of savedBeans) {
    if (!currentById.has(savedBean.id)) {
      await beanRepository.deleteBean(savedBean.id);
    }
  }

  return savedNextBeans;
}
