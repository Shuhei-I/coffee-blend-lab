const defaultBeans = [
  {
    id: "ethiopia",
    name: "エチオピア ナチュラル",
    note: "ベリー、花、明るい酸味",
    color: "#b85243",
    ratio: 0,
    costPerKg: 5800,
    profile: { acidity: 86, sweetness: 78, bitterness: 32, body: 48, aroma: 92 },
  },
  {
    id: "brazil",
    name: "ブラジル No.2 Natural",
    note: "ナッツ、チョコ、丸い甘み",
    color: "#c38b2d",
    ratio: 0,
    costPerKg: 3600,
    profile: { acidity: 38, sweetness: 82, bitterness: 48, body: 74, aroma: 58 },
  },
  {
    id: "guatemala",
    name: "グアテマラ ウォッシュト",
    note: "カカオ、柑橘、整った後味",
    color: "#12656b",
    ratio: 0,
    costPerKg: 4700,
    profile: { acidity: 64, sweetness: 66, bitterness: 55, body: 68, aroma: 70 },
  },
  {
    id: "sumatra",
    name: "スマトラ マンデリン",
    note: "ハーブ、重厚なボディ、余韻",
    color: "#54745a",
    ratio: 0,
    costPerKg: 4200,
    profile: { acidity: 26, sweetness: 46, bitterness: 72, body: 92, aroma: 64 },
  },
];

const defaultBrewMethods = [
  {
    id: "standard-4-pour",
    name: "標準 4投式",
    note: "蒸らし後に3回で注ぎ切る基本レシピ",
    bloomPercent: 12,
    pour1Percent: 28,
    pour2Percent: 30,
    pour3Percent: 30,
    bloomSeconds: 30,
  },
  {
    id: "sweet-forward",
    name: "甘み重視",
    note: "前半を厚めにして甘みとボディを出す",
    bloomPercent: 15,
    pour1Percent: 35,
    pour2Percent: 25,
    pour3Percent: 25,
    bloomSeconds: 40,
  },
];

const defaultRecipeSeries = [];

export function getDefaultBeans() {
  return clone(defaultBeans);
}

export function getDefaultBrewMethods() {
  return clone(defaultBrewMethods);
}

export function getDefaultRecipeSeries() {
  return clone(defaultRecipeSeries);
}

export function getDefaultSelectedBrewMethodId() {
  return defaultBrewMethods[0].id;
}

export function createDefaultCoffeeState() {
  return {
    beans: getDefaultBeans(),
    brewMethods: getDefaultBrewMethods(),
    selectedBrewMethodId: getDefaultSelectedBrewMethodId(),
    recipeSeries: getDefaultRecipeSeries(),
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}
