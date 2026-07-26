import { useCallback, useEffect, useRef, useState } from "react";
import { createCoffeeRepository } from "../data/coffeeRepository.js";
import { parseSnapshot, serializeMaster, snapshotHasId } from "../data/localStorageRepository.js";
import { createDefaultCoffeeState } from "../domain/defaultCoffeeData.js";

export function useCoffeeData({
  defaultBeans,
  defaultBrewMethods,
  savedRecipeBrewMethod = null,
  repository,
  onBeansReplaced,
}) {
  const repositoryRef = useRef(null);
  if (!repositoryRef.current) {
    repositoryRef.current = repository || createCoffeeRepository();
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

    setLoading(true);
    repositoryRef.current
      .loadInitialState({ defaultBeans: defaultState.beans, defaultBrewMethods: defaultState.brewMethods })
      .then((state) => {
        if (cancelled) return;
        savedBeansSnapshot.current = serializeMaster(state.beans);
        savedBrewMethodsSnapshot.current = serializeMaster(state.brewMethods);
        setStorageMode(state.storageMode);
        setMasterSaveStatus({ beans: "saved", brewMethods: "saved" });
        setSaveError(null);
        setLoadError(null);
        setBeans(state.beans);
        onBeansReplacedRef.current?.(state.beans);
        setBrewMethods(state.brewMethods);
        setSelectedBrewMethodId(state.selectedBrewMethodId);
        setRecipeSeries(state.recipeSeries);
      })
      .catch((error) => {
        if (cancelled) return;
        setStorageMode("local");
        setMasterSaveStatus({ beans: "saved", brewMethods: "saved" });
        setLoadError(error);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [defaultState.beans, defaultState.brewMethods]);

  useEffect(() => {
    repositoryRef.current.saveBeansLocal(beans);
  }, [beans]);

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
    return saveMaster("beans", () => repositoryRef.current.saveBeansMaster(beans), beans, savedBeansSnapshot);
  }, [beans]);

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
    saveBrewMethodsMaster,
    revertBeansMaster,
    revertBrewMethodsMaster,
  };
}
