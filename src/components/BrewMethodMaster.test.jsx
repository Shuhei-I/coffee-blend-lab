import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { fixtureBrewMethod } from "../domain/coffee/recipeSeries.fixtures.js";
import { BrewMethodMaster } from "./BrewMethodMaster.jsx";

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

describe("BrewMethodMaster", () => {
  test("renders brew methods in existing order and shows save state", () => {
    renderBrewMethodMaster({ dirty: true, saveStatus: "error" });

    expect([...document.querySelectorAll(".brew-master-row")].map((row) => row.querySelector("input").value)).toEqual([
      "標準 4投式",
      "甘み重視",
    ]);
    expect(document.querySelector(".master-save-status").textContent.trim()).toBe("Error");
    expect(document.querySelector(".master-save-status").dataset.status).toBe("error");
    expect(document.querySelector(".master-save-status").dataset.dirty).toBe("true");
  });

  test("calls update callbacks with existing field conversions", () => {
    const onUpdate = vi.fn();
    renderBrewMethodMaster({ onUpdate });
    const inputs = document.querySelectorAll(".brew-master-row")[0].querySelectorAll("input");

    change(inputs[0], "Updated method");
    expect(onUpdate).toHaveBeenCalledWith("standard-4-pour", { name: "Updated method" });

    change(inputs[1], "Updated memo");
    expect(onUpdate).toHaveBeenCalledWith("standard-4-pour", { note: "Updated memo" });

    change(inputs[2], "105");
    expect(onUpdate).toHaveBeenCalledWith("standard-4-pour", { bloomPercent: 100 });

    change(inputs[3], "45");
    expect(onUpdate).toHaveBeenCalledWith("standard-4-pour", { bloomSeconds: 45 });

    change(inputs[4], "-1");
    expect(onUpdate).toHaveBeenCalledWith("standard-4-pour", { pour1Percent: 0 });

    change(inputs[5], "25");
    expect(onUpdate).toHaveBeenCalledWith("standard-4-pour", { pour2Percent: 25 });

    change(inputs[6], "bad");
    expect(onUpdate).toHaveBeenCalledWith("standard-4-pour", { pour3Percent: 0 });
  });

  test("shows existing pour total state", () => {
    renderBrewMethodMaster();

    const total = document.querySelector(".brew-total");
    expect(total.textContent).toBe("100%");
    expect(total.dataset.ok).toBe("true");
  });

  test("calls add, delete, save, and revert callbacks", () => {
    const onAdd = vi.fn();
    const onDelete = vi.fn();
    const onSave = vi.fn();
    const onRevert = vi.fn();
    renderBrewMethodMaster({ dirty: true, onAdd, onDelete, onSave, onRevert });

    click(buttonByText("Add"));
    click(buttonByText("Delete"));
    click(buttonByText("Save"));
    click(buttonByText("Revert"));

    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith("standard-4-pour");
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onRevert).toHaveBeenCalledTimes(1);
  });

  test("disables delete when only one brew method remains", () => {
    const onDelete = vi.fn();
    renderBrewMethodMaster({ methods: [fixtureBrewMethod], onDelete });

    const deleteButton = buttonByText("Delete");
    expect(deleteButton.disabled).toBe(true);
    expect(deleteButton.title).toBe("最後の淹れ方は削除できません");

    click(deleteButton);

    expect(onDelete).not.toHaveBeenCalled();
  });

  test("keeps existing saved and empty list behavior", () => {
    renderBrewMethodMaster({ methods: [], dirty: false, saveStatus: "saved" });

    expect(document.querySelectorAll(".brew-master-row")).toHaveLength(0);
    expect(document.querySelector(".master-save-status").textContent.trim()).toBe("Saved");
    expect(buttonByText("Save").disabled).toBe(true);
    expect(buttonByText("Revert").disabled).toBe(true);
    expect(buttonByText("Add")).toBeTruthy();
  });
});

function renderBrewMethodMaster(overrides = {}) {
  const props = {
    methods: [
      fixtureBrewMethod,
      {
        id: "sweet-forward",
        name: "甘み重視",
        note: "前半を厚めにして甘みとボディを出す",
        bloomPercent: 15,
        pour1Percent: 35,
        pour2Percent: 25,
        pour3Percent: 25,
        bloomSeconds: 40,
      },
    ],
    dirty: false,
    saveStatus: "saved",
    onAdd: vi.fn(),
    onDelete: vi.fn(),
    onUpdate: vi.fn(),
    onSave: vi.fn(),
    onRevert: vi.fn(),
    ...overrides,
  };

  act(() => {
    root = createRoot(container);
    root.render(<BrewMethodMaster {...props} />);
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
