import { initialSensory } from "./sensory.js";
import { createSavedRecipeBrewMethod } from "./recipeSeries.js";

export function buildRecipeEditorState({ recipe, series, beans, brewMethods }) {
  const savedRecipeBrewMethod = createSavedRecipeBrewMethod(recipe);

  return {
    editorState: {
      blendName: series?.name || recipe.name,
      changeNote: "",
      doseGram: recipe.doseGram || 20,
      brewRatio: recipe.brewRatio || 16,
      savedRecipeBrewMethod,
      editingRecipeSource: { seriesId: recipe.seriesId || series?.id, versionId: recipe.id },
      sensory: { ...initialSensory, ...(recipe.sensory || {}) },
      memo: recipe.memo || "",
      blendRatios: buildBlendRatiosFromRecipe(recipe, beans),
      blendRoastLevels: buildBlendRoastLevelsFromRecipe(recipe, beans),
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

function getLoadedBrewMethodId(recipe, savedRecipeBrewMethod, brewMethods) {
  if (savedRecipeBrewMethod) return savedRecipeBrewMethod.id;
  if (recipe.brewMethodId && brewMethods.some((method) => method.id === recipe.brewMethodId)) {
    return recipe.brewMethodId;
  }
  return undefined;
}
