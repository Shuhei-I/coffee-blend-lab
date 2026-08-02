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
  test("renders brew methods as read-only table rows in existing order", () => {
    renderBrewMethodMaster();

    expect([...document.querySelectorAll(".master-table-row h3")].map((heading) => heading.textContent)).toEqual([
      "標準 4投式",
      "甘み重視",
    ]);
    expect(document.querySelector(".master-table-row input")).toBeNull();
    expect([...document.querySelectorAll(".master-table-head span")].map((cell) => cell.textContent)).toContain("合計");
  });

  test("toggles row expansion for the mobile card view", () => {
    renderBrewMethodMaster();
    const firstRow = document.querySelector(".master-table-row");

    expect(firstRow.dataset.expanded).toBe("false");
    click(firstRow.querySelector(".master-expand-button"));
    expect(firstRow.dataset.expanded).toBe("true");
  });

  test("edits a single brew method in a dialog and enables save only after changes", async () => {
    const onSave = vi.fn(async () => true);
    renderBrewMethodMaster({ onSave });

    click(buttonByText("Edit"));
    const form = document.querySelector(".master-dialog-form");
    const fields = form.querySelectorAll("input, textarea");
    expect(buttonByText("Save").disabled).toBe(true);

    change(fields[0], "Updated method");
    expect(buttonByText("Save").disabled).toBe(false);
    change(fields[1], "Updated memo");
    change(fields[2], "105");
    change(fields[3], "45");
    change(fields[4], "-1");
    change(fields[5], "25");
    change(fields[6], "bad");

    await submit(form);

    expect(onSave).toHaveBeenCalledWith({
      ...fixtureBrewMethod,
      name: "Updated method",
      note: "Updated memo",
      bloomPercent: 100,
      bloomSeconds: 45,
      pour1Percent: 0,
      pour2Percent: 25,
      pour3Percent: 0,
    });
    expect(document.querySelector(".master-dialog")).toBeNull();
  });

  test("shows existing pour total state in the edit dialog", () => {
    renderBrewMethodMaster();

    click(buttonByText("Edit"));
    const total = document.querySelector(".brew-total");
    expect(total.textContent).toBe("100%");
    expect(total.dataset.ok).toBe("true");
  });

  test("cancels edit without saving", () => {
    const onSave = vi.fn();
    renderBrewMethodMaster({ onSave });

    click(buttonByText("Edit"));
    change(document.querySelector(".master-dialog-form input"), "Unsaved method");
    click(buttonByText("Cancel"));

    expect(onSave).not.toHaveBeenCalled();
    expect(document.querySelector(".master-dialog")).toBeNull();
    expect(document.querySelector(".master-table-row h3").textContent).toBe("標準 4投式");
  });

  test("calls add dialog submit and delete callbacks", async () => {
    const onAdd = vi.fn(async () => true);
    const onDelete = vi.fn();
    renderBrewMethodMaster({ onAdd, onDelete });

    click(buttonByText("Add"));
    const fields = document.querySelector(".master-dialog-form").querySelectorAll("input, textarea");
    change(fields[0], "New Method");
    change(fields[1], "New note");
    change(fields[2], "10");
    change(fields[3], "35");
    change(fields[4], "30");
    change(fields[5], "30");
    change(fields[6], "30");
    await submit(document.querySelector(".master-dialog-form"));
    click(buttonByText("Delete"));

    expect(onAdd).toHaveBeenCalledWith({
      name: "New Method",
      note: "New note",
      bloomPercent: 10,
      bloomSeconds: 35,
      pour1Percent: 30,
      pour2Percent: 30,
      pour3Percent: 30,
    });
    expect(onDelete).toHaveBeenCalledWith("standard-4-pour");
  });

  test("cancels brew method add without calling add", () => {
    const onAdd = vi.fn();
    renderBrewMethodMaster({ onAdd });

    click(buttonByText("Add"));
    expect(document.querySelector(".master-dialog")).toBeTruthy();
    click(buttonByText("Cancel"));

    expect(document.querySelector(".master-dialog")).toBeNull();
    expect(onAdd).not.toHaveBeenCalled();
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

  test("keeps existing empty list behavior", () => {
    renderBrewMethodMaster({ methods: [] });

    expect(document.querySelectorAll(".master-table-row")).toHaveLength(0);
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
    saveStatus: "saved",
    onAdd: vi.fn(),
    onDelete: vi.fn(),
    onSave: vi.fn(async () => true),
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

async function submit(form) {
  await act(async () => {
    await reactProps(form).onSubmit({ preventDefault: vi.fn() });
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
