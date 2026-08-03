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
  const [savedRecipeBrewMethod, setSavedRecipeBrewMethod] = useState(null);
  const [editingRecipeSource, setEditingRecipeSource] = useState(null);
  const [sensory, setSensory] = useState(initialSensory);
  const [memo, setMemo] = useState("");
  const [blendRatios, setBlendRatios] = useState(() => emptyRatios(initialBeans));
  const [blendRoastLevels, setBlendRoastLevels] = useState(() => emptyRoastLevels(initialBeans));

  function updateRatio(id, ratio) {
    setBlendRatios((current) => ({
      ...current,
      [id]: Math.max(0, Math.min(100, Number(ratio) || 0)),
    }));
  }

  function updateRoastLevel(id, roastLevel) {
    setBlendRoastLevels((current) => ({ ...current, [id]: roastLevel }));
  }

  function normalizeRatios(blendBeans, total) {
    if (!blendBeans.length) return;
    setBlendRatios(normalizeBlendRatios(blendBeans, total));
  }

  function resetEditor(beans) {
    setBlendName("");
    setBlendGoal("");
    setChangeNote("");
    setBlendRatios(emptyRatios(beans));
    setBlendRoastLevels(emptyRoastLevels(beans));
    setDoseGram(20);
    setBrewRatio(16);
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
    setSavedRecipeBrewMethod(nextState.savedRecipeBrewMethod);
    setEditingRecipeSource(nextState.editingRecipeSource);
    setSensory(nextState.sensory);
    setMemo(nextState.memo);
    setBlendRatios(nextState.blendRatios);
    setBlendRoastLevels(nextState.blendRoastLevels || {});
  }

  function replaceBlendRatiosForBeans(beans) {
    setBlendRatios(emptyRatios(beans));
    setBlendRoastLevels(emptyRoastLevels(beans));
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
    updateRatio,
    updateRoastLevel,
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
