import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { RecipeComparisonDialog, RecipeComparisonReferenceSelect, RecipeComparisonSummary } from "./RecipeComparison.jsx";

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
  act(() => root?.unmount());
  root = undefined;
  dom?.window.close();
  delete globalThis.window;
  delete globalThis.document;
});

describe("RecipeComparison", () => {
  test("renders grouped version options for reference selection", () => {
    render(<RecipeComparisonReferenceSelect
      recipeSeries={[
        { id: "series-1", name: "Morning Blend", versions: [{ id: "v2", version: 2 }] },
        { id: "series-archived", name: "Archived Blend", status: "archived", versions: [{ id: "v1", version: 1 }] },
      ]}
      value="v2"
      onChange={vi.fn()}
    />);

    expect(document.querySelector("#comparisonReference").value).toBe("v2");
    expect(document.querySelector("optgroup").label).toBe("Morning Blend");
    expect(document.querySelectorAll("optgroup")).toHaveLength(1);
    expect(document.body.textContent).not.toContain("Archived Blend");
  });

  test("renders the selected section count and opens the shared dialog", () => {
    const onOpen = vi.fn();
    render(<RecipeComparisonSummary
      comparison={{ referenceLabel: "Morning Blend v2", blendChangeCount: 2, brewChangeCount: 1 }}
      section="brew"
      onOpen={onOpen}
    />);

    expect(document.body.textContent).toContain("抽出条件の変更：1件");
    click(document.querySelector("button"));
    expect(onOpen).toHaveBeenCalledWith("brew");
  });

  test("shows both blend and extraction changes in one dialog", () => {
    render(<RecipeComparisonDialog
      comparison={{
        referenceLabel: "Morning Blend v2",
        blendChanges: [{ key: "ratio", label: "Brazilの配合比率", referenceValue: 50, currentValue: 60, valueType: "ratio", delta: 10 }],
        brewChanges: [{ key: "brewTemperatureC", label: "湯温", referenceValue: 90, currentValue: 92, valueType: "temperature" }],
      }}
      onClose={vi.fn()}
    />);

    expect(document.body.textContent).toContain("Brazilの配合比率");
    expect(document.body.textContent).toContain("湯温");
    expect(document.body.textContent).toContain("+10pt");
  });
});

function render(element) {
  act(() => {
    root = createRoot(container);
    root.render(element);
  });
}

function click(element) {
  act(() => element.click());
}
