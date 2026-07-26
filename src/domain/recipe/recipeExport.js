import { getRecipeBean, getRecipeBrewMethod } from "../coffee/recipeSeries.js";

export const RECIPE_JSON_FILE_NAME = "coffee-blend-recipes.json";
export const RECIPE_CSV_FILE_NAME = "coffee-blend-recipes.csv";
export const RECIPE_JSON_MIME_TYPE = "application/json";
export const RECIPE_CSV_MIME_TYPE = "text/csv";

export const recipeCsvHeader = [
  "name",
  "seriesName",
  "version",
  "savedAt",
  "changeNote",
  "doseGram",
  "targetBrewGram",
  "blendCost",
  "bean",
  "ratio",
  "costPerKg",
  "brewMethod",
  "bloomPercent",
  "pour1Percent",
  "pour2Percent",
  "pour3Percent",
  "fragrance",
  "flavor",
  "aftertaste",
  "balance",
  "memo",
];

export function buildRecipeExportData({ recipeSeries, beans, brewMethods }) {
  return recipeSeries.flatMap((series) =>
    series.versions.map((recipe) => ({
      ...recipe,
      seriesName: series.name,
      seriesStatus: series.status,
      brewMethodSnapshot: getRecipeBrewMethod(recipe, brewMethods),
      beans: recipe.ratios.map((ratio) => {
        const bean = getRecipeBean(ratio, beans);
        return { name: bean?.name || ratio.id, ratio: ratio.value, costPerKg: bean?.costPerKg || 0 };
      }),
    })),
  );
}

export function buildRecipeJson({ recipeSeries, beans, brewMethods }) {
  return JSON.stringify(buildRecipeExportData({ recipeSeries, beans, brewMethods }), null, 2);
}

export function buildRecipeCsv({ recipeSeries, beans, brewMethods }) {
  const rows = [recipeCsvHeader];
  buildRecipeExportData({ recipeSeries, beans, brewMethods }).forEach((recipe) => {
    recipe.beans.forEach((bean) => {
      rows.push([
        recipe.name,
        recipe.seriesName,
        recipe.version || "",
        recipe.savedAt,
        recipe.changeNote || "",
        recipe.doseGram || "",
        recipe.targetBrewGram || "",
        recipe.blendCost || "",
        bean.name,
        bean.ratio,
        bean.costPerKg,
        recipe.brewMethodSnapshot?.name || "",
        recipe.brewMethodSnapshot?.bloomPercent ?? "",
        recipe.brewMethodSnapshot?.pour1Percent ?? "",
        recipe.brewMethodSnapshot?.pour2Percent ?? "",
        recipe.brewMethodSnapshot?.pour3Percent ?? "",
        recipe.sensory?.fragrance ?? "",
        recipe.sensory?.flavor ?? "",
        recipe.sensory?.aftertaste ?? "",
        recipe.sensory?.balance ?? "",
        recipe.memo || "",
      ]);
    });
  });
  return rows.map(toCsvRow).join("\n");
}

export function buildRecipeExportFile({ format, recipeSeries, beans, brewMethods }) {
  if (format === "json") {
    return {
      fileName: RECIPE_JSON_FILE_NAME,
      content: buildRecipeJson({ recipeSeries, beans, brewMethods }),
      mimeType: RECIPE_JSON_MIME_TYPE,
    };
  }

  return {
    fileName: RECIPE_CSV_FILE_NAME,
    content: buildRecipeCsv({ recipeSeries, beans, brewMethods }),
    mimeType: RECIPE_CSV_MIME_TYPE,
  };
}

export function toCsvRow(row) {
  return row.map(escapeCsvValue).join(",");
}

export function escapeCsvValue(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}
