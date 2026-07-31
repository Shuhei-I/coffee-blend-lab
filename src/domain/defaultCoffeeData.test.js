import { describe, expect, test } from "vitest";
import {
  createDefaultCoffeeState,
  getDefaultBeans,
  getDefaultBrewMethods,
  getDefaultRecipeSeries,
  getDefaultSelectedBrewMethodId,
} from "./defaultCoffeeData.js";

describe("default coffee data", () => {
  test("keeps default bean count, ids, and order", () => {
    const beans = getDefaultBeans();

    expect(beans).toHaveLength(4);
    expect(beans.map((bean) => bean.id)).toEqual(["ethiopia", "brazil", "guatemala", "sumatra"]);
  });

  test("keeps default bean required fields and representative values", () => {
    const beans = getDefaultBeans();

    expect(beans).toEqual([
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
    ]);
  });

  test("keeps default brew method count, ids, and order", () => {
    const brewMethods = getDefaultBrewMethods();

    expect(brewMethods).toHaveLength(2);
    expect(brewMethods.map((method) => method.id)).toEqual(["standard-4-pour", "sweet-forward"]);
  });

  test("keeps default brew method required fields and values", () => {
    expect(getDefaultBrewMethods()).toEqual([
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
    ]);
  });

  test("keeps selected brew method and initial RecipeSeries defaults", () => {
    expect(getDefaultSelectedBrewMethodId()).toBe("standard-4-pour");
    expect(getDefaultRecipeSeries()).toEqual([]);
    expect(createDefaultCoffeeState()).toMatchObject({
      selectedBrewMethodId: "standard-4-pour",
      recipeSeries: [],
    });
  });

  test("returns new references for every generated default state", () => {
    const first = createDefaultCoffeeState();
    const second = createDefaultCoffeeState();

    expect(first).not.toBe(second);
    expect(first.beans).not.toBe(second.beans);
    expect(first.beans[0]).not.toBe(second.beans[0]);
    expect(first.beans[0].profile).not.toBe(second.beans[0].profile);
    expect(first.brewMethods).not.toBe(second.brewMethods);
    expect(first.recipeSeries).not.toBe(second.recipeSeries);
  });

  test("does not leak mutations between generated default states", () => {
    const first = createDefaultCoffeeState();
    first.beans[0].name = "changed";
    first.beans[0].profile.acidity = 0;
    first.brewMethods[0].name = "changed";
    first.recipeSeries.push({ id: "series" });

    const second = createDefaultCoffeeState();

    expect(second.beans[0].name).toBe("エチオピア ナチュラル");
    expect(second.beans[0].profile.acidity).toBe(86);
    expect(second.brewMethods[0].name).toBe("標準 4投式");
    expect(second.recipeSeries).toEqual([]);
  });

});
