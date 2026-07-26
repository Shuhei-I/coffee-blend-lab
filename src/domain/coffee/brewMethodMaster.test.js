import { describe, expect, test } from "vitest";
import {
  canDeleteBrewMethod,
  createBrewMethod,
  deleteBrewMethodById,
  deleteBrewMethodData,
  getSelectedBrewMethodIdAfterDelete,
  updateBrewMethod,
} from "./brewMethodMaster.js";

describe("brew method master domain operations", () => {
  test("creates brew methods with existing defaults and injected id", () => {
    expect(createBrewMethod({ id: "brew-1" })).toEqual({
      id: "brew-1",
      name: "新しい淹れ方",
      note: "抽出意図を入力",
      bloomPercent: 12,
      pour1Percent: 28,
      pour2Percent: 30,
      pour3Percent: 30,
      bloomSeconds: 30,
    });
  });

  test("updates a brew method with a shallow patch while preserving order and other references", () => {
    const methods = [
      { id: "a", name: "A", note: "old", bloomPercent: 12, pour1Percent: 28 },
      { id: "b", name: "B", note: "keep", bloomPercent: 15, pour1Percent: 35 },
    ];
    const updated = updateBrewMethod(methods, "a", { name: "Updated", bloomPercent: "20", extra: undefined });

    expect(updated).toEqual([
      { id: "a", name: "Updated", note: "old", bloomPercent: "20", pour1Percent: 28, extra: undefined },
      methods[1],
    ]);
    expect(updated.map((method) => method.id)).toEqual(["a", "b"]);
    expect(updated[1]).toBe(methods[1]);
    expect(updated).not.toBe(methods);
    expect(methods[0].name).toBe("A");
  });

  test("keeps existing update behavior for missing ids and empty arrays", () => {
    const methods = [{ id: "a", name: "A" }];

    expect(updateBrewMethod([], "a", { name: "Updated" })).toEqual([]);
    expect(updateBrewMethod(methods, "missing", { name: "Updated" })).toEqual(methods);
    expect(updateBrewMethod(methods, "missing", { name: "Updated" })[0]).toBe(methods[0]);
  });

  test("does not add number conversion or clamp beyond caller-provided patch values", () => {
    const methods = [{ id: "a", bloomPercent: 12, pour1Percent: 28, pour2Percent: 30, pour3Percent: 30, bloomSeconds: 30 }];

    expect(updateBrewMethod(methods, "a", { bloomPercent: 101 })[0].bloomPercent).toBe(101);
    expect(updateBrewMethod(methods, "a", { pour1Percent: -1 })[0].pour1Percent).toBe(-1);
    expect(updateBrewMethod(methods, "a", { pour2Percent: "" })[0].pour2Percent).toBe("");
    expect(updateBrewMethod(methods, "a", { pour3Percent: "bad" })[0].pour3Percent).toBe("bad");
    expect(updateBrewMethod(methods, "a", { bloomSeconds: null })[0].bloomSeconds).toBeNull();
    expect(updateBrewMethod(methods, "a", { bloomSeconds: undefined })[0].bloomSeconds).toBeUndefined();
  });

  test("deletes brew methods by id without mutating inputs", () => {
    const methods = [
      { id: "a", name: "A" },
      { id: "b", name: "B" },
      { id: "c", name: "C" },
    ];
    const updated = deleteBrewMethodById(methods, "b");

    expect(updated).toEqual([methods[0], methods[2]]);
    expect(updated[0]).toBe(methods[0]);
    expect(updated[1]).toBe(methods[2]);
    expect(methods).toHaveLength(3);
    expect(deleteBrewMethodById(methods, "missing")).toEqual(methods);
    expect(deleteBrewMethodById([], "a")).toEqual([]);
  });

  test("keeps existing minimum brew method delete condition", () => {
    expect(canDeleteBrewMethod([])).toBe(false);
    expect(canDeleteBrewMethod([{ id: "a" }])).toBe(false);
    expect(canDeleteBrewMethod([{ id: "a" }, { id: "b" }])).toBe(true);
  });

  test("keeps selected id when deleting a non-selected method", () => {
    const methods = [{ id: "a" }, { id: "b" }, { id: "c" }];

    expect(
      getSelectedBrewMethodIdAfterDelete({
        methods,
        deletedMethodId: "b",
        selectedBrewMethodId: "a",
      }),
    ).toBe("a");
  });

  test("selects the first remaining method when deleting the selected method", () => {
    const methods = [{ id: "a" }, { id: "b" }, { id: "c" }];

    expect(
      getSelectedBrewMethodIdAfterDelete({
        methods,
        deletedMethodId: "a",
        selectedBrewMethodId: "a",
      }),
    ).toBe("b");
    expect(
      getSelectedBrewMethodIdAfterDelete({
        methods,
        deletedMethodId: "b",
        selectedBrewMethodId: "b",
      }),
    ).toBe("a");
    expect(
      getSelectedBrewMethodIdAfterDelete({
        methods,
        deletedMethodId: "c",
        selectedBrewMethodId: "c",
      }),
    ).toBe("a");
  });

  test("keeps existing selected id behavior for missing ids and impossible empty results", () => {
    const methods = [{ id: "a" }, { id: "b" }];

    expect(
      getSelectedBrewMethodIdAfterDelete({
        methods,
        deletedMethodId: "missing",
        selectedBrewMethodId: "missing-selected",
      }),
    ).toBe("missing-selected");
    expect(
      getSelectedBrewMethodIdAfterDelete({
        methods: [{ id: "a" }],
        deletedMethodId: "a",
        selectedBrewMethodId: "a",
      }),
    ).toBeUndefined();
  });

  test("returns deleted methods and selected id together for main handler wiring", () => {
    const methods = [{ id: "a" }, { id: "b" }];

    expect(deleteBrewMethodData({ methods, methodId: "a", selectedBrewMethodId: "a" })).toEqual({
      brewMethods: [{ id: "b" }],
      selectedBrewMethodId: "b",
    });
    expect(deleteBrewMethodData({ methods, methodId: "b", selectedBrewMethodId: "a" })).toEqual({
      brewMethods: [{ id: "a" }],
      selectedBrewMethodId: "a",
    });
  });

  test("does not depend on saved recipe snapshots, React hooks, browser APIs, or repositories", () => {
    const result = deleteBrewMethodData({
      methods: [{ id: "a" }, { id: "b" }],
      methodId: "b",
      selectedBrewMethodId: "a",
    });

    expect(Object.keys(result)).toEqual(["brewMethods", "selectedBrewMethodId"]);
    expect(Object.keys(result)).not.toContain("savedRecipeBrewMethod");
    expect(Object.keys(result)).not.toContain("clearSavedRecipeBrewMethodIfDifferent");
    expect(Object.keys(result)).not.toContain("repository");
    expect(Object.keys(result)).not.toContain("window");
  });
});
