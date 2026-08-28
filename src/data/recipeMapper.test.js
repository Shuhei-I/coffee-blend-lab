import { describe, expect, test } from "vitest";
import { toRecipeSeries, toRecipeVersion, toRecipeVersionBean, toSavePayload } from "./recipeMapper.js";

const seriesId = "11111111-1111-4111-8111-111111111111";
const version1Id = "22222222-2222-4222-8222-222222222221";
const version2Id = "22222222-2222-4222-8222-222222222222";
const beanId = "33333333-3333-4333-8333-333333333333";
const brewMethodId = "44444444-4444-4444-8444-444444444444";

describe("recipeMapper", () => {
  test("maps DB series, versions, and beans to existing application shape", () => {
    const [series] = toRecipeSeries(
      [seriesRow()],
      [
        versionRow({ id: version1Id, version_number: 1, saved_at: "2026-01-01T00:00:00.000Z" }),
        versionRow({ id: version2Id, version_number: 2, saved_at: "2026-01-02T00:00:00.000Z" }),
      ],
      [
        beanRow({
          recipe_version_id: version2Id,
          position: 1,
          bean_id: null,
          ratio: 40,
          roast_level: "full-city",
          bean_snapshot: { name: "Deleted Brazil" },
        }),
        beanRow({ recipe_version_id: version2Id, position: 0, bean_id: beanId, ratio: 60 }),
      ],
    );

    expect(series).toMatchObject({
      id: seriesId,
      name: "Morning Blend",
      goal: "daily cup",
      status: "active",
      sourcePostId: null,
      sourceLabel: "",
      currentVersionId: version2Id,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    });
    expect(series.versions.map((version) => version.id)).toEqual([version2Id, version1Id]);
    expect(series.versions[0]).toMatchObject({
      seriesId,
      version: 2,
      changeNote: "more body",
      doseGram: 20,
      brewRatio: 16,
      targetBrewGram: 320,
      blendCost: 120.5,
      grindSize: "medium_fine",
      brewTemperatureC: 92,
      brewMethodId,
      brewMethodSnapshot: { id: brewMethodId, name: "4 pour" },
      sensory: { flavor: 8 },
      memo: "balanced",
      savedAt: "2026-01-02T00:00:00.000Z",
    });
    expect(series.versions[0].ratios).toEqual([
      { id: beanId, value: 60, roastLevel: "medium", beanSnapshot: { id: beanId, name: "Ethiopia" } },
      { id: null, value: 40, roastLevel: "full-city", beanSnapshot: { name: "Deleted Brazil" } },
    ]);
  });

  test("maps a version with NULL foreign keys while keeping snapshots", () => {
    expect(
      toRecipeVersion(versionRow({ brew_method_id: null, brew_method_snapshot: { name: "Deleted Method" } }), [
        beanRow({ bean_id: null, bean_snapshot: { name: "Deleted Bean" } }),
      ]),
    ).toMatchObject({
      brewMethodId: null,
      brewMethodSnapshot: { name: "Deleted Method" },
      ratios: [{ id: null, value: 60, roastLevel: "medium", beanSnapshot: { name: "Deleted Bean" } }],
    });
  });

  test("maps individual version beans without exposing DB-only row fields", () => {
    expect(toRecipeVersionBean(beanRow({ id: "row-id", created_at: "created", updated_at: "updated" }))).toEqual({
      id: beanId,
      value: 60,
      roastLevel: "medium",
      beanSnapshot: { id: beanId, name: "Ethiopia" },
    });
  });

  test("builds camelCase RPC payload from application recipe shape", () => {
    const payload = toSavePayload({
      seriesId,
      seriesName: "Morning Blend",
      goal: "daily cup",
      id: version2Id,
      name: "Morning Blend",
      version: 2,
      changeNote: "more body",
      ratios: [
        { id: beanId, value: 60, roastLevel: "medium", beanSnapshot: { id: beanId, name: "Ethiopia" } },
        { id: null, value: 40, roastLevel: "full-city", beanSnapshot: { name: "Deleted Brazil" } },
      ],
      doseGram: 20,
      brewRatio: 16,
      targetBrewGram: 320,
      blendCost: 120.5,
      grindSize: "medium_fine",
      brewTemperatureC: 92,
      brewMethodId,
      brewMethodSnapshot: { id: brewMethodId, name: "4 pour" },
      sensory: { flavor: 8 },
      memo: "balanced",
      savedAt: "2026-01-02T00:00:00.000Z",
    });

    expect(payload).toEqual({
      seriesId,
      seriesName: "Morning Blend",
      goal: "daily cup",
      name: "Morning Blend",
      changeNote: "more body",
      tastingNote: "balanced",
      doseGram: 20,
      brewRatio: 16,
      targetBrewGram: 320,
      blendCost: 120.5,
      grindSize: "medium_fine",
      brewTemperatureC: 92,
      brewMethodId,
      brewMethodSnapshot: { id: brewMethodId, name: "4 pour" },
      sensory: { flavor: 8 },
      savedAt: "2026-01-02T00:00:00.000Z",
      beans: [
        { beanId, ratio: 60, roastLevel: "medium", beanSnapshot: { id: beanId, name: "Ethiopia" }, position: 0 },
        { beanId: null, ratio: 40, roastLevel: "full-city", beanSnapshot: { name: "Deleted Brazil" }, position: 1 },
      ],
    });
  });

  test("builds payload from editor-oriented names without legacy ID conversion", () => {
    expect(
      toSavePayload({
        editingRecipeSource: { seriesId },
        blendName: "Draft Blend",
        memo: "",
        beans: [{ beanId: "old-string-id", ratio: 100 }],
      }),
    ).toMatchObject({
      seriesId,
      seriesName: "Draft Blend",
      name: "Draft Blend",
      beans: [{ beanId: "old-string-id", ratio: 100, roastLevel: "", beanSnapshot: {}, position: 0 }],
    });
  });

  test("normalizes empty brew method IDs to null without dropping snapshots", () => {
    expect(
      toSavePayload({
        name: "Snapshot Blend",
        brewMethodId: "",
        brewMethodSnapshot: { id: "deleted-method", name: "Deleted Method" },
        ratios: [{ id: null, value: 100 }],
      }),
    ).toMatchObject({
      brewMethodId: null,
      brewMethodSnapshot: { id: "deleted-method", name: "Deleted Method" },
    });

    expect(
      toSavePayload({
        name: "Current Blend",
        brewMethodId,
        ratios: [{ id: null, value: 100 }],
      }).brewMethodId,
    ).toBe(brewMethodId);
  });
});

