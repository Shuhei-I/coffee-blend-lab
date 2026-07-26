import { useState } from "react";
import { normalizeBlendRatios } from "../domain/coffee/calculations.js";

export const initialSensory = { fragrance: 7, flavor: 7, aftertaste: 7, balance: 7 };

export function useRecipeEditor({ initialBeans = [] } = {}) {
  const [blendName, setBlendName] = useState("");
  const [changeNote, setChangeNote] = useState("");
  const [doseGram, setDoseGram] = useState(20);
  const [brewRatio, setBrewRatio] = useState(16);
  const [savedRecipeBrewMethod, setSavedRecipeBrewMethod] = useState(null);
  const [editingRecipeSource, setEditingRecipeSource] = useState(null);
  const [sensory, setSensory] = useState(initialSensory);
  const [memo, setMemo] = useState("");
  const [blendRatios, setBlendRatios] = useState(() => emptyRatios(initialBeans));

  function updateRatio(id, ratio) {
    setBlendRatios((current) => ({
      ...current,
      [id]: Math.max(0, Math.min(100, Number(ratio) || 0)),
    }));
  }

  function normalizeRatios(blendBeans, total) {
    if (!blendBeans.length) return;
    setBlendRatios(normalizeBlendRatios(blendBeans, total));
  }

  function resetEditor(beans) {
    setBlendName("");
    setChangeNote("");
    setBlendRatios(emptyRatios(beans));
    setDoseGram(20);
    setBrewRatio(16);
    setSavedRecipeBrewMethod(null);
    setEditingRecipeSource(null);
    setSensory(initialSensory);
    setMemo("");
  }

  function replaceEditorState(nextState) {
    setBlendName(nextState.blendName);
    setChangeNote(nextState.changeNote);
    setDoseGram(nextState.doseGram);
    setBrewRatio(nextState.brewRatio);
    setSavedRecipeBrewMethod(nextState.savedRecipeBrewMethod);
    setEditingRecipeSource(nextState.editingRecipeSource);
    setSensory(nextState.sensory);
    setMemo(nextState.memo);
    setBlendRatios(nextState.blendRatios);
  }

  function replaceBlendRatiosForBeans(beans) {
    setBlendRatios(emptyRatios(beans));
  }

  function clearSavedRecipeBrewMethodIfDifferent(id) {
    if (savedRecipeBrewMethod?.id !== id) {
      setSavedRecipeBrewMethod(null);
    }
  }

  return {
    blendName,
    setBlendName,
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
    updateRatio,
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
