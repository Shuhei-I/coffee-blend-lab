import { initialSensory } from "./sensory.js";
import { createSavedRecipeBrewMethod } from "./recipeSeries.js";

export function buildRecipeEditorState({ recipe, series, beans, brewMethods }) {
  const savedRecipeBrewMethod = createSavedRecipeBrewMethod(recipe);

  return {
    editorState: {
      blendName: series?.name || recipe.name,
      blendGoal: series?.goal || "",
      changeNote: recipe.changeNote || "",
      doseGram: recipe.doseGram || 20,
      brewRatio: recipe.brewRatio || 16,
      grindSize: recipe.grindSize || "",
      brewTemperatureC: recipe.brewTemperatureC ?? 90,
      savedRecipeBrewMethod,
      editingRecipeSource: { seriesId: recipe.seriesId || series?.id, versionId: recipe.id },
      sensory: { ...initialSensory, ...(recipe.sensory || {}) },
      memo: recipe.memo || "",
      blendRatios: buildBlendRatiosFromRecipe(recipe, beans),
      blendRoastLevels: buildBlendRoastLevelsFromRecipe(recipe, beans),
      selectedBlendBeanIds: buildSelectedBlendBeanIdsFromRecipe(recipe, beans),
    },
    selectedBrewMethodId: getLoadedBrewMethodId(recipe, savedRecipeBrewMethod, brewMethods),
  };
}

export function buildBlendRatiosFromRecipe(recipe, beans) {
  return Object.fromEntries(
    beans.map((bean) => {
      const ratio = recipe.ratios.find((item) => item.id === bean.id);
      return [bean.id, ratio ? ratio.value : 0];
    }),
  );
}

export function buildBlendRoastLevelsFromRecipe(recipe, beans) {
  return Object.fromEntries(
    beans.map((bean) => {
      const ratio = recipe.ratios.find((item) => item.id === bean.id);
      return [bean.id, ratio?.roastLevel || ""];
    }),
  );
}

export function buildSelectedBlendBeanIdsFromRecipe(recipe, beans) {
  const beanIds = new Set(beans.map((bean) => bean.id));
  return recipe.ratios
    .filter((item) => beanIds.has(item.id) && Number(item.value) > 0)
    .map((item) => item.id);
}

function getLoadedBrewMethodId(recipe, savedRecipeBrewMethod, brewMethods) {
  if (savedRecipeBrewMethod) return savedRecipeBrewMethod.id;
  if (recipe.brewMethodId && brewMethods.some((method) => method.id === recipe.brewMethodId)) {
    return recipe.brewMethodId;
  }
  return undefined;
}
