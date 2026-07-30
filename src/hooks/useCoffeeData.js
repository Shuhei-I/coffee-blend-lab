import { useCallback, useEffect, useRef, useState } from "react";
import { createCoffeeRepository } from "../data/coffeeRepository.js";
import { parseSnapshot, serializeMaster, snapshotHasId } from "../data/localStorageRepository.js";
import { createSupabaseBeanRepository } from "../data/supabaseBeanRepository.js";
import { createDefaultCoffeeState } from "../domain/defaultCoffeeData.js";

export function useCoffeeData({
  defaultBeans,
  defaultBrewMethods,
  savedRecipeBrewMethod = null,
  repository,
  beanRepository,
  onBeansReplaced,
}) {
  const repositoryRef = useRef(null);
  if (!repositoryRef.current) {
    repositoryRef.current = repository || createCoffeeRepository();
  }
  const beanRepositoryRef = useRef(null);
  if (!beanRepositoryRef.current) {
    beanRepositoryRef.current = beanRepository || createSupabaseBeanRepository();
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

  const initialStateRef = useRef(null);
  if (!initialStateRef.current) {
    initialStateRef.current = repositoryRef.current.getLocalInitialState({
      defaultBeans: defaultState.beans,
      defaultBrewMethods: defaultState.brewMethods,
    });
  }
  const initialState = initialStateRef.current;

  const [beans, setBeans] = useState(() => initialState.beans);
  const [brewMethods, setBrewMethods] = useState(() => initialState.brewMethods);
  const [selectedBrewMethodId, setSelectedBrewMethodId] = useState(() => initialState.selectedBrewMethodId);
  const [recipeSeries, setRecipeSeries] = useState(() => initialState.recipeSeries);
  const [storageMode, setStorageMode] = useState("local");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [masterSaveStatus, setMasterSaveStatus] = useState({ beans: "saved", brewMethods: "saved" });
  const savedBeansSnapshot = useRef(serializeMaster(initialState.beans));
  const savedBrewMethodsSnapshot = useRef(serializeMaster(initialState.brewMethods));

  const beansDirty = serializeMaster(beans) !== savedBeansSnapshot.current;
  const brewMethodsDirty = serializeMaster(brewMethods) !== savedBrewMethodsSnapshot.current;

  useEffect(() => {
    let cancelled = false;

    async function loadState() {
      setLoading(true);
      try {
        const state = await repositoryRef.current.loadInitialState({
          defaultBeans: defaultState.beans,
          defaultBrewMethods: defaultState.brewMethods,
        });
        if (cancelled) return;
        savedBrewMethodsSnapshot.current = serializeMaster(state.brewMethods);
        setStorageMode(state.storageMode);
        setMasterSaveStatus({ beans: "saved", brewMethods: "saved" });
        setSaveError(null);
        setBrewMethods(state.brewMethods);
        setSelectedBrewMethodId(state.selectedBrewMethodId);
        setRecipeSeries(state.recipeSeries);

        try {
          const supabaseBeans = await beanRepositoryRef.current.getBeans();
          if (cancelled) return;
          savedBeansSnapshot.current = serializeMaster(supabaseBeans);
          setLoadError(null);
          setBeans(supabaseBeans);
          onBeansReplacedRef.current?.(supabaseBeans);
        } catch (error) {
          if (cancelled) return;
          setLoadError(error);
          setBeans([]);
          onBeansReplacedRef.current?.([]);
        }
      } catch (error) {
        if (cancelled) return;
        setStorageMode("local");
        setMasterSaveStatus({ beans: "saved", brewMethods: "saved" });
        setLoadError(error);
        setBeans([]);
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

  useEffect(() => {
    repositoryRef.current.saveBrewMethodsLocal(brewMethods);
  }, [brewMethods]);

  useEffect(() => {
    const selectedSavedRecipeMethod = savedRecipeBrewMethod?.id === selectedBrewMethodId;
    repositoryRef.current.saveSelectedBrewMethod(selectedBrewMethodId, {
      selectedSavedRecipeMethod,
      existsInSavedBrewMethods: snapshotHasId(savedBrewMethodsSnapshot.current, selectedBrewMethodId),
    });
  }, [selectedBrewMethodId, savedRecipeBrewMethod]);

  useEffect(() => {
    repositoryRef.current.saveRecipeSeries(recipeSeries);
  }, [recipeSeries]);

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
    const saved = await saveMaster(
      "brewMethods",
      () => repositoryRef.current.saveBrewMethodsMaster(brewMethods),
      brewMethods,
      savedBrewMethodsSnapshot,
    );
    if (saved && snapshotHasId(savedBrewMethodsSnapshot.current, selectedBrewMethodId)) {
      repositoryRef.current.queueSelectedBrewMethodSave(selectedBrewMethodId);
    }
    return saved;
  }, [brewMethods, selectedBrewMethodId]);

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

  async function saveMaster(key, saveRemote, data, snapshotRef) {
    setMasterSaveStatus((current) => ({ ...current, [key]: "saving" }));
    try {
      await saveRemote();
      snapshotRef.current = serializeMaster(data);
      setSaveError(null);
      setMasterSaveStatus((current) => ({ ...current, [key]: "saved" }));
      return true;
    } catch (error) {
      console.error(`Failed to save ${key}`, error);
      setSaveError(error);
      setMasterSaveStatus((current) => ({ ...current, [key]: "error" }));
      return false;
    }
  }

  return {
    beans,
    brewMethods,
    recipeSeries,
    selectedBrewMethodId,
    storageMode,
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
    saveBeansMaster,
    createBeanMaster,
    deleteBeanMaster,
    saveBrewMethodsMaster,
    revertBeansMaster,
    revertBrewMethodsMaster,
  };
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
