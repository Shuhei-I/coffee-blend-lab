import { describe, expect, test } from "vitest";
import { initialSensory } from "./sensory.js";
import { buildBlendRatiosFromRecipe, buildRecipeEditorState } from "./recipeLoad.js";
import {
  currentRecipeSeriesFixture,
  fixtureBeans,
  fixtureBrewMethod,
  legacyRecipeFixture,
} from "./recipeSeries.fixtures.js";

describe("recipe loading editor state", () => {
  test("builds editor state from a saved recipe with existing load fallbacks", () => {
    const series = currentRecipeSeriesFixture;
    const recipe = currentRecipeSeriesFixture.versions[0];
    const result = buildRecipeEditorState({
      recipe,
      series,
      beans: fixtureBeans,
      brewMethods: [fixtureBrewMethod],
    });

    expect(result.editorState).toMatchObject({
      blendName: "Morning Blend",
      changeNote: "",
      doseGram: recipe.doseGram,
      brewRatio: recipe.brewRatio,
      editingRecipeSource: { seriesId: "series-1700000000000", versionId: "recipe-1700000001000" },
      sensory: recipe.sensory,
      memo: recipe.memo,
      blendRatios: { ethiopia: 55, brazil: 45 },
    });
    expect(result.editorState.savedRecipeBrewMethod).toMatchObject({
      ...fixtureBrewMethod,
      id: "saved-brew-recipe-1700000001000",
      sourceBrewMethodId: "standard-4-pour",
    });
    expect(result.editorState.savedRecipeBrewMethod.displayName).toContain(fixtureBrewMethod.name);
    expect(result.selectedBrewMethodId).toBe("saved-brew-recipe-1700000001000");
  });

  test("uses recipe name, current brew method, and default values when existing load does", () => {
    const recipe = {
      ...legacyRecipeFixture,
      name: "Legacy Name",
      seriesId: undefined,
      doseGram: 0,
      brewRatio: 0,
      brewMethodSnapshot: null,
      sensory: { fragrance: 9 },
      memo: "",
      ratios: [{ id: "ethiopia", value: "0" }],
    };
    const result = buildRecipeEditorState({
      recipe,
      series: null,
      beans: [...fixtureBeans, { ...fixtureBeans[0], id: "kenya" }],
      brewMethods: [fixtureBrewMethod],
    });

    expect(result.editorState.blendName).toBe("Legacy Name");
    expect(result.editorState.changeNote).toBe("");
    expect(result.editorState.doseGram).toBe(20);
    expect(result.editorState.brewRatio).toBe(16);
    expect(result.editorState.savedRecipeBrewMethod).toBeNull();
    expect(result.editorState.editingRecipeSource).toEqual({ seriesId: undefined, versionId: "recipe-1700000000000" });
    expect(result.editorState.sensory).toEqual({ ...initialSensory, fragrance: 9 });
    expect(result.editorState.memo).toBe("");
    expect(result.editorState.blendRatios).toEqual({ ethiopia: "0", brazil: 0, kenya: 0 });
    expect(result.selectedBrewMethodId).toBe("standard-4-pour");
  });

  test("keeps current bean ids only when building blend ratios", () => {
    const recipe = {
      ...legacyRecipeFixture,
      ratios: [
        { id: "deleted-bean", value: 70, beanSnapshot: { id: "deleted-bean", name: "Deleted" } },
        { id: "brazil", value: 0 },
      ],
    };

    expect(buildBlendRatiosFromRecipe(recipe, fixtureBeans)).toEqual({ ethiopia: 0, brazil: 0 });
    expect(buildBlendRatiosFromRecipe({ ...recipe, ratios: [{ id: "brazil", value: "42" }] }, fixtureBeans)).toEqual({
      ethiopia: 0,
      brazil: "42",
    });
    expect(buildBlendRatiosFromRecipe(recipe, [])).toEqual({});
  });

  test("returns no selected brew method when saved and current brew methods are unavailable", () => {
    const recipe = {
      ...legacyRecipeFixture,
      brewMethodId: "missing",
      brewMethodSnapshot: null,
    };
    const result = buildRecipeEditorState({
      recipe,
      series: currentRecipeSeriesFixture,
      beans: fixtureBeans,
      brewMethods: [fixtureBrewMethod],
    });

    expect(result.editorState.savedRecipeBrewMethod).toBeNull();
    expect(result.selectedBrewMethodId).toBeUndefined();
  });

  test("preserves input objects while creating new editor wrapper objects", () => {
    const recipe = clone(currentRecipeSeriesFixture.versions[0]);
    const series = clone(currentRecipeSeriesFixture);
    const beans = clone(fixtureBeans);
    const brewMethods = [clone(fixtureBrewMethod)];
    const recipeBefore = clone(recipe);
    const seriesBefore = clone(series);
    const beansBefore = clone(beans);
    const brewMethodsBefore = clone(brewMethods);

    const result = buildRecipeEditorState({ recipe, series, beans, brewMethods });

    expect(recipe).toEqual(recipeBefore);
    expect(series).toEqual(seriesBefore);
    expect(beans).toEqual(beansBefore);
    expect(brewMethods).toEqual(brewMethodsBefore);
    expect(result.editorState).not.toBe(recipe);
    expect(result.editorState.blendRatios).not.toBe(recipe.ratios);
  });

  test("does not expose React, repository, or browser dependencies", () => {
    const sourceKeys = Object.keys(buildRecipeEditorState({
      recipe: legacyRecipeFixture,
      series: currentRecipeSeriesFixture,
      beans: fixtureBeans,
      brewMethods: [fixtureBrewMethod],
    }));

    expect(sourceKeys).toEqual(["editorState", "selectedBrewMethodId"]);
    expect(sourceKeys).not.toContain("replaceEditorState");
    expect(sourceKeys).not.toContain("repository");
    expect(sourceKeys).not.toContain("window");
  });
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}
