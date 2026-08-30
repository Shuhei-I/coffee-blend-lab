export function buildRecipeComparisonDraft({
  blendBeans = [],
  doseGram = null,
  brewRatio = null,
  grindSize = "",
  brewTemperatureC = null,
  brewMethod = null,
}) {
  return {
    ratios: blendBeans
      .filter((bean) => Number(bean.ratio) > 0)
      .map((bean) => ({
        id: bean.id,
        name: bean.name || bean.id,
        value: Number(bean.ratio) || 0,
        roastLevel: bean.roastLevel || "",
      })),
    doseGram: numberOrNull(doseGram),
    brewRatio: numberOrNull(brewRatio),
    grindSize: grindSize || "",
    brewTemperatureC: numberOrNull(brewTemperatureC),
    brewMethod: normalizeBrewMethod(brewMethod),
  };
}

export function resolveComparisonReferenceVersionId({ recipe, series } = {}) {
  if (!recipe?.id || series?.status === "archived") return "";
  return recipe.id;
}

export function compareRecipeDraftToVersion({ draft, reference } = {}) {
  if (!draft || !reference) return null;

  const blendChanges = compareBlendRatios(draft.ratios, reference.ratios);
  const brewChanges = compareBrewFields(draft, reference);

  return {
    reference,
    referenceLabel: `${reference.seriesName || reference.name || "レシピ"} v${reference.version}`,
    blendChanges,
    brewChanges,
    blendChangeCount: blendChanges.length,
    brewChangeCount: brewChanges.length,
    totalChangeCount: blendChanges.length + brewChanges.length,
  };
}

function compareBlendRatios(currentRatios = [], referenceRatios = []) {
  const currentById = new Map(currentRatios.map((ratio) => [ratio.id, ratio]));
  const referenceById = new Map((referenceRatios || []).map((ratio) => [ratio.id, ratio]));
  const ids = [...new Set([...referenceById.keys(), ...currentById.keys()])];
  const changes = [];

  ids.forEach((id) => {
    const current = currentById.get(id);
    const reference = referenceById.get(id);
    const name = current?.name || reference?.beanSnapshot?.name || reference?.name || id;
    const currentRatio = Number(current?.value) || 0;
    const referenceRatio = Number(reference?.value) || 0;

    if (currentRatio !== referenceRatio) {
      changes.push({
        key: `${id}-ratio`,
        label: `${name}の配合比率`,
        referenceValue: referenceRatio,
        currentValue: currentRatio,
        valueType: "ratio",
        delta: currentRatio - referenceRatio,
      });
    }

    const currentRoastLevel = current?.roastLevel || "";
    const referenceRoastLevel = reference?.roastLevel || "";
    if (currentRoastLevel !== referenceRoastLevel) {
      changes.push({
        key: `${id}-roast-level`,
        label: `${name}の焙煎度`,
        referenceValue: referenceRoastLevel,
        currentValue: currentRoastLevel,
        valueType: "roastLevel",
      });
    }
  });

  return changes;
}

function compareBrewFields(current, reference) {
  const fields = [
    ["doseGram", "粉量", "gram"],
    ["brewRatio", "抽出比率", "brewRatio"],
    ["grindSize", "挽き目", "grindSize"],
    ["brewTemperatureC", "湯温", "temperature"],
  ];
  const changes = fields
    .filter(([key]) => !comparisonValuesEqual(current[key], reference[key]))
    .map(([key, label, valueType]) => ({
      key,
      label,
      referenceValue: reference[key],
      currentValue: current[key],
      valueType,
    }));

  const currentMethod = normalizeBrewMethod(current.brewMethod);
  const referenceMethod = normalizeBrewMethod(reference.brewMethod || reference.brewMethodSnapshot);
  if (!comparisonValuesEqual(currentMethod.name, referenceMethod.name)) {
    changes.push({
      key: "brewMethod",
      label: "抽出方法",
      referenceValue: referenceMethod.name,
      currentValue: currentMethod.name,
      valueType: "text",
    });
  }
  if (!comparisonValuesEqual(currentMethod.equipmentName, referenceMethod.equipmentName)) {
    changes.push({
      key: "equipmentName",
      label: "抽出器具",
      referenceValue: referenceMethod.equipmentName,
      currentValue: currentMethod.equipmentName,
      valueType: "text",
    });
  }
  if (!comparisonValuesEqual(currentMethod.schedule, referenceMethod.schedule)) {
    changes.push({
      key: "brewSchedule",
      label: "投湯スケジュール",
      referenceValue: referenceMethod.schedule,
      currentValue: currentMethod.schedule,
      valueType: "text",
    });
  }

  return changes;
}

function normalizeBrewMethod(method) {
  const source = method || {};
  return {
    name: source.displayName || source.name || "",
    equipmentName: source.equipmentName || "",
    schedule: source.schedule || buildScheduleLabel(source),
  };
}

function buildScheduleLabel(method) {
  const steps = [
    ["蒸らし", "bloomPercent"],
    ["1投目", "pour1Percent"],
    ["2投目", "pour2Percent"],
    ["3投目", "pour3Percent"],
  ];
  const schedule = steps
    .map(([label, key]) => [label, Number(method[key]) || 0])
    .filter(([, percent]) => percent > 0)
    .map(([label, percent]) => `${label}${percent}%`);
  return schedule.join(" / ");
}

function comparisonValuesEqual(first, second) {
  if (first === null || first === undefined || first === "") {
    return second === null || second === undefined || second === "";
  }
  if (second === null || second === undefined || second === "") return false;
  if (typeof first === "number" || typeof second === "number") return Number(first) === Number(second);
  return first === second;
}

function numberOrNull(value) {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
