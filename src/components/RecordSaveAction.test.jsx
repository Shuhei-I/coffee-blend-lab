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
  test("shows a persistent history notice after saving", () => {
    const onViewHistory = vi.fn();
    renderAction({
      saveMessage: "「Morning Blend v3」を履歴に保存しました。",
      onViewHistory,
    });

    expect(document.querySelector('[role="status"]').textContent).toContain("Morning Blend v3");
    click(buttonByText("履歴を見る"));
    expect(onViewHistory).toHaveBeenCalledTimes(1);
  });

  test("keeps validation warnings separate from success notices", () => {
    renderAction({ disabled: true, disabledReason: "豆の合計を100%にしてください。" });

    expect(buttonByText("保存").disabled).toBe(true);
    expect(document.querySelector(".inline-warning").textContent).toBe("豆の合計を100%にしてください。");
    expect(document.querySelector(".action-notice")).toBeNull();
  });
});

function renderAction(overrides = {}) {
  act(() => {
    root = createRoot(container);
    root.render(
      <RecordSaveAction
        disabled={false}
        disabledReason=""
        saveMessage=""
        onSave={vi.fn()}
        onViewHistory={vi.fn()}
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
