import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { createApiServer } from "./index.js";
import {
  currentRecipeSeriesFixture,
  fixtureBeanSnapshots,
  fixtureBrewMethod,
  legacyRecipeFixture,
} from "../src/domain/coffee/recipeSeries.fixtures.js";
import { normalizeRecipeSeries } from "../src/domain/coffee/recipeSeries.js";

let dbModule;
let server;
let baseUrl;
let tempDir;
let dbPath;

beforeEach(async () => {
  tempDir = mkdtempSync(join(tmpdir(), "coffee-manager-api-"));
  dbPath = join(tempDir, "test.sqlite");
  process.env.COFFEE_MANAGER_DB_PATH = dbPath;
  dbModule = dbModule || await import("./db.js");
  dbModule.configureDb(dbPath);
  server = await listen(createApiServer(dbModule));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterEach(async () => {
  if (server) {
    await closeServer(server);
    server = undefined;
  }
  dbModule?.closeDb();
  delete process.env.COFFEE_MANAGER_DB_PATH;
  if (tempDir) {
    rmSync(tempDir, { recursive: true, force: true });
    tempDir = undefined;
  }
});

describe("SQLite API recipe compatibility", () => {
  test("gets initial state from an empty temporary database", async () => {
    const state = await getJson("/api/state");

    expect(state.beans).toHaveLength(4);
    expect(state.brewMethods).toHaveLength(2);
    expect(state.selectedBrewMethodId).toBe("standard-4-pour");
    expect(state.recipeSeries).toEqual([]);
    expect(state.recipes).toEqual([]);
  });

  test("saves and reloads current RecipeSeries with snapshots, tasting data, memo, and timestamps", async () => {
    await putJson("/api/recipes", { recipeSeries: [currentRecipeSeriesFixture] });

    const state = await getJson("/api/state");
    expect(state.recipeSeries).toHaveLength(1);
    expect(state.recipes).toHaveLength(2);

    const [series] = state.recipeSeries;
    expect(series).toMatchObject({
      id: "series-1700000000000",
      name: "Morning Blend",
      goal: "",
      status: "active",
      currentVersionId: "recipe-1700000001000",
      createdAt: "2026-05-17T09:00:00.000Z",
      updatedAt: "2026-05-18T09:00:00.000Z",
    });
    expect(series.versions.map((version) => version.version)).toEqual([2, 1]);
    expect(series.versions[0]).toMatchObject({
      id: "recipe-1700000001000",
      seriesId: "series-1700000000000",
      name: "Morning Blend",
      changeNote: "ブラジルを増やした",
      memo: "甘みを少し強めた",
      doseGram: 20,
      brewRatio: 16,
      targetBrewGram: 320,
      blendCost: 98.4,
      brewMethodId: "standard-4-pour",
      brewMethodSnapshot: fixtureBrewMethod,
      sensory: { fragrance: 8, flavor: 7.5, aftertaste: 7, balance: 8 },
      savedAt: "2026-05-18T09:00:00.000Z",
    });
    expect(series.versions[0].ratios).toEqual([
      { id: "ethiopia", value: 55, beanSnapshot: fixtureBeanSnapshots[0] },
      { id: "brazil", value: 45, beanSnapshot: fixtureBeanSnapshots[1] },
    ]);
  });

  test("uses legacy recipes payload when recipeSeries is absent", async () => {
    await putJson("/api/recipes", { recipes: [legacyRecipeFixture] });

    const state = await getJson("/api/state");
    expect(state.recipeSeries).toHaveLength(1);
    expect(state.recipeSeries[0]).toMatchObject({
      id: "series-recipe-1700000000000",
      name: "Morning Blend",
      goal: "",
      status: "active",
      currentVersionId: "recipe-1700000000000",
      createdAt: "2026-05-17T09:00:00.000Z",
      updatedAt: "2026-05-17T09:00:00.000Z",
    });
    expect(state.recipeSeries[0].versions[0]).toMatchObject({
      id: "recipe-1700000000000",
      seriesId: "series-recipe-1700000000000",
      version: 1,
      changeNote: "",
      memo: "明るい香りと丸い甘み",
      brewMethodSnapshot: fixtureBrewMethod,
      sensory: { fragrance: 8, flavor: 7.5, aftertaste: 7, balance: 8 },
    });
  });

  test("prefers recipeSeries over recipes in the save payload", async () => {
    await putJson("/api/recipes", { recipeSeries: [], recipes: [legacyRecipeFixture] });

    const state = await getJson("/api/state");
    expect(state.recipeSeries).toEqual([]);
    expect(state.recipes).toEqual([]);
  });

  test("persists data after server and DB restart", async () => {
    await putJson("/api/recipes", { recipeSeries: [currentRecipeSeriesFixture] });
    await closeServer(server);
    server = undefined;
    dbModule.closeDb();

    dbModule.configureDb(dbPath);
    server = await listen(createApiServer(dbModule));
    baseUrl = `http://127.0.0.1:${server.address().port}`;

    const state = await getJson("/api/state");
    expect(state.recipeSeries[0].id).toBe("series-1700000000000");
    expect(state.recipeSeries[0].versions.map((version) => version.version)).toEqual([2, 1]);
  });

  test("saves and gets empty recipe arrays", async () => {
    await putJson("/api/recipes", { recipeSeries: [currentRecipeSeriesFixture] });
    await putJson("/api/recipes", { recipeSeries: [] });

    const state = await getJson("/api/state");
    expect(state.recipeSeries).toEqual([]);
    expect(state.recipes).toEqual([]);
  });

  test("returns the current 500 response for invalid JSON", async () => {
    const response = await fetch(`${baseUrl}/api/recipes`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: "{",
    });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toContain("JSON");
  });

  test("applies current server fallbacks for missing optional fields", async () => {
    await putJson("/api/recipes", {
      recipeSeries: [
        {
          id: "series-minimal",
          versions: [
            {
              id: "recipe-minimal",
              name: "Minimal Recipe",
              ratios: [],
              savedAt: "2026-05-24T09:00:00.000Z",
            },
          ],
        },
      ],
    });

    const state = await getJson("/api/state");
    expect(state.recipeSeries[0]).toMatchObject({
      id: "series-minimal",
      name: "Minimal Recipe",
      goal: "",
      status: "active",
      currentVersionId: "recipe-minimal",
      createdAt: "2026-05-24T09:00:00.000Z",
      updatedAt: "2026-05-24T09:00:00.000Z",
    });
    expect(state.recipeSeries[0].versions[0]).toMatchObject({
      id: "recipe-minimal",
      version: 1,
      changeNote: "",
      memo: "",
      doseGram: 0,
      brewRatio: 0,
      targetBrewGram: 0,
      blendCost: 0,
      brewMethodId: null,
      brewMethodSnapshot: null,
      sensory: {},
      savedAt: "2026-05-24T09:00:00.000Z",
    });
  });

  test("drops unknown relational fields but preserves unknown data inside JSON snapshots", async () => {
    await putJson("/api/recipes", {
      recipeSeries: [
        {
          ...currentRecipeSeriesFixture,
          unknownSeriesField: "drop-me",
          versions: [
            {
              ...currentRecipeSeriesFixture.versions[0],
              unknownVersionField: "drop-me",
              brewMethodSnapshot: { ...fixtureBrewMethod, unknownSnapshotField: "keep-me" },
              ratios: [
                {
                  id: "ethiopia",
                  value: 55,
                  unknownRatioField: "drop-me",
                  beanSnapshot: { ...fixtureBeanSnapshots[0], unknownSnapshotField: "keep-me" },
                },
              ],
            },
          ],
        },
      ],
    });

    const state = await getJson("/api/state");
    const series = state.recipeSeries[0];
    const version = series.versions[0];

    expect(series.unknownSeriesField).toBeUndefined();
    expect(version.unknownVersionField).toBeUndefined();
    expect(version.ratios[0].unknownRatioField).toBeUndefined();
    expect(version.brewMethodSnapshot.unknownSnapshotField).toBe("keep-me");
    expect(version.ratios[0].beanSnapshot.unknownSnapshotField).toBe("keep-me");
  });

  test("matches frontend normalization for current RecipeSeries representative fields", async () => {
    await putJson("/api/recipes", { recipeSeries: [currentRecipeSeriesFixture] });

    const state = await getJson("/api/state");
    const frontend = normalizeRecipeSeries([currentRecipeSeriesFixture], []);
    const server = state.recipeSeries;

    expect(server).toHaveLength(frontend.length);
    expect(pickCompatibilityFields(server[0])).toEqual(pickCompatibilityFields(frontend[0]));
  });

  test("documents the current frontend/server difference for legacy changeNote fallback", async () => {
    await putJson("/api/recipes", { recipes: [legacyRecipeFixture] });

    const state = await getJson("/api/state");
    const frontend = normalizeRecipeSeries([], [legacyRecipeFixture]);

    expect(state.recipeSeries[0].id).toBe(frontend[0].id);
    expect(state.recipeSeries[0].versions[0].version).toBe(frontend[0].versions[0].version);
    expect(state.recipeSeries[0].versions[0].changeNote).toBe("");
    expect(frontend[0].versions[0].changeNote).toBe("既存レシピから移行");
  });
});

function pickCompatibilityFields(series) {
  return {
    id: series.id,
    status: series.status,
    goal: series.goal,
    createdAt: series.createdAt,
    versions: series.versions.map((version) => ({
      id: version.id,
      seriesId: version.seriesId,
      version: version.version,
      changeNote: version.changeNote,
      beanSnapshot: version.ratios[0]?.beanSnapshot,
      brewMethodSnapshot: version.brewMethodSnapshot,
      profile: version.ratios[0]?.beanSnapshot?.profile,
      blendCost: version.blendCost,
      sensory: version.sensory,
      memo: version.memo,
      savedAt: version.savedAt,
    })),
  };
}

async function getJson(path) {
  const response = await fetch(`${baseUrl}${path}`);
  expect(response.ok).toBe(true);
  return response.json();
}

async function putJson(path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  expect(response.ok).toBe(true);
  return response.json();
}

function listen(apiServer) {
  return new Promise((resolve) => {
    apiServer.listen(0, "127.0.0.1", () => resolve(apiServer));
  });
}

function closeServer(apiServer) {
  return new Promise((resolve, reject) => {
    apiServer.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}
