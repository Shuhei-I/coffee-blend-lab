import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { currentRecipeSeriesFixture, fixtureBeans, fixtureBrewMethod } from "../domain/coffee/recipeSeries.fixtures.js";
import { RecipeLibrary } from "./RecipeLibrary.jsx";

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

describe("RecipeLibrary", () => {
  test("renders the existing empty state", () => {
    renderRecipeLibrary({ recipeSeries: [] });

    expect(document.body.textContent).toContain("保存したブレンドシリーズがここに並びます。比率を決めたら Save を押してください。");
  });

  test("toggles archived recipes without changing visible ordering", () => {
    renderRecipeLibrary({ recipeSeries: [seriesFixture({ name: "Active" }), seriesFixture({ id: "archived", name: "Archived Series", status: "archived" })] });

    expect(seriesNames()).toEqual(["Active"]);
    expect(document.body.textContent).not.toContain("Archived Series");

    click(buttonByText("Archived"));

    expect(seriesNames()).toEqual(["Active", "Archived SeriesArchived"]);
    expect(buttonByText("Hide archived")).toBeTruthy();
    expect(document.body.textContent).not.toContain("Archived 1");
  });

  test("expands and collapses version rows", () => {
    renderRecipeLibrary({ recipeSeries: [seriesFixture()] });
    const toggle = document.querySelector(".toggle-versions-button");

    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(document.querySelector(".version-list")).toBeNull();

    click(toggle);

    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect([...document.querySelectorAll(".version-row strong")].map((item) => item.textContent)).toEqual(["v2", "v1"]);
    expect([...document.querySelectorAll(".version-row span")].map((item) => item.textContent)).toEqual([
      "甘みを少し強めた",
      "配合エチオピア 55% / ブラジル 45%",
      "抽出標準 4投式 / 蒸らし12% 30秒 / 100%",
      "明るい香りと丸い甘み",
      "配合エチオピア 60% / ブラジル 40%",
      "抽出標準 4投式 / 蒸らし12% 30秒 / 100%",
    ]);
    expect(document.querySelector(".recipe-series-goal").textContent).toBe("朝に飲みやすい甘み重視のブレンド");

    click(toggle);

    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(document.querySelector(".version-list")).toBeNull();
  });

  test("calls load callbacks for latest and version rows", () => {
    const onLoad = vi.fn();
    const onLoaded = vi.fn();
    renderRecipeLibrary({ recipeSeries: [seriesFixture()], onLoad, onLoaded });

    click(buttonByText("Latest"));
    expect(onLoad).toHaveBeenCalledWith(expect.objectContaining({ id: "recipe-1700000001000" }), expect.objectContaining({ id: "series-1700000000000" }));
    expect(onLoaded).toHaveBeenCalledTimes(1);

    click(document.querySelector(".toggle-versions-button"));
    click(buttonByText("Load"));

    expect(onLoad).toHaveBeenLastCalledWith(expect.objectContaining({ id: "recipe-1700000001000" }), expect.objectContaining({ id: "series-1700000000000" }));
    expect(onLoaded).toHaveBeenCalledTimes(2);
  });

  test("calls archive, restore, and version delete callbacks while hiding exports", () => {
    const onArchive = vi.fn();
    const onRestore = vi.fn();
    const onDeleteVersion = vi.fn();
    const onExport = vi.fn();
    renderRecipeLibrary({
      recipeSeries: [seriesFixture(), seriesFixture({ id: "archived", name: "Archived Series", status: "archived" })],
      onArchive,
      onRestore,
      onDeleteVersion,
      onExport,
    });

    expect(buttonByText("JSON")).toBeUndefined();
    expect(buttonByText("CSV")).toBeUndefined();

    click(document.querySelector(".archive-button"));
    expect(onArchive).toHaveBeenCalledWith("series-1700000000000");

    click(buttonByText("Archived"));
    click(document.querySelector(".restore-button"));
    expect(onRestore).toHaveBeenCalledWith("archived");

    expect(onExport).not.toHaveBeenCalled();

    click(document.querySelector(".toggle-versions-button"));
    click(buttonByText("Delete"));
    expect(onDeleteVersion).toHaveBeenCalledWith("series-1700000000000", "recipe-1700000001000");
  });
});

function renderRecipeLibrary(overrides = {}) {
  const props = {
    recipeSeries: [seriesFixture()],
    beans: fixtureBeans,
    brewMethods: [fixtureBrewMethod],
    onLoad: vi.fn(),
    onArchive: vi.fn(),
    onRestore: vi.fn(),
    onDeleteVersion: vi.fn(),
    onExport: vi.fn(),
    onLoaded: vi.fn(),
    ...overrides,
  };

  act(() => {
    root = createRoot(container);
    root.render(<RecipeLibrary {...props} />);
  });

  return props;
}

function seriesFixture(patch = {}) {
  return {
    ...JSON.parse(JSON.stringify(currentRecipeSeriesFixture)),
    ...patch,
  };
}

function click(element) {
  act(() => {
    element.click();
  });
}

function buttonByText(text) {
  return [...document.querySelectorAll("button")].find((button) => button.textContent === text);
}

function seriesNames() {
  return [...document.querySelectorAll(".recipe-series-head strong")].map((item) => item.textContent);
}
