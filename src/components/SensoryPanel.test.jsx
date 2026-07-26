import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { SensoryPanel } from "./SensoryPanel.jsx";

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

describe("SensoryPanel", () => {
  test("renders sensory fields in existing order with current values", () => {
    renderSensoryPanel();

    expect(sensoryLabels()).toEqual(["香り", "風味", "後味", "バランス"]);
    expect([...document.querySelectorAll(".sensory-grid input")].map((input) => input.value)).toEqual([
      "7",
      "7.5",
      "6",
      "8",
    ]);
  });

  test("keeps score input attributes", () => {
    renderSensoryPanel();

    document.querySelectorAll(".sensory-grid input").forEach((input) => {
      expect(input.type).toBe("number");
      expect(input.getAttribute("min")).toBe("0");
      expect(input.getAttribute("max")).toBe("10");
      expect(input.getAttribute("step")).toBe("0.5");
    });
  });

  test("calls score callback with existing numeric conversion", () => {
    const onSensoryChange = vi.fn();
    renderSensoryPanel({ onSensoryChange });
    const inputs = document.querySelectorAll(".sensory-grid input");

    change(inputs[0], "8.5");
    change(inputs[2], "0");

    expect(onSensoryChange).toHaveBeenNthCalledWith(1, {
      fragrance: 8.5,
      flavor: 7.5,
      aftertaste: 6,
      balance: 8,
    });
    expect(onSensoryChange).toHaveBeenNthCalledWith(2, {
      fragrance: 7,
      flavor: 7.5,
      aftertaste: 0,
      balance: 8,
    });
  });

  test("keeps empty string score fallback", () => {
    const onSensoryChange = vi.fn();
    renderSensoryPanel({ onSensoryChange });

    change(document.querySelectorAll(".sensory-grid input")[1], "");

    expect(onSensoryChange).toHaveBeenCalledWith({
      fragrance: 7,
      flavor: 0,
      aftertaste: 6,
      balance: 8,
    });
  });

  test("renders zero values", () => {
    renderSensoryPanel({
      sensory: { fragrance: 0, flavor: 0, aftertaste: 0, balance: 0 },
    });

    expect([...document.querySelectorAll(".sensory-grid input")].map((input) => input.value)).toEqual([
      "0",
      "0",
      "0",
      "0",
    ]);
  });

  test("renders memo and calls memo callback with raw value", () => {
    const onMemoChange = vi.fn();
    renderSensoryPanel({ onMemoChange });
    const textarea = document.querySelector("textarea");

    expect(textarea.value).toBe("More aroma, less bitterness");
    change(textarea, "  Updated memo  ");

    expect(onMemoChange).toHaveBeenCalledWith("  Updated memo  ");
  });

  test("keeps empty memo and placeholder", () => {
    renderSensoryPanel({ memo: "" });
    const textarea = document.querySelector("textarea");

    expect(textarea.value).toBe("");
    expect(textarea.getAttribute("rows")).toBe("4");
    expect(textarea.getAttribute("placeholder")).toBe("香り、甘み、後味、改善したい点");
  });

  test("renders from props only", () => {
    renderSensoryPanel({
      sensory: { fragrance: 1, flavor: 2, aftertaste: 3, balance: 4 },
      memo: "Props memo",
    });

    expect(document.querySelectorAll(".sensory-grid label")).toHaveLength(4);
    expect(document.querySelector("textarea").value).toBe("Props memo");
  });
});

function renderSensoryPanel(overrides = {}) {
  const props = {
    sensory: { fragrance: 7, flavor: 7.5, aftertaste: 6, balance: 8 },
    memo: "More aroma, less bitterness",
    onSensoryChange: vi.fn(),
    onMemoChange: vi.fn(),
    ...overrides,
  };

  act(() => {
    root = createRoot(container);
    root.render(<SensoryPanel {...props} />);
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

function sensoryLabels() {
  return [...document.querySelectorAll(".sensory-grid label")].map((label) => label.childNodes[0].textContent.trim());
}
