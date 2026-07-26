const beanColors = ["#12656b", "#b85243", "#54745a", "#c38b2d", "#6a5f99"];

export function updateBean(beans, beanId, patch) {
  return beans.map((bean) => (bean.id === beanId ? { ...bean, ...patch } : bean));
}

export function updateBeanProfile(beans, beanId, profileKey, value) {
  return beans.map((bean) =>
    bean.id === beanId
      ? {
          ...bean,
          profile: { ...bean.profile, [profileKey]: Math.max(0, Math.min(100, Number(value) || 0)) },
        }
      : bean,
  );
}

export function createBean({ id, index }) {
  return {
    id,
    name: "新しい豆",
    note: "特徴を入力",
    color: beanColors[index % beanColors.length],
    ratio: 0,
    visibleInRecipes: true,
    costPerKg: 0,
    profile: { acidity: 50, sweetness: 50, bitterness: 50, body: 50, aroma: 50 },
  };
}

export function canDeleteBean(beans) {
  return beans.length > 1;
}

export function deleteBeanById(beans, beanId) {
  return beans.filter((bean) => bean.id !== beanId);
}
