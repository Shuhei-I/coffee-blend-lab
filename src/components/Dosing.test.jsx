import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { Dosing } from "./Dosing.jsx";

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

describe("Dosing", () => {
  test("renders dose, target brew gram, cost, units, and rounded bean doses", () => {
    renderDosing();

    expect(document.querySelector("input").value).toBe("20");
    expect(summaryLines()).toEqual([
      ["目標抽出量", "320 g"],
      ["ブレンド原価", "24.6 円"],
      ["投湯割合合計", "100%"],
      ["Ethiopia", "12.3 g"],
      ["Brazil", "7.0 g"],
    ]);
  });

  test("renders brew ratio and brew method options", () => {
    renderDosing();

    const selects = document.querySelectorAll("select");
    expect(selects[0].value).toBe("16");
    expect([...selects[1].querySelectorAll("option")].map((option) => [option.value, option.textContent])).toEqual([
      ["standard", "Standard"],
      ["saved-recipe", "Saved recipe"],
    ]);
    expect(selects[2].value).toBe("medium_fine");
    expect(document.querySelectorAll("input")[1].value).toBe("92");
  });

  test("calls input callbacks with existing conversion rules", () => {
    const onDoseChange = vi.fn();
    const onRatioChange = vi.fn();
    const onMethodChange = vi.fn();
    const onGrindSizeChange = vi.fn();
    const onBrewTemperatureChange = vi.fn();
    renderDosing({ onDoseChange, onRatioChange, onMethodChange, onGrindSizeChange, onBrewTemperatureChange });
    const doseInput = document.querySelector("input");
    const temperatureInput = document.querySelectorAll("input")[1];
    const selects = document.querySelectorAll("select");

    change(doseInput, "25");
    change(selects[0], "14");
    change(selects[1], "saved-recipe");
    change(selects[2], "coarse");
    change(temperatureInput, "88");

    expect(onDoseChange).toHaveBeenCalledWith(25);
    expect(onRatioChange).toHaveBeenCalledWith(14);
    expect(onMethodChange).toHaveBeenCalledWith("saved-recipe");
    expect(onGrindSizeChange).toHaveBeenCalledWith("coarse");
    expect(onBrewTemperatureChange).toHaveBeenCalledWith(88);
  });

  test("allows temporarily empty dose input while editing", () => {
    const onDoseChange = vi.fn();
    renderDosing({ onDoseChange });
    const doseInput = document.querySelector("input");

    change(doseInput, "");

    expect(doseInput.value).toBe("");
    expect(onDoseChange).not.toHaveBeenCalled();
  });

  test("restores the current dose when an empty dose input loses focus", () => {
    const onDoseChange = vi.fn();
    renderDosing({ onDoseChange });
    const doseInput = document.querySelector("input");

    change(doseInput, "");
    blur(doseInput);

    expect(doseInput.value).toBe("20");
    expect(onDoseChange).toHaveBeenCalledWith(20);
  });

  test("preserves zero value display", () => {
    renderDosing({
      doseGram: 0,
      targetBrewGram: 0,
      blendCost: 0,
      pourTotal: 0,
      beanDoseLines: [{ id: "zero", name: "Zero Bean", doseGram: 0 }],
      brewSchedule: [],
    });

    expect(document.querySelector("input").value).toBe("0");
    expect(summaryLines()).toEqual([
      ["目標抽出量", "0 g"],
      ["ブレンド原価", "0.0 円"],
      ["投湯割合合計", "0%"],
      ["Zero Bean", "0.0 g"],
    ]);
  });

  test("renders brew schedule from props", () => {
    renderDosing();

    expect([...document.querySelectorAll(".brew-step")].map((step) => [
      step.querySelector("span").textContent,
      step.querySelector("strong").textContent,
      step.querySelector("small").textContent,
    ])).toEqual([
      ["蒸らし", "38 g", "+38 g / 12% 30秒"],
      ["1投目", "128 g", "+90 g / 28% "],
    ]);
  });

  test("keeps existing no-method behavior and renders from props only", () => {
    renderDosing({
      brewMethodOptions: [],
      selectedBrewMethodId: "",
      brewSchedule: [],
      showBrewSchedule: false,
    });

    expect(document.querySelector(".brew-schedule")).toBeNull();
    expect(document.querySelectorAll(".dose-line")).toHaveLength(5);
  });
});

function renderDosing(overrides = {}) {
  const props = {
    doseGram: 20,
    brewRatio: 16,
    grindSize: "medium_fine",
    brewTemperatureC: 92,
    targetBrewGram: 320,
    blendCost: 24.56,
    pourTotal: 100,
    beanDoseLines: [
      { id: "ethiopia", name: "Ethiopia", doseGram: 12.34 },
      { id: "brazil", name: "Brazil", doseGram: 7 },
    ],
    brewSchedule: [
      { label: "蒸らし", percent: 12, sub: "30秒", stepGram: 38, cumulativeGram: 38 },
      { label: "1投目", percent: 28, sub: "", stepGram: 90, cumulativeGram: 128 },
    ],
    showBrewSchedule: true,
    brewMethodOptions: [
      { id: "standard", name: "Standard" },
      { id: "saved-recipe", name: "Recipe snapshot", displayName: "Saved recipe" },
    ],
    selectedBrewMethodId: "standard",
    onDoseChange: vi.fn(),
    onRatioChange: vi.fn(),
    onGrindSizeChange: vi.fn(),
    onBrewTemperatureChange: vi.fn(),
    onMethodChange: vi.fn(),
    ...overrides,
  };

  act(() => {
    root = createRoot(container);
    root.render(<Dosing {...props} />);
  });

  return props;
}

function change(input, value) {
  act(() => {
    reactProps(input).onChange({ target: { value } });
  });
}

function blur(input) {
  act(() => {
    reactProps(input).onBlur();
  });
}

function reactProps(element) {
  const key = Object.keys(element).find((item) => item.startsWith("__reactProps$"));
  return element[key];
}

function summaryLines() {
  return [...document.querySelectorAll(".dose-line")].map((line) => [
    line.querySelector("span").textContent,
    line.querySelector("strong").textContent,
  ]);
}
