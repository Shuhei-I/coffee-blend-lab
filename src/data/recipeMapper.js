export function toRecipeSeries(seriesRows = [], versionRows = [], beanRows = []) {
  const beansByVersionId = groupBy(beanRows, "recipe_version_id");
  const versionsBySeriesId = groupBy(versionRows, "series_id");

  return seriesRows.map((seriesRow) => {
    const versions = sortVersionRows(versionsBySeriesId.get(seriesRow.id) || []).map((versionRow) =>
      toRecipeVersion(versionRow, beansByVersionId.get(versionRow.id) || []),
    );

    return {
      id: seriesRow.id,
      name: seriesRow.name || "",
      goal: seriesRow.goal || "",
      status: seriesRow.status || "active",
      currentVersionId: versions[0]?.id || null,
      createdAt: seriesRow.created_at,
      updatedAt: seriesRow.updated_at,
      versions,
    };
  });
}

export function toRecipeVersion(versionRow, beanRows = []) {
  return {
    id: versionRow.id,
    seriesId: versionRow.series_id,
    version: Number(versionRow.version_number) || 1,
    name: versionRow.name || "",
    changeNote: versionRow.change_note || "",
    ratios: sortBeanRows(beanRows).map(toRecipeVersionBean),
    doseGram: Number(versionRow.dose_gram) || 0,
    brewRatio: Number(versionRow.brew_ratio) || 0,
    targetBrewGram: Number(versionRow.target_brew_gram) || 0,
    blendCost: Number(versionRow.blend_cost) || 0,
    brewMethodId: versionRow.brew_method_id || null,
    brewMethodSnapshot: versionRow.brew_method_snapshot ?? null,
    sensory: versionRow.sensory ?? {},
    memo: versionRow.tasting_note || "",
    savedAt: versionRow.saved_at,
    createdAt: versionRow.created_at,
    updatedAt: versionRow.updated_at,
  };
}

export function toRecipeVersionBean(beanRow) {
  return {
    id: beanRow.bean_id || null,
    value: Number(beanRow.ratio) || 0,
    roastLevel: beanRow.roast_level || "",
    beanSnapshot: beanRow.bean_snapshot ?? {},
  };
}

export function toSavePayload(recipeInput) {
  const ratios = recipeInput.beans || recipeInput.ratios || [];

  return {
    seriesId: recipeInput.seriesId ?? recipeInput.editingRecipeSource?.seriesId ?? null,
    seriesName: recipeInput.seriesName ?? recipeInput.name ?? recipeInput.blendName ?? "",
    goal: recipeInput.goal ?? "",
    name: recipeInput.name ?? recipeInput.blendName ?? "",
    changeNote: recipeInput.changeNote ?? "",
    tastingNote: recipeInput.tastingNote ?? recipeInput.memo ?? "",
    doseGram: recipeInput.doseGram,
    brewRatio: recipeInput.brewRatio,
    targetBrewGram: recipeInput.targetBrewGram,
    blendCost: recipeInput.blendCost,
    brewMethodId: normalizeNullableId(recipeInput.brewMethodId),
    brewMethodSnapshot: recipeInput.brewMethodSnapshot ?? null,
    sensory: recipeInput.sensory ?? {},
    savedAt: recipeInput.savedAt ?? null,
    beans: ratios.map((ratio, index) => ({
      beanId: ratio.beanId ?? ratio.id ?? null,
      ratio: ratio.ratio ?? ratio.value,
      roastLevel: ratio.roastLevel ?? "",
      beanSnapshot: ratio.beanSnapshot ?? {},
      position: index,
    })),
  };
}

function normalizeNullableId(value) {
  return value || null;
}

function groupBy(rows, key) {
  const groups = new Map();
  for (const row of rows || []) {
    const groupKey = row[key];
    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey).push(row);
  }
  return groups;
}

function sortVersionRows(rows) {
  return [...rows].sort((a, b) => {
    const byVersion = (Number(b.version_number) || 0) - (Number(a.version_number) || 0);
    if (byVersion !== 0) return byVersion;
    return String(b.saved_at || "").localeCompare(String(a.saved_at || ""));
  });
}

function sortBeanRows(rows) {
  return [...rows].sort((a, b) => (Number(a.position) || 0) - (Number(b.position) || 0));
}
