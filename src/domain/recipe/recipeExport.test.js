import { describe, expect, test } from "vitest";
import {
  buildRecipeCsv,
  buildRecipeExportData,
  buildRecipeExportFile,
  buildRecipeJson,
  escapeCsvValue,
  recipeCsvHeader,
  RECIPE_CSV_FILE_NAME,
  RECIPE_CSV_MIME_TYPE,
  RECIPE_JSON_FILE_NAME,
  RECIPE_JSON_MIME_TYPE,
} from "./recipeExport.js";

const beans = [
  { id: "ethiopia", name: "Ethiopia, Natural", costPerKg: 5800 },
  { id: "brazil", name: "Brazil \"No.2\"", costPerKg: 3600 },
];

const brewMethods = [
  {
    id: "standard",
    name: "Standard",
    bloomPercent: 12,
    pour1Percent: 28,
    pour2Percent: 30,
    pour3Percent: 30,
  },
];

const recipeSeries = [
  {
    id: "series-1",
    name: "Morning Blend",
    status: "active",
    versions: [
      {
        id: "recipe-2",
        seriesId: "series-1",
        name: "Morning Blend",
        version: 2,
        savedAt: "2026-05-18T09:00:00.000Z",
        changeNote: "More \"Brazil\"",
        doseGram: 20,
        targetBrewGram: 320,
        blendCost: 98.4,
        brewMethodId: "standard",
        ratios: [
          { id: "ethiopia", value: 55 },
          { id: "brazil", value: 45 },
        ],
        sensory: { fragrance: 8, flavor: 7.5, aftertaste: 7, balance: 8 },
        memo: "甘み,\n強め",
      },
      {
        id: "recipe-1",
        seriesId: "series-1",
        name: "Morning Blend",
        version: 1,
        savedAt: "2026-05-17T09:00:00.000Z",
        changeNote: "",
        doseGram: 18,
        targetBrewGram: 288,
        blendCost: 80,
        brewMethodId: "missing",
        brewMethodSnapshot: {
          id: "snapshot",
          name: "Snapshot Method",
          bloomPercent: null,
          pour1Percent: undefined,
          pour2Percent: 50,
          pour3Percent: 50,
        },
        ratios: [
          {
            id: "unknown",
            value: 100,
            beanSnapshot: { id: "unknown", name: "Snapshot Bean", costPerKg: undefined },
          },
        ],
        sensory: null,
        memo: "",
      },
    ],
  },
  {
    id: "series-2",
    name: "Archived Series",
    status: "archived",
    versions: [
      {
        id: "recipe-3",
        seriesId: "series-2",
        name: "Archived",
        version: 1,
        savedAt: "2026-05-19T09:00:00.000Z",
        changeNote: "Archived",
        doseGram: 10,
        targetBrewGram: 160,
        blendCost: 0,
        brewMethodId: "standard",
        ratios: [{ id: "ethiopia", value: 100 }],
        sensory: { fragrance: 1, flavor: 2, aftertaste: 3, balance: 4 },
        memo: undefined,
      },
    ],
  },
];

