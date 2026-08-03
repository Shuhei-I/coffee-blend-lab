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
  test("renders existing series name, blend description, and save message", () => {
    renderRecipeNamePanel({ saveMessage: "Recipe v1 を登録しました" });

    const inputs = document.querySelectorAll("input");
    const textarea = document.querySelector("textarea");
    expect(inputs[0].value).toBe("Morning Blend");
    expect(textarea.value).toBe("Sweet morning cup");
    expect(formLabels()).toEqual(["シリーズ名", "ブレンド説明"]);
    expect(document.querySelector(".save-toast").textContent).toBe("Recipe v1 を登録しました");
  });

  test("renders new series heading when no editing source exists", () => {
    renderRecipeNamePanel({ editingRecipeSource: null });

    expect(document.querySelector("#recipeNameTitle").textContent).toBe("新規シリーズ作成");
    expect(buttonByText("Save")).toBeTruthy();
  });

  test("renders next version heading when editing source exists", () => {
    renderRecipeNamePanel({ editingRecipeSource: { seriesId: "series-1", versionId: "recipe-1" } });

    expect(document.querySelector("#recipeNameTitle").textContent).toBe("次バージョン作成");
    expect(buttonByText("Save")).toBeTruthy();
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

  test("submits through existing save callback", () => {
    const onSave = vi.fn((event) => event.preventDefault());
    renderRecipeNamePanel({ onSave });

    act(() => {
      document.querySelector("form").dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true }));
    });

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0].type).toBe("submit");
  });

  test("keeps existing button and disabled behavior", () => {
    renderRecipeNamePanel({ blendName: "", blendGoal: "" });

    const buttons = document.querySelectorAll("button");
    expect(buttons).toHaveLength(1);
    expect(buttons[0].textContent).toBe("Save");
    expect(buttons[0].type).toBe("submit");
    expect(buttons[0].title).toBe("保存");
    expect(buttons[0].disabled).toBe(false);
  });

  test("keeps input and description attributes", () => {
    renderRecipeNamePanel();

    expect(document.querySelector("input").getAttribute("maxLength")).toBe("28");
    expect(document.querySelector("textarea").getAttribute("maxLength")).toBe("160");
    expect(document.querySelector("textarea").getAttribute("rows")).toBe("2");
    expect(document.querySelector("textarea").getAttribute("placeholder")).toBe("目指す味、構成、飲みたいシーン");
  });

  test("does not render save message when empty", () => {
    renderRecipeNamePanel({ saveMessage: "" });

    expect(document.querySelector(".save-toast")).toBeNull();
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
    saveMessage: "",
    editingRecipeSource: null,
    onNameChange: vi.fn(),
    onBlendGoalChange: vi.fn(),
    onSave: vi.fn((event) => event.preventDefault()),
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

function buttonByText(text) {
  return [...document.querySelectorAll("button")].find((button) => button.textContent === text);
}

function formLabels() {
  return [...document.querySelectorAll(".recipe-name-form label")].map((label) => label.childNodes[0].textContent.trim());
}
