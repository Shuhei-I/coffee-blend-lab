import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { normalizeBlendRatios } from "../domain/coffee/calculations.js";
import { initialSensory, useRecipeEditor } from "./useRecipeEditor.js";

let dom;
let container;
let root;

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  dom = new JSDOM("<!doctype html><html><body><div id=\"root\"></div></body></html>");
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  container = document.getElementById("root");
});

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  root = undefined;
  dom?.window.close();
  delete globalThis.window;
  delete globalThis.document;
});

describe("useRecipeEditor", () => {
  test("keeps existing initial values", () => {
    const rendered = renderHook({ initialBeans: fixtureBeans });

    expect(rendered.current.blendName).toBe("");
    expect(rendered.current.blendGoal).toBe("");
    expect(rendered.current.changeNote).toBe("");
    expect(rendered.current.doseGram).toBe(20);
    expect(rendered.current.brewRatio).toBe(16);
    expect(rendered.current.grindSize).toBe("");
    expect(rendered.current.brewTemperatureC).toBe(90);
    expect(rendered.current.savedRecipeBrewMethod).toBeNull();
    expect(rendered.current.editingRecipeSource).toBeNull();
    expect(rendered.current.sensory).toEqual(initialSensory);
    expect(rendered.current.memo).toBe("");
    expect(rendered.current.blendRatios).toEqual({ ethiopia: 0, brazil: 0, guatemala: 0 });
    expect(rendered.current.blendRoastLevels).toEqual({ ethiopia: "", brazil: "", guatemala: "" });
    expect(rendered.current.selectedBlendBeanIds).toEqual([]);
    expect(rendered.current.snapshotOnlyBeans).toEqual([]);
  });

  test("keeps existing setter contracts", () => {
    const rendered = renderHook();
    const savedMethod = { id: "saved-brew" };
    const source = { seriesId: "series-1", versionId: "recipe-1" };

    act(() => {
      rendered.current.setBlendName("Blend");
      rendered.current.setBlendGoal("Daily cup");
      rendered.current.setChangeNote("Note");
      rendered.current.setDoseGram(24);
      rendered.current.setBrewRatio(15);
      rendered.current.setGrindSize("medium_fine");
      rendered.current.setBrewTemperatureC(92);
      rendered.current.setSavedRecipeBrewMethod(savedMethod);
      rendered.current.setEditingRecipeSource(source);
      rendered.current.setSensory({ fragrance: 8, flavor: 7, aftertaste: 6, balance: 5 });
      rendered.current.setMemo("Memo");
      rendered.current.setBlendRatios({ ethiopia: 60 });
      rendered.current.setBlendRoastLevels({ ethiopia: "full-city" });
      rendered.current.selectBlendBean("ethiopia");
    });

    expect(rendered.current.blendName).toBe("Blend");
    expect(rendered.current.blendGoal).toBe("Daily cup");
    expect(rendered.current.changeNote).toBe("Note");
    expect(rendered.current.doseGram).toBe(24);
    expect(rendered.current.brewRatio).toBe(15);
    expect(rendered.current.grindSize).toBe("medium_fine");
    expect(rendered.current.brewTemperatureC).toBe(92);
    expect(rendered.current.savedRecipeBrewMethod).toBe(savedMethod);
    expect(rendered.current.editingRecipeSource).toBe(source);
    expect(rendered.current.sensory).toEqual({ fragrance: 8, flavor: 7, aftertaste: 6, balance: 5 });
    expect(rendered.current.memo).toBe("Memo");
    expect(rendered.current.blendRatios).toEqual({ ethiopia: 60 });
    expect(rendered.current.blendRoastLevels).toEqual({ ethiopia: "full-city" });
    expect(rendered.current.selectedBlendBeanIds).toEqual(["ethiopia"]);
  });

  test("selects and removes blend beans independently from master data", () => {
    const rendered = renderHook({ initialBeans: fixtureBeans });

    act(() => {
      rendered.current.selectBlendBean("ethiopia");
      rendered.current.selectBlendBean("ethiopia");
      rendered.current.updateRoastLevel("ethiopia", "city");
    });
    expect(rendered.current.selectedBlendBeanIds).toEqual(["ethiopia"]);
    expect(rendered.current.blendRoastLevels.ethiopia).toBe("city");

    act(() => {
      rendered.current.removeBlendBean("ethiopia");
    });
    expect(rendered.current.selectedBlendBeanIds).toEqual([]);
    expect(rendered.current.blendRatios.ethiopia).toBe(0);
    expect(rendered.current.blendRoastLevels.ethiopia).toBe("");
  });

  test("updates roast levels without changing ratios", () => {
    const rendered = renderHook({ initialBeans: fixtureBeans });

    act(() => {
      rendered.current.updateRatio("ethiopia", 40);
      rendered.current.updateRoastLevel("ethiopia", "full-city");
      rendered.current.updateRoastLevel("brazil", "medium");
    });

    expect(rendered.current.blendRatios).toEqual({ ethiopia: 40, brazil: 0, guatemala: 0 });
    expect(rendered.current.blendRoastLevels).toEqual({ ethiopia: "full-city", brazil: "medium", guatemala: "" });
  });

  test("updates ratios with existing clamp and number conversion", () => {
    const rendered = renderHook({ initialBeans: fixtureBeans });

    act(() => {
      rendered.current.updateRatio("ethiopia", 40);
      rendered.current.updateRatio("brazil", "55");
      rendered.current.updateRatio("guatemala", -1);
    });
    expect(rendered.current.blendRatios).toEqual({ ethiopia: 40, brazil: 55, guatemala: 0 });
    expect(rendered.current.selectedBlendBeanIds).toEqual(["ethiopia", "brazil"]);

    act(() => {
      rendered.current.updateRatio("guatemala", 101);
      rendered.current.updateRatio("ethiopia", "");
    });
    expect(rendered.current.blendRatios).toEqual({ ethiopia: 0, brazil: 55, guatemala: 100 });
  });

  test("normalizes ratios with existing domain behavior", () => {
    const rendered = renderHook();
    const blendBeans = [
      { id: "ethiopia", ratio: 20 },
      { id: "brazil", ratio: 30 },
    ];

    act(() => {
      rendered.current.normalizeRatios(blendBeans, 50);
    });

    expect(rendered.current.blendRatios).toEqual(normalizeBlendRatios(blendBeans, 50));
  });

  test("normalizes total 100, total 0, and empty beans without mutating inputs", () => {
    const rendered = renderHook();
    const totalHundred = [
      { id: "a", ratio: 33 },
      { id: "b", ratio: 67 },
    ];
    const totalZero = [
      { id: "a", ratio: 0 },
      { id: "b", ratio: 0 },
      { id: "c", ratio: 0 },
    ];
    const original = totalZero.map((bean) => ({ ...bean }));

    act(() => {
      rendered.current.normalizeRatios(totalHundred, 100);
    });
    expect(rendered.current.blendRatios).toEqual({ a: 33, b: 67 });

    act(() => {
      rendered.current.normalizeRatios(totalZero, 0);
    });
    expect(rendered.current.blendRatios).toEqual(normalizeBlendRatios(totalZero, 0));
    expect(totalZero).toEqual(original);

    act(() => {
      rendered.current.normalizeRatios([], 0);
    });
    expect(rendered.current.blendRatios).toEqual(normalizeBlendRatios(totalZero, 0));
  });

  test("resets editor state without page or notification state", () => {
    const rendered = renderHook();

    act(() => {
      rendered.current.replaceEditorState({
        blendName: "Loaded",
        blendGoal: "Loaded goal",
        changeNote: "Changed",
        doseGram: 30,
        brewRatio: 12,
        grindSize: "coarse",
        brewTemperatureC: 88,
        savedRecipeBrewMethod: { id: "saved" },
        editingRecipeSource: { seriesId: "series", versionId: "version" },
        sensory: { fragrance: 1, flavor: 2, aftertaste: 3, balance: 4 },
        memo: "Memo",
        blendRatios: { old: 100 },
        blendRoastLevels: { old: "french" },
        selectedBlendBeanIds: ["old"],
        snapshotOnlyBeans: [{ id: "old", isSnapshotOnly: true }],
      });
      rendered.current.resetEditor(fixtureBeans);
    });

    expect(rendered.current.blendName).toBe("");
    expect(rendered.current.blendGoal).toBe("");
    expect(rendered.current.changeNote).toBe("");
    expect(rendered.current.doseGram).toBe(20);
    expect(rendered.current.brewRatio).toBe(16);
    expect(rendered.current.grindSize).toBe("");
    expect(rendered.current.brewTemperatureC).toBe(90);
    expect(rendered.current.savedRecipeBrewMethod).toBeNull();
    expect(rendered.current.editingRecipeSource).toBeNull();
    expect(rendered.current.sensory).toEqual(initialSensory);
    expect(rendered.current.memo).toBe("");
    expect(rendered.current.blendRatios).toEqual({ ethiopia: 0, brazil: 0, guatemala: 0 });
    expect(rendered.current.blendRoastLevels).toEqual({ ethiopia: "", brazil: "", guatemala: "" });
    expect(rendered.current.selectedBlendBeanIds).toEqual([]);
    expect(rendered.current.snapshotOnlyBeans).toEqual([]);
  });

  test("replaces editor state exactly without interpreting RecipeSeries", () => {
    const rendered = renderHook();
    const nextState = {
      blendName: "Series Name",
      blendGoal: "Series goal",
      changeNote: "",
      doseGram: 18,
      brewRatio: 14,
      grindSize: "fine",
      brewTemperatureC: 90,
      savedRecipeBrewMethod: { id: "saved-brew-recipe" },
      editingRecipeSource: { seriesId: "series-2", versionId: "recipe-2" },
      sensory: { fragrance: 8, flavor: 8, aftertaste: 7, balance: 8 },
      memo: "Loaded memo",
      blendRatios: { ethiopia: 70, brazil: 30 },
      blendRoastLevels: { ethiopia: "city", brazil: "medium" },
      selectedBlendBeanIds: ["ethiopia", "brazil"],
      snapshotOnlyBeans: [{ id: "deleted-bean", isSnapshotOnly: true }],
    };

    act(() => {
      rendered.current.replaceEditorState(nextState);
    });

    expect(rendered.current.blendName).toBe(nextState.blendName);
    expect(rendered.current.blendGoal).toBe(nextState.blendGoal);
    expect(rendered.current.changeNote).toBe(nextState.changeNote);
    expect(rendered.current.doseGram).toBe(nextState.doseGram);
    expect(rendered.current.brewRatio).toBe(nextState.brewRatio);
    expect(rendered.current.grindSize).toBe(nextState.grindSize);
    expect(rendered.current.brewTemperatureC).toBe(nextState.brewTemperatureC);
    expect(rendered.current.savedRecipeBrewMethod).toBe(nextState.savedRecipeBrewMethod);
    expect(rendered.current.editingRecipeSource).toBe(nextState.editingRecipeSource);
    expect(rendered.current.sensory).toBe(nextState.sensory);
    expect(rendered.current.memo).toBe(nextState.memo);
    expect(rendered.current.blendRatios).toBe(nextState.blendRatios);
    expect(rendered.current.blendRoastLevels).toBe(nextState.blendRoastLevels);
    expect(rendered.current.selectedBlendBeanIds).toBe(nextState.selectedBlendBeanIds);
    expect(rendered.current.snapshotOnlyBeans).toBe(nextState.snapshotOnlyBeans);
  });

  test("supports explicit bean ratio replacement for bean add, delete, and replacement flows", () => {
    const rendered = renderHook({ initialBeans: fixtureBeans });

    act(() => {
      rendered.current.setBlendRatios((current) => ({ ...current, newBean: 0 }));
      rendered.current.setBlendRoastLevels((current) => ({ ...current, newBean: "" }));
    });
    expect(rendered.current.blendRatios).toEqual({ ethiopia: 0, brazil: 0, guatemala: 0, newBean: 0 });
    expect(rendered.current.blendRoastLevels).toEqual({ ethiopia: "", brazil: "", guatemala: "", newBean: "" });

    act(() => {
      rendered.current.setBlendRatios((current) => {
        const next = { ...current };
        delete next.brazil;
        return next;
      });
      rendered.current.setBlendRoastLevels((current) => {
        const next = { ...current };
        delete next.brazil;
        return next;
      });
    });
    expect(rendered.current.blendRatios).toEqual({ ethiopia: 0, guatemala: 0, newBean: 0 });
    expect(rendered.current.blendRoastLevels).toEqual({ ethiopia: "", guatemala: "", newBean: "" });

    act(() => {
      rendered.current.replaceBlendRatiosForBeans([{ id: "replacement" }]);
    });
    expect(rendered.current.blendRatios).toEqual({ replacement: 0 });
    expect(rendered.current.blendRoastLevels).toEqual({ replacement: "" });
    expect(rendered.current.snapshotOnlyBeans).toEqual([]);

    act(() => {
      rendered.current.replaceBlendRatiosForBeans([]);
    });
    expect(rendered.current.blendRatios).toEqual({});
    expect(rendered.current.blendRoastLevels).toEqual({});
  });

  test("clears saved recipe brew method only when selected method differs", () => {
    const rendered = renderHook();
    const savedMethod = { id: "saved-brew" };

    act(() => {
      rendered.current.setSavedRecipeBrewMethod(savedMethod);
    });
    act(() => {
      rendered.current.clearSavedRecipeBrewMethodIfDifferent("saved-brew");
    });
    expect(rendered.current.savedRecipeBrewMethod).toBe(savedMethod);

    act(() => {
      rendered.current.clearSavedRecipeBrewMethodIfDifferent("standard-4-pour");
    });
    expect(rendered.current.savedRecipeBrewMethod).toBeNull();
  });

  test("does not depend on repository or browser APIs", () => {
    const sourceKeys = Object.keys(renderHook().current);

    expect(sourceKeys).not.toContain("saveRecipe");
    expect(sourceKeys).not.toContain("loadRecipe");
    expect(sourceKeys).not.toContain("exportRecipes");
    expect(sourceKeys).not.toContain("repository");
  });
});

const fixtureBeans = [{ id: "ethiopia" }, { id: "brazil" }, { id: "guatemala" }];

function renderHook(options) {
  const rendered = { current: null };

  function TestComponent() {
    rendered.current = useRecipeEditor(options);
    return null;
  }

  act(() => {
    root = createRoot(container);
    root.render(<TestComponent />);
  });

  return rendered;
}
