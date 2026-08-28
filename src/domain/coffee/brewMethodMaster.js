export function createBrewMethod({ id }) {
  return {
    id,
    name: "新しい淹れ方",
    note: "抽出意図を入力",
    extractionType: "",
    equipmentName: "",
    bloomPercent: 12,
    pour1Percent: 28,
    pour2Percent: 30,
    pour3Percent: 30,
    bloomSeconds: 30,
  };
}

export function createBrewMethodFromPublicSnapshot(method, { id }) {
  const defaults = createBrewMethod({ id });
  const extractionType = ["pour_over", "immersion", "pressure", "vacuum", "other"].includes(method?.extractionType)
    ? method.extractionType
    : "";

  return {
    ...defaults,
    name: String(method?.name || "公開された淹れ方").trim() || "公開された淹れ方",
    note: "",
    extractionType,
    equipmentName: String(method?.equipmentName || "").trim(),
    bloomPercent: normalizePublicNumber(method?.bloomPercent, defaults.bloomPercent, { max: 100 }),
    pour1Percent: normalizePublicNumber(method?.pour1Percent, defaults.pour1Percent, { max: 100 }),
    pour2Percent: normalizePublicNumber(method?.pour2Percent, defaults.pour2Percent, { max: 100 }),
    pour3Percent: normalizePublicNumber(method?.pour3Percent, defaults.pour3Percent, { max: 100 }),
    bloomSeconds: normalizePublicNumber(method?.bloomSeconds, defaults.bloomSeconds),
  };
}

export function updateBrewMethod(methods, methodId, patch) {
  return methods.map((method) => (method.id === methodId ? { ...method, ...patch } : method));
}

export function canDeleteBrewMethod(methods) {
  return methods.length > 1;
}

export function deleteBrewMethodById(methods, methodId) {
  return methods.filter((method) => method.id !== methodId);
}

export function getSelectedBrewMethodIdAfterDelete({ methods, deletedMethodId, selectedBrewMethodId }) {
  if (selectedBrewMethodId !== deletedMethodId) {
    return selectedBrewMethodId;
  }

  return deleteBrewMethodById(methods, deletedMethodId)[0]?.id;
}

export function deleteBrewMethodData({ methods, methodId, selectedBrewMethodId }) {
  const brewMethods = deleteBrewMethodById(methods, methodId);
  return {
    brewMethods,
    selectedBrewMethodId: getSelectedBrewMethodIdAfterDelete({
      methods,
      deletedMethodId: methodId,
      selectedBrewMethodId,
    }),
  };
}

function normalizePublicNumber(value, fallback, { max = Number.POSITIVE_INFINITY } = {}) {
  if (value === null || value === undefined || value === "") return fallback;
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(0, number));
}