describe("recipe export", () => {
  test("builds existing flattened JSON export data including archive and snapshots", () => {
    const payload = buildRecipeExportData({ recipeSeries, beans, brewMethods });

    expect(payload).toHaveLength(3);
    expect(payload.map((recipe) => recipe.id)).toEqual(["recipe-2", "recipe-1", "recipe-3"]);
    expect(payload[0]).toMatchObject({
      seriesName: "Morning Blend",
      seriesStatus: "active",
      brewMethodSnapshot: brewMethods[0],
      beans: [
        { name: "Ethiopia, Natural", ratio: 55, costPerKg: 5800 },
        { name: "Brazil \"No.2\"", ratio: 45, costPerKg: 3600 },
      ],
      sensory: { fragrance: 8, flavor: 7.5, aftertaste: 7, balance: 8 },
      memo: "甘み,\n強め",
    });
    expect(payload[1].brewMethodSnapshot.name).toBe("Snapshot Method");
    expect(payload[1].beans).toEqual([{ name: "Snapshot Bean", ratio: 100, costPerKg: 0 }]);
    expect(payload[2].seriesStatus).toBe("archived");
  });

  test("builds parseable indented JSON with existing file metadata", () => {
    const file = buildRecipeExportFile({ format: "json", recipeSeries, beans, brewMethods });
    const json = buildRecipeJson({ recipeSeries, beans, brewMethods });

    expect(file).toEqual({ fileName: RECIPE_JSON_FILE_NAME, content: json, mimeType: RECIPE_JSON_MIME_TYPE });
    expect(file.fileName).toBe("coffee-blend-recipes.json");
    expect(JSON.parse(json)[0].id).toBe("recipe-2");
    expect(json).toContain('\n    "id": "recipe-2"');
  });

  test("builds empty JSON and CSV exports", () => {
    expect(buildRecipeJson({ recipeSeries: [], beans, brewMethods })).toBe("[]");
    expect(buildRecipeCsv({ recipeSeries: [], beans, brewMethods })).toBe(recipeCsvHeader.map(escapeCsvValue).join(","));
  });

  test("builds CSV with existing header, column order, record order, newline, and no BOM", () => {
    const csv = buildRecipeCsv({ recipeSeries, beans, brewMethods });
    const lines = csv.split("\n");

    expect(csv.charCodeAt(0)).not.toBe(0xfeff);
    expect(lines[0]).toBe(recipeCsvHeader.map(escapeCsvValue).join(","));
    const firstRecord = [
      "Morning Blend",
      "Morning Blend",
      2,
      "2026-05-18T09:00:00.000Z",
      "More \"Brazil\"",
      20,
      320,
      98.4,
      "Ethiopia, Natural",
      55,
      5800,
      "Standard",
      12,
      28,
      30,
      30,
      8,
      7.5,
      7,
      8,
      "甘み,\n強め",
    ].map(escapeCsvValue).join(",");

    expect(csv.startsWith(`${lines[0]}\n${firstRecord}`)).toBe(true);
    expect(csv).toContain('"Ethiopia, Natural"');
    expect(csv).toContain('"More ""Brazil"""');
    expect(csv).toContain('"甘み,\n強め"');
    expect(csv).toContain('"Archived","Archived Series","1"');
  });

  test("keeps existing CSV empty, null, undefined, number, boolean, comma, quote, newline, and Japanese escaping", () => {
    expect(escapeCsvValue("")).toBe('""');
    expect(escapeCsvValue(null)).toBe('"null"');
    expect(escapeCsvValue(undefined)).toBe('"undefined"');
    expect(escapeCsvValue(12.5)).toBe('"12.5"');
    expect(escapeCsvValue(true)).toBe('"true"');
    expect(escapeCsvValue("a,b")).toBe('"a,b"');
    expect(escapeCsvValue('a"b')).toBe('"a""b"');
    expect(escapeCsvValue("a\nb")).toBe('"a\nb"');
    expect(escapeCsvValue("日本語")).toBe('"日本語"');
  });

  test("builds CSV file metadata and defaults non-json formats to CSV", () => {
    const csv = buildRecipeCsv({ recipeSeries, beans, brewMethods });

    expect(buildRecipeExportFile({ format: "csv", recipeSeries, beans, brewMethods })).toEqual({
      fileName: RECIPE_CSV_FILE_NAME,
      content: csv,
      mimeType: RECIPE_CSV_MIME_TYPE,
    });
    expect(buildRecipeExportFile({ format: "unknown", recipeSeries: [], beans, brewMethods })).toEqual({
      fileName: "coffee-blend-recipes.csv",
      content: recipeCsvHeader.map(escapeCsvValue).join(","),
      mimeType: "text/csv",
    });
  });
});
