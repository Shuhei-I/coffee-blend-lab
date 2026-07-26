export function createBrewMethod({ id }) {
  return {
    id,
    name: "新しい淹れ方",
    note: "抽出意図を入力",
    bloomPercent: 12,
    pour1Percent: 28,
    pour2Percent: 30,
    pour3Percent: 30,
    bloomSeconds: 30,
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
