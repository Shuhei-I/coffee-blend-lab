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
  test("renders beans as read-only table rows in existing order", () => {
    renderBeanMaster();

    expect([...document.querySelectorAll(".master-table-row h3")].map((heading) => heading.textContent)).toEqual([
      fixtureBeans[0].name,
      fixtureBeans[1].name,
    ]);
    expect(document.querySelector(".master-table-row input")).toBeNull();
    expect([...document.querySelectorAll(".master-table-head span")].map((cell) => cell.textContent)).toContain("原価");
  });

  test("toggles row expansion for the mobile card view", () => {
    renderBeanMaster();
    const firstRow = document.querySelector(".master-table-row");

    expect(firstRow.dataset.expanded).toBe("false");
    click(firstRow.querySelector(".master-expand-button"));
    expect(firstRow.dataset.expanded).toBe("true");
  });

  test("edits a single bean in a dialog and enables save only after changes", async () => {
    const onSave = vi.fn(async () => true);
    renderBeanMaster({ onSave });

    click(buttonByText("Edit"));
    const form = document.querySelector(".master-dialog-form");
    const fields = form.querySelectorAll("input, textarea");
    expect(buttonByText("Save").disabled).toBe(true);

    change(fields[0], "Updated Bean");
    expect(buttonByText("Save").disabled).toBe(false);
    change(fields[1], "Updated note");
    change(fields[2], false);
    change(fields[3], "6200");
    change(fields[4], "91");

    await submit(form);

    expect(onSave).toHaveBeenCalledWith({
      ...fixtureBeans[0],
      name: "Updated Bean",
      note: "Updated note",
      visibleInRecipes: false,
      costPerKg: 6200,
      profile: { ...fixtureBeans[0].profile, acidity: 91 },
    });
    expect(document.querySelector(".master-dialog")).toBeNull();
  });

  test("cancels edit without saving", () => {
    const onSave = vi.fn();
    renderBeanMaster({ onSave });

    click(buttonByText("Edit"));
    change(document.querySelector(".master-dialog-form input"), "Unsaved Bean");
    click(buttonByText("Cancel"));

    expect(onSave).not.toHaveBeenCalled();
    expect(document.querySelector(".master-dialog")).toBeNull();
    expect(document.querySelector(".master-table-row h3").textContent).toBe(fixtureBeans[0].name);
  });

  test("calls add dialog submit and delete callbacks", async () => {
    const onAdd = vi.fn(async () => true);
    const onDelete = vi.fn();
    renderBeanMaster({ onAdd, onDelete });

    click(buttonByText("Add"));
    const fields = document.querySelector(".master-dialog-form").querySelectorAll("input, textarea");
    change(fields[0], "New Bean");
    change(fields[1], "New note");
    change(fields[3], "1200");
    await submit(document.querySelector(".master-dialog-form"));
    click(buttonByText("Delete"));

    expect(onAdd).toHaveBeenCalledWith({
      name: "New Bean",
      note: "New note",
      visibleInRecipes: true,
      costPerKg: 1200,
      profile: {
        acidity: 50,
        sweetness: 50,
        bitterness: 50,
        body: 50,
        aroma: 50,
      },
    });
    expect(onDelete).toHaveBeenCalledWith("ethiopia");
  });

  test("cancels bean add without calling add", () => {
    const onAdd = vi.fn();
    renderBeanMaster({ onAdd });

    click(buttonByText("Add"));
    expect(document.querySelector(".master-dialog")).toBeTruthy();
    click(buttonByText("Cancel"));

    expect(document.querySelector(".master-dialog")).toBeNull();
    expect(onAdd).not.toHaveBeenCalled();
  });

  test("disables delete when only one bean remains", () => {
    const onDelete = vi.fn();
    renderBeanMaster({ beans: [fixtureBeans[0]], onDelete });

    const deleteButton = buttonByText("Delete");
    expect(deleteButton.disabled).toBe(true);
    expect(deleteButton.title).toBe("最後の豆は削除できません");

    click(deleteButton);

    expect(onDelete).not.toHaveBeenCalled();
  });

  test("preserves empty list behavior", () => {
    renderBeanMaster({ beans: [] });

    expect(document.querySelectorAll(".master-table-row")).toHaveLength(0);
    expect(buttonByText("Add")).toBeTruthy();
  });
});

function renderBeanMaster(overrides = {}) {
  const props = {
    beans: fixtureBeans,
    saveStatus: "saved",
    onAdd: vi.fn(),
    onDelete: vi.fn(),
    onSave: vi.fn(async () => true),
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

async function submit(form) {
  await act(async () => {
    await reactProps(form).onSubmit({ preventDefault: vi.fn() });
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
