import { describe, expect, test } from "vitest";
import {
  buildRecipeComparisonDraft,
  compareRecipeDraftToVersion,
  resolveComparisonReferenceVersionId,
} from "./recipeComparison.js";

describe("recipeComparison", () => {
  test("uses a loaded active version as the comparison reference but excludes archived versions", () => {
    expect(resolveComparisonReferenceVersionId({ recipe: { id: "recipe-2" }, series: { status: "active" } })).toBe("recipe-2");
    expect(resolveComparisonReferenceVersionId({ recipe: { id: "recipe-2" }, series: { status: "archived" } })).toBe("");
    expect(resolveComparisonReferenceVersionId()).toBe("");
  });

  test("compares bean ratios, roast levels, and brew fields against a saved version", () => {
    const draft = buildRecipeComparisonDraft({
      blendBeans: [
        { id: "ethiopia", name: "Ethiopia", ratio: 40, roastLevel: "city" },
        { id: "brazil", name: "Brazil", ratio: 60, roastLevel: "medium" },
        { id: "kenya", name: "Kenya", ratio: 10, roastLevel: "full-city" },
      ],
      doseGram: 22,
      brewRatio: 16,
      grindSize: "medium_fine",
      brewTemperatureC: 92,
      brewMethod: {
        name: "V60",
        equipmentName: "V60",
        bloomPercent: 15,
        pour1Percent: 35,
        pour2Percent: 25,
        pour3Percent: 25,
      },
    });
    const comparison = compareRecipeDraftToVersion({
      draft,
      reference: {
        seriesName: "Morning Blend",
        version: 2,
        ratios: [
          { id: "ethiopia", value: 50, roastLevel: "city", beanSnapshot: { name: "Ethiopia" } },
          { id: "brazil", value: 50, roastLevel: "medium" },
        ],
        doseGram: 20,
        brewRatio: 15,
        grindSize: "medium",
        brewTemperatureC: 90,
        brewMethodSnapshot: {
          name: "Kalita Wave",
          equipmentName: "Kalita Wave",
          bloomPercent: 12,
          pour1Percent: 28,
          pour2Percent: 30,
          pour3Percent: 30,
        },
      },
    });

    expect(comparison.referenceLabel).toBe("Morning Blend v2");
    expect(comparison.blendChanges).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "Ethiopiaの配合比率", referenceValue: 50, currentValue: 40, delta: -10 }),
      expect.objectContaining({ label: "Brazilの配合比率", referenceValue: 50, currentValue: 60, delta: 10 }),
      expect.objectContaining({ label: "Kenyaの配合比率", referenceValue: 0, currentValue: 10, delta: 10 }),
    ]));
    expect(comparison.brewChanges).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "doseGram", referenceValue: 20, currentValue: 22 }),
      expect.objectContaining({ key: "brewRatio", referenceValue: 15, currentValue: 16 }),
      expect.objectContaining({ key: "grindSize", referenceValue: "medium", currentValue: "medium_fine" }),
      expect.objectContaining({ key: "brewTemperatureC", referenceValue: 90, currentValue: 92 }),
      expect.objectContaining({ key: "brewMethod", referenceValue: "Kalita Wave", currentValue: "V60" }),
      expect.objectContaining({ key: "equipmentName", referenceValue: "Kalita Wave", currentValue: "V60" }),
      expect.objectContaining({
        key: "brewSchedule",
        referenceValue: "蒸らし12% / 1投目28% / 2投目30% / 3投目30%",
        currentValue: "蒸らし15% / 1投目35% / 2投目25% / 3投目25%",
      }),
    ]));
  });

  test("does not report unchanged values and handles an empty reference", () => {
    const draft = buildRecipeComparisonDraft({
      blendBeans: [{ id: "ethiopia", name: "Ethiopia", ratio: 100, roastLevel: "city" }],
      doseGram: 20,
      brewRatio: 16,
      grindSize: "medium",
      brewTemperatureC: 90,
      brewMethod: { name: "V60", equipmentName: "V60" },
    });
    const comparison = compareRecipeDraftToVersion({
      draft,
      reference: {
        name: "Same Blend",
        version: 1,
        ratios: [{ id: "ethiopia", value: 100, roastLevel: "city", beanSnapshot: { name: "Ethiopia" } }],
        doseGram: 20,
        brewRatio: 16,
        grindSize: "medium",
        brewTemperatureC: 90,
        brewMethodSnapshot: { name: "V60", equipmentName: "V60" },
      },
    });

    expect(comparison.blendChanges).toEqual([]);
    expect(comparison.brewChanges).toEqual([]);
    expect(comparison.totalChangeCount).toBe(0);
    expect(compareRecipeDraftToVersion()).toBeNull();
  });
});
