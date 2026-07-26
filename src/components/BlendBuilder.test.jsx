import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { BlendBuilder } from "./BlendBuilder.jsx";
import { roastLevelOptions } from "../domain/coffee/roast.js";

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

describe("BlendBuilder", () => {
  test("renders blend rows in existing order", () => {
    renderBlendBuilder();

    expect([...document.querySelectorAll(".bean-name")].map((item) => item.childNodes[0].textContent.trim())).toEqual([
      "Ethiopia",
      "Brazil",
      "Kenya",
    ]);
    expect([...document.querySelectorAll(".bean-note")].map((item) => item.textContent)).toEqual([
      "Floral",
      "Nutty",
      "Hidden",
    ]);
  });

  test("renders selected bean state and roast level selects from props", () => {
    renderBlendBuilder();

    const selects = document.querySelectorAll("select");
    expect(selects).toHaveLength(3);
    expect(selects[0].value).toBe("full-city");
    expect([...selects[0].options].map((option) => [option.value, option.textContent])).toEqual(roastLevelOptions);
    expect([...document.querySelectorAll(".bean-item")].map((row) => row.querySelector(".swatch").getAttribute("style"))).toEqual([
      "background: rgb(18, 101, 107);",
      "background: rgb(184, 82, 67);",
      "background: rgb(84, 116, 90);",
    ]);
  });

  test("calls roast level callback with bean id and selected value", () => {
    const onRoastLevelChange = vi.fn();
    renderBlendBuilder({ onRoastLevelChange });

    change(document.querySelector("select"), "city");

    expect(onRoastLevelChange).toHaveBeenCalledWith("ethiopia", "city");
  });

  test("calls the same ratio callback from slider and step buttons", () => {
    const onRatioChange = vi.fn();
    renderBlendBuilder({ onRatioChange });
    const firstRow = document.querySelector(".bean-item");

    click(firstRow.querySelectorAll("button")[0]);
    change(firstRow.querySelector("input"), "45");
    click(firstRow.querySelectorAll("button")[1]);

    expect(onRatioChange).toHaveBeenNthCalledWith(1, "ethiopia", 35);
    expect(onRatioChange).toHaveBeenNthCalledWith(2, "ethiopia", "45");
    expect(onRatioChange).toHaveBeenNthCalledWith(3, "ethiopia", 45);
  });

  test("keeps slider attributes and zero ratio display", () => {
    renderBlendBuilder();

    const sliders = document.querySelectorAll("input");
    expect(sliders[0].getAttribute("min")).toBe("0");
    expect(sliders[0].getAttribute("max")).toBe("100");
    expect(sliders[0].getAttribute("step")).toBe("5");
    expect(sliders[2].value).toBe("0");
    expect(document.querySelectorAll(".ratio-output")[2].textContent).toBe("");
  });

  test("calls normalize callback and keeps enabled condition", () => {
    const onNormalize = vi.fn();
    renderBlendBuilder({ onNormalize });

    const button = buttonByText("100%");
    expect(button.disabled).toBe(false);
    click(button);

    expect(onNormalize).toHaveBeenCalledTimes(1);
  });

  test("shows no warning when total is 100", () => {
    renderBlendBuilder({ total: 100 });

    expect(document.querySelector(".inline-warning")).toBeNull();
  });

  test("shows existing warning when total is not 100", () => {
    renderBlendBuilder({ total: 85 });

    expect(document.querySelector(".inline-warning").textContent).toBe("合計は85%です。100%に正規化できます。");
  });

  test("preserves empty list behavior", () => {
    renderBlendBuilder({ beans: [], total: 0 });

    expect(document.querySelectorAll(".bean-item")).toHaveLength(0);
    expect(document.querySelector(".empty-state").textContent).toBe("レシピ表示がONの豆はありません。");
    expect(buttonByText("100%").disabled).toBe(true);
  });

  test("renders from props only", () => {
    renderBlendBuilder({
      beans: [{ id: "single", name: "Single", note: "Only", color: "#000000", ratio: 100 }],
      total: 100,
    });

    expect(document.querySelectorAll(".bean-item")).toHaveLength(1);
    expect(document.querySelector(".ratio-output").textContent).toBe("100%");
  });
});

function renderBlendBuilder(overrides = {}) {
  const props = {
    beans: [
      { id: "ethiopia", name: "Ethiopia", note: "Floral", color: "#12656b", ratio: 40, roastLevel: "full-city" },
      { id: "brazil", name: "Brazil", note: "Nutty", color: "#b85243", ratio: 45, roastLevel: "medium" },
      { id: "kenya", name: "Kenya", note: "Hidden", color: "#54745a", ratio: 0, visibleInRecipes: false, roastLevel: "" },
    ],
    total: 85,
    onRatioChange: vi.fn(),
    onRoastLevelChange: vi.fn(),
    onNormalize: vi.fn(),
    ...overrides,
  };

  act(() => {
    root = createRoot(container);
    root.render(<BlendBuilder {...props} />);
  });

  return props;
}

function click(element) {
  act(() => {
    element.click();
  });
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
