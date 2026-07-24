import { describe, expect, test } from "vitest";
import {
  buildBlendCost,
  buildProfile,
  calculateBeanDoseGram,
  calculateBlendTotal,
  calculatePourSchedule,
  calculateTargetBrewGram,
  getPourTotal,
  normalizeBlendRatios,
  normalizePercent,
} from "./calculations.js";

const beans = [
  {
    id: "ethiopia",
    ratio: 50,
    costPerKg: 5800,
    profile: { acidity: 86, sweetness: 78, bitterness: 32, body: 48, aroma: 92 },
  },
  {
    id: "brazil",
    ratio: 30,
    costPerKg: 3600,
    profile: { acidity: 38, sweetness: 82, bitterness: 48, body: 74, aroma: 58 },
  },
  {
    id: "guatemala",
    ratio: 20,
    costPerKg: 0,
    profile: { acidity: 64, sweetness: 66, bitterness: 55, body: 68, aroma: 70 },
  },
];

describe("coffee calculations", () => {
  test("calculates total, dose, cost, profile, target brew, and pours for a 100% blend", () => {
    const total = calculateBlendTotal(beans);

    expect(total).toBe(100);
    expect(calculateBeanDoseGram(beans[0], total, 20)).toBe(10);
    expect(calculateBeanDoseGram(beans[1], total, 20)).toBe(6);
    expect(calculateBeanDoseGram(beans[2], total, 20)).toBe(4);
    expect(buildBlendCost(beans, total, 20)).toBeCloseTo(79.6);
    expect(buildProfile(beans, total)).toEqual({
      acidity: 67,
      sweetness: 77,
      bitterness: 41,
      body: 60,
      aroma: 77,
    });
    expect(calculateTargetBrewGram(20, 16)).toBe(320);
    expect(getPourTotal({ bloomPercent: 12, pour1Percent: 28, pour2Percent: 30, pour3Percent: 30 })).toBe(100);
    expect(calculatePourSchedule(
      { bloomPercent: 12, pour1Percent: 28, pour2Percent: 30, pour3Percent: 30, bloomSeconds: 30 },
      320,
    ).map(({ stepGram, cumulativeGram }) => [stepGram, cumulativeGram])).toEqual([
      [38, 38],
      [90, 128],
      [96, 224],
      [96, 320],
    ]);
  });

  test("preserves current normalization behavior for blends below 100%", () => {
    const partial = [
      { id: "ethiopia", ratio: 20 },
      { id: "brazil", ratio: 30 },
    ];

    expect(calculateBlendTotal(partial)).toBe(50);
    expect(normalizeBlendRatios(partial, 50)).toEqual({ ethiopia: 40, brazil: 60 });
  });

  test("normalizes three or more beans using the last bean as the rounding remainder", () => {
    const blend = [
      { id: "a", ratio: 1 },
      { id: "b", ratio: 1 },
      { id: "c", ratio: 1 },
    ];

    expect(normalizeBlendRatios(blend, 3)).toEqual({ a: 33, b: 33, c: 34 });
  });

  test("keeps fractional ratios and zero-cost beans in the existing formulas", () => {
    const blend = [
      {
        id: "a",
        ratio: 33.3,
        costPerKg: 6000,
        profile: { acidity: 80, sweetness: 70, bitterness: 20, body: 60, aroma: 90 },
      },
      {
        id: "b",
        ratio: 66.7,
        costPerKg: 0,
        profile: { acidity: 20, sweetness: 50, bitterness: 80, body: 40, aroma: 30 },
      },
    ];

    expect(calculateBlendTotal(blend)).toBeCloseTo(100);
    expect(calculateBeanDoseGram(blend[0], 100, 18)).toBeCloseTo(5.994);
    expect(buildBlendCost(blend, 100, 18)).toBeCloseTo(35.964);
    expect(buildProfile(blend, 100)).toEqual({
      acidity: 40,
      sweetness: 57,
      bitterness: 60,
      body: 47,
      aroma: 50,
    });
    expect(normalizeBlendRatios(blend, 100)).toEqual({ a: 33, b: 67 });
  });

  test("preserves zero-dose behavior", () => {
    expect(calculateTargetBrewGram(0, 16)).toBe(0);
    expect(calculateBeanDoseGram(beans[0], 100, 0)).toBe(0);
    expect(buildBlendCost(beans, 100, 0)).toBe(0);
  });

  test("preserves invalid brew ratio behavior", () => {
    expect(calculateTargetBrewGram(20, Number.NaN)).toBeNaN();
    expect(calculateTargetBrewGram(20, "bad")).toBeNaN();
  });

  test("preserves pour calculations when percentages do not total 100%", () => {
    const method = { bloomPercent: 10, pour1Percent: 20, pour2Percent: 20, pour3Percent: 20, bloomSeconds: 30 };

    expect(getPourTotal(method)).toBe(70);
    expect(calculatePourSchedule(method, 300).map(({ stepGram, cumulativeGram }) => [stepGram, cumulativeGram])).toEqual([
      [30, 30],
      [60, 90],
      [60, 150],
      [60, 210],
    ]);
  });

  test("preserves empty and missing input behavior", () => {
    expect(calculateBlendTotal([])).toBe(0);
    expect(normalizeBlendRatios([], 0)).toEqual({});
    expect(buildBlendCost([], 0, 20)).toBe(0);
    expect(buildProfile([], 0)).toEqual({ acidity: 0, sweetness: 0, bitterness: 0, body: 0, aroma: 0 });
    expect(getPourTotal(null)).toBe(0);
    expect(calculatePourSchedule(null, 300)).toEqual([]);
  });

  test("preserves non-numeric coercion in existing calculations", () => {
    const blend = [
      {
        id: "a",
        ratio: "bad",
        costPerKg: "bad",
        profile: { acidity: 80, sweetness: 70, bitterness: 20, body: 60, aroma: 90 },
      },
    ];

    expect(calculateBlendTotal(blend)).toBe("0bad");
    expect(calculateBeanDoseGram(blend[0], 0, 20)).toBeNaN();
    expect(buildBlendCost(blend, 0, 20)).toBeNaN();
    expect(buildProfile(blend, 0).acidity).toBeNaN();
    expect(getPourTotal({ bloomPercent: "bad", pour1Percent: "", pour2Percent: undefined, pour3Percent: null })).toBe(0);
    expect(calculatePourSchedule(
      { bloomPercent: "bad", pour1Percent: 50, pour2Percent: undefined, pour3Percent: null, bloomSeconds: "bad" },
      200,
    ).map(({ stepGram, cumulativeGram }) => [stepGram, cumulativeGram])).toEqual([
      [0, 0],
      [100, 100],
      [0, 100],
      [0, 100],
    ]);
    expect(normalizePercent("bad")).toBe(0);
  });
});
