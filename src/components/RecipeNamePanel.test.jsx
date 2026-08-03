import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { RecipeNamePanel } from "./RecipeNamePanel.jsx";

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

describe("RecipeNamePanel", () => {
  test("renders existing series name and blend description", () => {
    renderRecipeNamePanel();

    const inputs = document.querySelectorAll("input");
    const textarea = document.querySelector("textarea");
    expect(inputs[0].value).toBe("Morning Blend");
    expect(textarea.value).toBe("Sweet morning cup");
    expect(formLabels()).toEqual(["シリーズ名", "ブレンド説明"]);
  });

  test("renders new series heading when no editing source exists", () => {
    renderRecipeNamePanel({ editingRecipeSource: null });

    expect(document.querySelector("#recipeNameTitle").textContent).toBe("新規シリーズ作成");
    expect(document.querySelector("button")).toBeNull();
  });

  test("renders next version heading when editing source exists", () => {
    renderRecipeNamePanel({ editingRecipeSource: { seriesId: "series-1", versionId: "recipe-1" } });

    expect(document.querySelector("#recipeNameTitle").textContent).toBe("次バージョン作成");
    expect(document.querySelector("button")).toBeNull();
  });

  test("calls input callbacks with raw event values", () => {
    const onNameChange = vi.fn();
    const onBlendGoalChange = vi.fn();
    renderRecipeNamePanel({ onNameChange, onBlendGoalChange });
    const input = document.querySelector("input");
    const textarea = document.querySelector("textarea");

    change(input, "  Updated Blend  ");
    change(textarea, "  Balanced daily cup  ");

    expect(onNameChange).toHaveBeenCalledWith("  Updated Blend  ");
    expect(onBlendGoalChange).toHaveBeenCalledWith("  Balanced daily cup  ");
  });

  test("does not render save controls", () => {
    renderRecipeNamePanel({ blendName: "", blendGoal: "" });

    expect(document.querySelectorAll("button")).toHaveLength(0);
    expect(document.querySelector(".inline-warning")).toBeNull();
    expect(document.querySelector(".save-toast")).toBeNull();
  });

  test("keeps input and description attributes", () => {
    renderRecipeNamePanel();

    expect(document.querySelector("input").getAttribute("maxLength")).toBe("28");
    expect(document.querySelector("textarea").getAttribute("maxLength")).toBe("160");
    expect(document.querySelector("textarea").getAttribute("rows")).toBe("2");
    expect(document.querySelector("textarea").getAttribute("placeholder")).toBe("目指す味、構成、飲みたいシーン");
  });

  test("renders from props only", () => {
    renderRecipeNamePanel({
      blendName: "Props Blend",
      blendGoal: "Props description",
      editingRecipeSource: undefined,
    });

    expect(document.querySelectorAll("input")).toHaveLength(1);
    expect(document.querySelectorAll("textarea")).toHaveLength(1);
    expect(document.querySelector("input").value).toBe("Props Blend");
    expect(document.querySelector("textarea").value).toBe("Props description");
  });
});

function renderRecipeNamePanel(overrides = {}) {
  const props = {
    blendName: "Morning Blend",
    blendGoal: "Sweet morning cup",
    editingRecipeSource: null,
    onNameChange: vi.fn(),
    onBlendGoalChange: vi.fn(),
    ...overrides,
  };

  act(() => {
    root = createRoot(container);
    root.render(<RecipeNamePanel {...props} />);
  });

  return props;
}

function change(input, value) {
  act(() => {
    reactProps(input).onChange({ target: { value } });
  });
}

function reactProps(element) {
  const key = Object.keys(element).find((item) => item.startsWith("__reactProps$"));
  return element[key];
}

function formLabels() {
  return [...document.querySelectorAll(".recipe-name-form label")].map((label) => label.childNodes[0].textContent.trim());
}