function seriesRow(overrides = {}) {
  return {
    id: seriesId,
    name: "Morning Blend",
    goal: "daily cup",
    status: "active",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-02T00:00:00.000Z",
    ...overrides,
  };
}

function versionRow(overrides = {}) {
  return {
    id: version2Id,
    series_id: seriesId,
    version_number: 2,
    name: "Morning Blend",
    change_note: "more body",
    tasting_note: "balanced",
    dose_gram: 20,
    brew_ratio: 16,
    target_brew_gram: 320,
    blend_cost: 120.5,
    grind_size: "medium_fine",
    brew_temperature_c: 92,
    brew_method_id: brewMethodId,
    brew_method_snapshot: { id: brewMethodId, name: "4 pour" },
    sensory: { flavor: 8 },
    saved_at: "2026-01-02T00:00:00.000Z",
    created_at: "2026-01-02T00:00:00.000Z",
    updated_at: "2026-01-02T00:00:00.000Z",
    ...overrides,
  };
}

function beanRow(overrides = {}) {
  return {
    id: "55555555-5555-4555-8555-555555555555",
    recipe_version_id: version2Id,
    bean_id: beanId,
    ratio: 60,
    roast_level: "medium",
    bean_snapshot: { id: beanId, name: "Ethiopia" },
    position: 0,
    created_at: "2026-01-02T00:00:00.000Z",
    updated_at: "2026-01-02T00:00:00.000Z",
    ...overrides,
  };
}
