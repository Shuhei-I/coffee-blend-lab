import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { fixtureBeans } from "../domain/coffee/recipeSeries.fixtures.js";
import { BeanMaster } from "./BeanMaster.jsx";

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

describe("BeanMaster", () => {
  test("renders beans in existing order and shows save state", () => {
    renderBeanMaster({ dirty: true, saveStatus: "error" });

    expect([...document.querySelectorAll(".master-row")].map((row) => row.querySelector("input").value)).toEqual([
      fixtureBeans[0].name,
      fixtureBeans[1].name,
    ]);
    expect(document.querySelector(".master-save-status").textContent.trim()).toBe("Error");
    expect(document.querySelector(".master-save-status").dataset.status).toBe("error");
    expect(document.querySelector(".master-save-status").dataset.dirty).toBe("true");
  });

  test("calls update callbacks for bean fields and profile fields", () => {
    const onUpdate = vi.fn();
    const onProfileUpdate = vi.fn();
    renderBeanMaster({ onUpdate, onProfileUpdate });
    const firstRowInputs = document.querySelectorAll(".master-row")[0].querySelectorAll("input");

    change(firstRowInputs[0], "Updated Bean");
    expect(onUpdate).toHaveBeenCalledWith("ethiopia", { name: "Updated Bean" });

    change(firstRowInputs[1], "Updated note");
    expect(onUpdate).toHaveBeenCalledWith("ethiopia", { note: "Updated note" });

    change(firstRowInputs[2], false);
    expect(onUpdate).toHaveBeenCalledWith("ethiopia", { visibleInRecipes: false });

    change(firstRowInputs[3], "6200");
    expect(onUpdate).toHaveBeenCalledWith("ethiopia", { costPerKg: 6200 });

    change(firstRowInputs[4], "91");
    expect(onProfileUpdate).toHaveBeenCalledWith("ethiopia", "acidity", "91");
  });

  test("calls add, delete, save, and revert callbacks", () => {
    const onAdd = vi.fn();
    const onDelete = vi.fn();
    const onSave = vi.fn();
    const onRevert = vi.fn();
    renderBeanMaster({ dirty: true, onAdd, onDelete, onSave, onRevert });

    click(buttonByText("Add"));
    click(buttonByText("Delete"));
    click(buttonByText("Save"));
    click(buttonByText("Revert"));

    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith("ethiopia");
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onRevert).toHaveBeenCalledTimes(1);
  });

  test("keeps existing saved state button disabling", () => {
    renderBeanMaster({ dirty: false, saveStatus: "saved" });

    expect(document.querySelector(".master-save-status").textContent.trim()).toBe("Saved");
    expect(buttonByText("Save").disabled).toBe(true);
    expect(buttonByText("Revert").disabled).toBe(true);
  });

  test("preserves empty list behavior", () => {
    renderBeanMaster({ beans: [] });

    expect(document.querySelectorAll(".master-row")).toHaveLength(0);
    expect(buttonByText("Add")).toBeTruthy();
  });
});

function renderBeanMaster(overrides = {}) {
  const props = {
    beans: fixtureBeans,
    dirty: false,
    saveStatus: "saved",
    onAdd: vi.fn(),
    onDelete: vi.fn(),
    onUpdate: vi.fn(),
    onProfileUpdate: vi.fn(),
    onSave: vi.fn(),
    onRevert: vi.fn(),
    ...overrides,
  };

  act(() => {
    root = createRoot(container);
    root.render(<BeanMaster {...props} />);
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
    reactProps(input).onChange({
      target: input.type === "checkbox" ? { checked: value } : { value },
    });
  });
}

function reactProps(element) {
  const key = Object.keys(element).find((item) => item.startsWith("__reactProps$"));
  return element[key];
}

function buttonByText(text) {
  return [...document.querySelectorAll("button")].find((button) => button.textContent === text);
}
