import { initialSensory } from "./sensory.js";
import { createSavedRecipeBrewMethod } from "./recipeSeries.js";

export function buildRecipeEditorState({ recipe, series, beans, brewMethods }) {
  const savedRecipeBrewMethod = createSavedRecipeBrewMethod(recipe);
  const snapshotOnlyBeans = buildSnapshotOnlyBeansFromRecipe(recipe, beans);
  const editorBeans = [...beans, ...snapshotOnlyBeans];

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
      snapshotOnlyBeans,
      blendRatios: buildBlendRatiosFromRecipe(recipe, editorBeans),
      blendRoastLevels: buildBlendRoastLevelsFromRecipe(recipe, editorBeans),
      selectedBlendBeanIds: buildSelectedBlendBeanIdsFromRecipe(recipe, editorBeans),
    },
    selectedBrewMethodId: getLoadedBrewMethodId(recipe, savedRecipeBrewMethod, brewMethods),
  };
}

export function buildSnapshotOnlyBeansFromRecipe(recipe, beans) {
  const currentBeanIds = new Set(beans.map((bean) => bean.id));

  return (recipe.ratios || [])
    .map((ratio, index) => {
      const snapshot = ratio.beanSnapshot && typeof ratio.beanSnapshot === "object" ? ratio.beanSnapshot : {};
      const id = ratio.id || snapshot.id || `snapshot-bean-${index}`;
      if (currentBeanIds.has(id) || Number(ratio.value) <= 0) return null;

      return {
        id,
        name: snapshot.name || "保存時点の豆",
        note: snapshot.note || "",
        color: snapshot.color || "#8a7865",
        ratio: 0,
        visibleInRecipes: false,
        costPerKg: Number(snapshot.costPerKg) || 0,
        profile: normalizeProfile(snapshot.profile),
        roasterName: snapshot.roasterName || "",
        origin: snapshot.origin || "",
        processMethod: snapshot.processMethod || "",
        defaultRoastLevel: snapshot.defaultRoastLevel || "",
        roastedAt: snapshot.roastedAt || "",
        purchasedAt: snapshot.purchasedAt || "",
        purchasePlace: snapshot.purchasePlace || "",
        purchaseUrl: snapshot.purchaseUrl || "",
        packageWeightGram: Number(snapshot.packageWeightGram) || 0,
        purchasePrice: Number(snapshot.purchasePrice) || 0,
        isSnapshotOnly: true,
      };
    })
    .filter(Boolean);
}

export function buildBlendRatiosFromRecipe(recipe, beans) {
  const ratiosByBeanId = buildRatiosByBeanId(recipe);
  return Object.fromEntries(
    beans.map((bean) => {
      const ratio = ratiosByBeanId.get(bean.id);
      return [bean.id, ratio ? ratio.value : 0];
    }),
  );
}

export function buildBlendRoastLevelsFromRecipe(recipe, beans) {
  const ratiosByBeanId = buildRatiosByBeanId(recipe);
  return Object.fromEntries(
    beans.map((bean) => {
      const ratio = ratiosByBeanId.get(bean.id);
      return [bean.id, ratio?.roastLevel || ""];
    }),
  );
}

export function buildSelectedBlendBeanIdsFromRecipe(recipe, beans) {
  const beanIds = new Set(beans.map((bean) => bean.id));
  return recipe.ratios
    .map((item, index) => ({ item, id: getRecipeRatioBeanId(item, index) }))
    .filter(({ item, id }) => beanIds.has(id) && Number(item.value) > 0)
    .map(({ id }) => id);
}

function buildRatiosByBeanId(recipe) {
  return new Map((recipe.ratios || []).map((ratio, index) => [getRecipeRatioBeanId(ratio, index), ratio]));
}

function getRecipeRatioBeanId(ratio, index) {
  return ratio.id || ratio.beanSnapshot?.id || `snapshot-bean-${index}`;
}

function normalizeProfile(profile = {}) {
  return {
    acidity: Number(profile.acidity) || 50,
    sweetness: Number(profile.sweetness) || 50,
    bitterness: Number(profile.bitterness) || 50,
    body: Number(profile.body) || 50,
    aroma: Number(profile.aroma) || 50,
  };
}

function getLoadedBrewMethodId(recipe, savedRecipeBrewMethod, brewMethods) {
  if (savedRecipeBrewMethod) return savedRecipeBrewMethod.id;
  if (recipe.brewMethodId && brewMethods.some((method) => method.id === recipe.brewMethodId)) {
    return recipe.brewMethodId;
  }
  return undefined;
}
