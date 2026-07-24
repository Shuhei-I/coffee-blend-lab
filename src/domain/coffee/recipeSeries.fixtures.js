export const fixtureBeans = [
  {
    id: "ethiopia",
    name: "エチオピア ナチュラル",
    note: "ベリー、花、明るい酸味",
    color: "#b85243",
    ratio: 60,
    visibleInRecipes: true,
    costPerKg: 5800,
    profile: { acidity: 86, sweetness: 78, bitterness: 32, body: 48, aroma: 92 },
  },
  {
    id: "brazil",
    name: "ブラジル No.2 Natural",
    note: "ナッツ、チョコ、丸い甘み",
    color: "#c38b2d",
    ratio: 40,
    visibleInRecipes: true,
    costPerKg: 3600,
    profile: { acidity: 38, sweetness: 82, bitterness: 48, body: 74, aroma: 58 },
  },
];

export const fixtureBrewMethod = {
  id: "standard-4-pour",
  name: "標準 4投式",
  note: "蒸らし後に3回で注ぐ基本レシピ",
  bloomPercent: 12,
  pour1Percent: 28,
  pour2Percent: 30,
  pour3Percent: 30,
  bloomSeconds: 30,
};

export const fixtureBeanSnapshots = fixtureBeans.map((bean) => ({
  id: bean.id,
  name: bean.name,
  note: bean.note,
  color: bean.color,
  visibleInRecipes: bean.visibleInRecipes !== false,
  costPerKg: bean.costPerKg,
  profile: bean.profile,
}));

export const legacyRecipeFixture = {
  id: "recipe-1700000000000",
  name: "Morning Blend",
  ratios: [
    { id: "ethiopia", value: 60, beanSnapshot: fixtureBeanSnapshots[0] },
    { id: "brazil", value: 40, beanSnapshot: fixtureBeanSnapshots[1] },
  ],
  doseGram: 20,
  brewRatio: 16,
  targetBrewGram: 320,
  blendCost: 98.4,
  brewMethodId: "standard-4-pour",
  brewMethodSnapshot: fixtureBrewMethod,
  sensory: { fragrance: 8, flavor: 7.5, aftertaste: 7, balance: 8 },
  memo: "明るい香りと丸い甘み",
  savedAt: "2026-05-17T09:00:00.000Z",
};

export const currentRecipeSeriesFixture = {
  id: "series-1700000000000",
  name: "Morning Blend",
  goal: "",
  status: "active",
  currentVersionId: "recipe-1700000001000",
  createdAt: "2026-05-17T09:00:00.000Z",
  updatedAt: "2026-05-18T09:00:00.000Z",
  versions: [
    {
      ...legacyRecipeFixture,
      id: "recipe-1700000001000",
      seriesId: "series-1700000000000",
      version: 2,
      changeNote: "ブラジルを増やした",
      ratios: [
        { id: "ethiopia", value: 55, beanSnapshot: fixtureBeanSnapshots[0] },
        { id: "brazil", value: 45, beanSnapshot: fixtureBeanSnapshots[1] },
      ],
      memo: "甘みを少し強めた",
      savedAt: "2026-05-18T09:00:00.000Z",
    },
    {
      ...legacyRecipeFixture,
      seriesId: "series-1700000000000",
      version: 1,
      changeNote: "初回作成",
    },
  ],
};
