import { describe, expect, test } from "vitest";
import { canDeleteBean, createBean, deleteBeanById, updateBean, updateBeanProfile } from "./beanMaster.js";

describe("bean master domain operations", () => {
  test("updates a bean with a shallow patch while preserving order and other references", () => {
    const beans = [
      { id: "a", name: "A", note: "old", color: "#111", costPerKg: 1000, profile: { acidity: 10 } },
      { id: "b", name: "B", note: "keep", color: "#222", costPerKg: 2000, profile: { acidity: 20 } },
    ];
    const updated = updateBean(beans, "a", { name: "Updated", costPerKg: 1500, extra: undefined });

    expect(updated).toEqual([
      { id: "a", name: "Updated", note: "old", color: "#111", costPerKg: 1500, profile: { acidity: 10 }, extra: undefined },
      beans[1],
    ]);
    expect(updated.map((bean) => bean.id)).toEqual(["a", "b"]);
    expect(updated[1]).toBe(beans[1]);
    expect(updated).not.toBe(beans);
    expect(beans[0].name).toBe("A");
  });

  test("keeps existing update behavior for missing ids and empty arrays", () => {
    const beans = [{ id: "a", name: "A" }];

    expect(updateBean([], "a", { name: "Updated" })).toEqual([]);
    expect(updateBean(beans, "missing", { name: "Updated" })).toEqual(beans);
    expect(updateBean(beans, "missing", { name: "Updated" })[0]).toBe(beans[0]);
  });

  test("updates profile values with existing number conversion and clamp behavior", () => {
    const beans = [
      { id: "a", profile: { acidity: 10, sweetness: 20, bitterness: 30, body: 40, aroma: 50 } },
      { id: "b", profile: { acidity: 60, sweetness: 70, bitterness: 80, body: 90, aroma: 100 } },
    ];

    expect(updateBeanProfile(beans, "a", "acidity", 42)[0].profile.acidity).toBe(42);
    expect(updateBeanProfile(beans, "a", "sweetness", "42.5")[0].profile.sweetness).toBe(42.5);
    expect(updateBeanProfile(beans, "a", "bitterness", 0)[0].profile.bitterness).toBe(0);
    expect(updateBeanProfile(beans, "a", "body", -1)[0].profile.body).toBe(0);
    expect(updateBeanProfile(beans, "a", "aroma", 100)[0].profile.aroma).toBe(100);
    expect(updateBeanProfile(beans, "a", "aroma", 101)[0].profile.aroma).toBe(100);
    expect(updateBeanProfile(beans, "a", "acidity", "")[0].profile.acidity).toBe(0);
    expect(updateBeanProfile(beans, "a", "acidity", "bad")[0].profile.acidity).toBe(0);
    expect(updateBeanProfile(beans, "a", "acidity", null)[0].profile.acidity).toBe(0);
    expect(updateBeanProfile(beans, "a", "acidity", undefined)[0].profile.acidity).toBe(0);
  });

  test("updates only the requested profile key and preserves other beans", () => {
    const beans = [
      { id: "a", profile: { acidity: 10, sweetness: 20 } },
      { id: "b", profile: { acidity: 60, sweetness: 70 } },
    ];
    const originalProfile = beans[0].profile;
    const updated = updateBeanProfile(beans, "a", "newKey", "33");

    expect(updated[0].profile).toEqual({ acidity: 10, sweetness: 20, newKey: 33 });
    expect(updated[1]).toBe(beans[1]);
    expect(beans[0].profile).toBe(originalProfile);
    expect(beans[0].profile).toEqual({ acidity: 10, sweetness: 20 });
    expect(updateBeanProfile(beans, "missing", "acidity", 0)[0]).toBe(beans[0]);
  });

  test("creates beans with existing defaults and injected id", () => {
    expect(createBean({ id: "bean-1", index: 0 })).toEqual({
      id: "bean-1",
      name: "新しい豆",
      note: "特徴を入力",
      color: "#12656b",
      ratio: 0,
      visibleInRecipes: true,
      costPerKg: 0,
      roasterName: "",
      origin: "",
      processMethod: "",
      defaultRoastLevel: "",
      roastedAt: "",
      purchasedAt: "",
      purchasePlace: "",
      purchaseUrl: "",
      packageWeightGram: 0,
      purchasePrice: 0,
      profile: { acidity: 50, sweetness: 50, bitterness: 50, body: 50, aroma: 50 },
    });
  });

  test("cycles bean colors by index without browser or time dependencies", () => {
    expect([0, 1, 2, 3, 4, 5].map((index) => createBean({ id: `bean-${index}`, index }).color)).toEqual([
      "#12656b",
      "#b85243",
      "#54745a",
      "#c38b2d",
      "#6a5f99",
      "#12656b",
    ]);
  });

  test("deletes beans by id without mutating inputs", () => {
    const beans = [
      { id: "a", name: "A" },
      { id: "b", name: "B" },
      { id: "c", name: "C" },
    ];
    const updated = deleteBeanById(beans, "b");

    expect(updated).toEqual([beans[0], beans[2]]);
    expect(updated[0]).toBe(beans[0]);
    expect(updated[1]).toBe(beans[2]);
    expect(beans).toHaveLength(3);
    expect(deleteBeanById(beans, "missing")).toEqual(beans);
    expect(deleteBeanById([], "a")).toEqual([]);
  });

  test("keeps existing minimum bean delete condition", () => {
    expect(canDeleteBean([])).toBe(false);
    expect(canDeleteBean([{ id: "a" }])).toBe(false);
    expect(canDeleteBean([{ id: "a" }, { id: "b" }])).toBe(true);
  });
});
