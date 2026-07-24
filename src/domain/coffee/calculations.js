export const profileKeys = ["acidity", "sweetness", "bitterness", "body", "aroma"];

export function calculateBlendTotal(beans) {
  return beans.reduce((sum, bean) => sum + bean.ratio, 0);
}

export function normalizeBlendRatios(beans, total = calculateBlendTotal(beans)) {
  if (!beans.length) return {};

  if (!total) {
    const equal = Math.floor(100 / beans.length);
    return Object.fromEntries(beans.map((bean, index) => [
      bean.id,
      index === beans.length - 1 ? 100 - equal * (beans.length - 1) : equal,
    ]));
  }

  let running = 0;
  return Object.fromEntries(
    beans.map((bean, index) => {
      const ratio = index === beans.length - 1 ? 100 - running : Math.round((bean.ratio / total) * 100);
      running += ratio;
      return [bean.id, ratio];
    }),
  );
}

export function calculateBeanDoseGram(bean, total, doseGram) {
  const divisor = total || 1;
  return (doseGram * bean.ratio) / divisor;
}

export function calculateTargetBrewGram(doseGram, brewRatio) {
  return Math.round(doseGram * brewRatio);
}

export function buildProfile(beans, total, keys = profileKeys) {
  const divisor = total || 1;
  return keys.reduce((profile, key) => {
    profile[key] = Math.round(beans.reduce((sum, bean) => sum + bean.profile[key] * (bean.ratio / divisor), 0));
    return profile;
  }, {});
}

export function buildBlendCost(beans, total, doseGram) {
  const divisor = total || 1;
  return beans.reduce((sum, bean) => {
    const beanGram = (doseGram * bean.ratio) / divisor;
    return sum + beanGram * ((Number(bean.costPerKg) || 0) / 1000);
  }, 0);
}

export function getPourTotal(method) {
  if (!method) return 0;
  return ["bloomPercent", "pour1Percent", "pour2Percent", "pour3Percent"].reduce(
    (sum, key) => sum + (Number(method[key]) || 0),
    0,
  );
}

export function calculatePourSchedule(method, targetBrewGram) {
  if (!method) return [];

  const steps = [
    ["蒸らし", method.bloomPercent, `${method.bloomSeconds}秒`],
    ["1投目", method.pour1Percent, ""],
    ["2投目", method.pour2Percent, ""],
    ["3投目", method.pour3Percent, ""],
  ];
  let cumulativeGram = 0;

  return steps.map(([label, percent, sub]) => {
    const stepGram = Math.round((targetBrewGram * (Number(percent) || 0)) / 100);
    cumulativeGram += stepGram;
    return { label, percent, sub, stepGram, cumulativeGram };
  });
}

export function normalizePercent(value) {
  return Math.max(0, Math.min(100, Number(value) || 0));
}
