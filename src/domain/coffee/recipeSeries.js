export function normalizeRecipeSeries(seriesList, legacyRecipes = []) {
  if (Array.isArray(seriesList) && seriesList.length > 0) {
    return seriesList.map((series) => ({
      ...series,
      status: series.status || "active",
      versions: sortVersions((series.versions || []).map((version) => normalizeRecipeVersion(version, series))),
    }));
  }

  return normalizeLegacyRecipes(legacyRecipes);
}

export function normalizeLegacyRecipes(legacyRecipes = []) {
  return (legacyRecipes || []).map((recipe) => ({
    id: recipe.seriesId || `series-${recipe.id || recipe.name}`,
    name: recipe.name || "無題のシリーズ",
    goal: "",
    status: "active",
    currentVersionId: recipe.id,
    createdAt: recipe.savedAt,
    updatedAt: recipe.savedAt,
    versions: [
      {
        ...recipe,
        seriesId: recipe.seriesId || `series-${recipe.id || recipe.name}`,
        version: Number(recipe.version) || 1,
        changeNote: recipe.changeNote || "既存レシピから移行",
      },
    ],
  }));
}

export function normalizeRecipeVersion(version, series) {
  return {
    ...version,
    seriesId: version.seriesId || series.id,
    version: Number(version.version) || 1,
  };
}

export function flattenRecipeSeries(seriesList) {
  return seriesList.flatMap((series) => series.versions.map((version) => ({ ...version, seriesName: series.name })));
}

export function saveRecipeVersion(seriesList, currentSeries, recipe, savedAt) {
  if (!currentSeries) {
    return [
      {
        id: recipe.seriesId,
        name: recipe.name,
        goal: "",
        status: "active",
        currentVersionId: recipe.id,
        createdAt: savedAt,
        updatedAt: savedAt,
        versions: [recipe],
      },
      ...seriesList,
    ];
  }

  return seriesList.map((series) =>
    series.id === currentSeries.id
      ? {
          ...series,
          name: recipe.name || series.name,
          status: "active",
          currentVersionId: recipe.id,
          updatedAt: savedAt,
          versions: sortVersions([recipe, ...series.versions]),
        }
      : series,
  );
}

export function archiveRecipeSeriesData(seriesList, seriesId, updatedAt) {
  return seriesList.map((series) =>
    series.id === seriesId
      ? { ...series, status: "archived", updatedAt }
      : series,
  );
}

export function restoreRecipeSeriesData(seriesList, seriesId, updatedAt) {
  return seriesList.map((series) =>
    series.id === seriesId
      ? { ...series, status: "active", updatedAt }
      : series,
  );
}

export function deleteRecipeVersionData(seriesList, seriesId, versionId, updatedAt) {
  return seriesList.map((series) => {
    if (series.id !== seriesId || series.versions.length <= 1) return series;

    const versions = sortVersions(series.versions.filter((recipe) => recipe.id !== versionId));
    if (versions.length === series.versions.length) return series;

    const latest = versions[0];
    return {
      ...series,
      currentVersionId: series.currentVersionId === versionId ? latest.id : series.currentVersionId,
      updatedAt,
      versions,
    };
  });
}

export function sortVersions(versions) {
  return [...versions].sort((a, b) => (Number(b.version) || 0) - (Number(a.version) || 0));
}

export function getLatestVersion(series) {
  return sortVersions(series.versions || [])[0] || null;
}

export function getNextSeriesVersion(series) {
  return Math.max(0, ...(series.versions || []).map((version) => Number(version.version) || 0)) + 1;
}

export function createRecipeVersionData({
  recipeSeries,
  editingRecipeSource,
  blendName,
  changeNote,
  blendBeans,
  doseGram,
  brewRatio,
  targetBrewGram,
  blendCost,
  selectedBrewMethod,
  sensory,
  memo,
  now,
  idSeed,
  seriesIdSeed = idSeed,
  versionIdSeed = idSeed,
}) {
  const seriesId = editingRecipeSource?.seriesId || `series-${seriesIdSeed}`;
  const currentSeries = recipeSeries.find((series) => series.id === seriesId);
  const version = currentSeries ? getNextSeriesVersion(currentSeries) : 1;
  const versionId = `recipe-${versionIdSeed}`;
  const recipe = {
    seriesId,
    id: versionId,
    name: blendName.trim() || currentSeries?.name || "無題のブレンド",
    version,
    changeNote: changeNote.trim() || (version === 1 ? "初回作成" : ""),
    ratios: blendBeans.map((bean) => ({
      id: bean.id,
      value: bean.ratio,
      beanSnapshot: snapshotBean(bean),
    })),
    doseGram,
    brewRatio,
    targetBrewGram,
    blendCost,
    brewMethodId: getRecipeBrewMethodId(selectedBrewMethod),
    brewMethodSnapshot: snapshotBrewMethod(selectedBrewMethod),
    sensory,
    memo: memo.trim(),
    savedAt: now,
  };

  return { recipe, currentSeries };
}

export function getRecipeBrewMethodId(method) {
  return method?.sourceBrewMethodId || method?.id || null;
}

export function snapshotBrewMethod(method) {
  if (!method) return null;
  const { displayName, sourceBrewMethodId, ...snapshot } = method;
  return {
    ...snapshot,
    id: sourceBrewMethodId || snapshot.id,
  };
}

export function createSavedRecipeBrewMethod(recipe) {
  if (!recipe.brewMethodSnapshot) return null;
  const sourceBrewMethodId = recipe.brewMethodId || recipe.brewMethodSnapshot.id;
  return {
    ...recipe.brewMethodSnapshot,
    id: `saved-brew-${recipe.id || recipe.savedAt || sourceBrewMethodId}`,
    sourceBrewMethodId,
    displayName: `${recipe.brewMethodSnapshot.name}（保存時）`,
  };
}

export function getRecipeBrewMethod(recipe, brewMethods) {
  return recipe.brewMethodSnapshot || brewMethods.find((method) => method.id === recipe.brewMethodId) || null;
}

export function snapshotBean(bean) {
  if (!bean) return null;
  return {
    id: bean.id,
    name: bean.name,
    note: bean.note,
    color: bean.color,
    visibleInRecipes: bean.visibleInRecipes !== false,
    costPerKg: bean.costPerKg,
    profile: bean.profile,
  };
}

export function getRecipeBean(ratio, beans) {
  return ratio.beanSnapshot || beans.find((bean) => bean.id === ratio.id) || null;
}
