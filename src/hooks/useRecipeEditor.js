import { useState } from "react";
import { normalizeBlendRatios } from "../domain/coffee/calculations.js";
import { initialSensory } from "../domain/coffee/sensory.js";

export { initialSensory } from "../domain/coffee/sensory.js";

export function useRecipeEditor({ initialBeans = [] } = {}) {
  const [blendName, setBlendName] = useState("");
  const [blendGoal, setBlendGoal] = useState("");
  const [changeNote, setChangeNote] = useState("");
  const [doseGram, setDoseGram] = useState(20);
  const [brewRatio, setBrewRatio] = useState(16);
  const [grindSize, setGrindSize] = useState("");
  const [brewTemperatureC, setBrewTemperatureC] = useState(90);
  const [savedRecipeBrewMethod, setSavedRecipeBrewMethod] = useState(null);
  const [editingRecipeSource, setEditingRecipeSource] = useState(null);
  const [sensory, setSensory] = useState(initialSensory);
  const [memo, setMemo] = useState("");
  const [blendRatios, setBlendRatios] = useState(() => emptyRatios(initialBeans));
  const [blendRoastLevels, setBlendRoastLevels] = useState(() => emptyRoastLevels(initialBeans));
  const [selectedBlendBeanIds, setSelectedBlendBeanIds] = useState([]);

  function updateRatio(id, ratio) {
    const nextRatio = Math.max(0, Math.min(100, Number(ratio) || 0));
    setBlendRatios((current) => ({
      ...current,
      [id]: nextRatio,
    }));
    if (nextRatio > 0) selectBlendBean(id);
  }

  function updateRoastLevel(id, roastLevel) {
    setBlendRoastLevels((current) => ({ ...current, [id]: roastLevel }));
  }

  function selectBlendBean(id) {
    setSelectedBlendBeanIds((current) => (current.includes(id) ? current : [...current, id]));
  }

  function removeBlendBean(id) {
    setSelectedBlendBeanIds((current) => current.filter((item) => item !== id));
    setBlendRatios((current) => ({ ...current, [id]: 0 }));
    setBlendRoastLevels((current) => ({ ...current, [id]: "" }));
  }

  function normalizeRatios(blendBeans, total) {
    if (!blendBeans.length) return;
    setBlendRatios(normalizeBlendRatios(blendBeans, total));
    setSelectedBlendBeanIds((current) => mergeUnique(current, blendBeans.map((bean) => bean.id)));
  }

  function resetEditor(beans) {
    setBlendName("");
    setBlendGoal("");
    setChangeNote("");
    setBlendRatios(emptyRatios(beans));
    setBlendRoastLevels(emptyRoastLevels(beans));
    setSelectedBlendBeanIds([]);
    setDoseGram(20);
    setBrewRatio(16);
    setGrindSize("");
    setBrewTemperatureC(90);
    setSavedRecipeBrewMethod(null);
    setEditingRecipeSource(null);
    setSensory(initialSensory);
    setMemo("");
  }

  function replaceEditorState(nextState) {
    setBlendName(nextState.blendName);
    setBlendGoal(nextState.blendGoal || "");
    setChangeNote(nextState.changeNote);
    setDoseGram(nextState.doseGram);
    setBrewRatio(nextState.brewRatio);
    setGrindSize(nextState.grindSize || "");
    setBrewTemperatureC(nextState.brewTemperatureC ?? 90);
    setSavedRecipeBrewMethod(nextState.savedRecipeBrewMethod);
    setEditingRecipeSource(nextState.editingRecipeSource);
    setSensory(nextState.sensory);
    setMemo(nextState.memo);
    setBlendRatios(nextState.blendRatios);
    setBlendRoastLevels(nextState.blendRoastLevels || {});
    setSelectedBlendBeanIds(nextState.selectedBlendBeanIds || selectedBeanIdsFromRatios(nextState.blendRatios));
  }

  function replaceBlendRatiosForBeans(beans) {
    setBlendRatios(emptyRatios(beans));
    setBlendRoastLevels(emptyRoastLevels(beans));
    setSelectedBlendBeanIds([]);
  }

  function clearSavedRecipeBrewMethodIfDifferent(id) {
    if (savedRecipeBrewMethod?.id !== id) {
      setSavedRecipeBrewMethod(null);
    }
  }

  return {
    blendName,
    setBlendName,
    blendGoal,
    setBlendGoal,
    changeNote,
    setChangeNote,
    doseGram,
    setDoseGram,
    brewRatio,
    setBrewRatio,
    grindSize,
    setGrindSize,
    brewTemperatureC,
    setBrewTemperatureC,
    savedRecipeBrewMethod,
    setSavedRecipeBrewMethod,
    editingRecipeSource,
    setEditingRecipeSource,
    sensory,
    setSensory,
    memo,
    setMemo,
    blendRatios,
    setBlendRatios,
    blendRoastLevels,
    setBlendRoastLevels,
    selectedBlendBeanIds,
    updateRatio,
    updateRoastLevel,
    selectBlendBean,
    removeBlendBean,
    normalizeRatios,
    resetEditor,
    replaceEditorState,
    replaceBlendRatiosForBeans,
    clearSavedRecipeBrewMethodIfDifferent,
  };
}

function emptyRatios(beans) {
  return Object.fromEntries(beans.map((bean) => [bean.id, 0]));
}

function emptyRoastLevels(beans) {
  return Object.fromEntries(beans.map((bean) => [bean.id, ""]));
}

function selectedBeanIdsFromRatios(ratios = {}) {
  return Object.entries(ratios)
    .filter(([, ratio]) => Number(ratio) > 0)
    .map(([id]) => id);
}

function mergeUnique(first = [], second = []) {
  return [...new Set([...first, ...second])];
}
