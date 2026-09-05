import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { RecordSaveAction } from "./RecordSaveAction.jsx";

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

describe("RecordSaveAction", () => {
  test("shows save completion choices after saving", () => {
    const onPublish = vi.fn();
    const onViewHistory = vi.fn();
    renderAction({
      savedRecipe: { id: "recipe-3", name: "Morning Blend", version: 3 },
      onPublish,
      onViewHistory,
    });

    expect(document.querySelector('[role="dialog"] h3').textContent).toBe("レシピを登録しました");
    expect(document.querySelector(".recipe-save-success-name").textContent).toBe("Morning Blend v3");
    expect(buttonByText("公開する").className).toBe("primary-button");
    click(buttonByText("履歴を見る"));
    expect(onViewHistory).toHaveBeenCalledTimes(1);
    click(buttonByText("公開する"));
    expect(onPublish).toHaveBeenCalledTimes(1);
  });

  test("keeps validation warnings separate from success notices", () => {
    renderAction({ disabled: true, disabledReason: "豆の合計を100%にしてください。" });

    expect(buttonByText("保存").disabled).toBe(true);
    expect(document.querySelector(".inline-warning").textContent).toBe("豆の合計を100%にしてください。");
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });
});

function renderAction(overrides = {}) {
  act(() => {
    root = createRoot(container);
    root.render(
      <RecordSaveAction
        disabled={false}
        disabledReason=""
        savedRecipe={null}
        onSave={vi.fn()}
        onPublish={vi.fn()}
        onViewHistory={vi.fn()}
        onCloseSuccess={vi.fn()}
        {...overrides}
      />,
    );
  });
}

function click(element) {
  act(() => element.click());
}

function buttonByText(text) {
  return [...document.querySelectorAll("button")].find((button) => button.textContent.trim() === text);
}
