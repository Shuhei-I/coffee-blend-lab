import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { ActionNotice } from "./ActionNotice.jsx";

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

describe("ActionNotice", () => {
  test("announces success and runs its next action", () => {
    const onAction = vi.fn();
    renderNotice(<ActionNotice message="履歴に保存しました。" actionLabel="履歴を見る" onAction={onAction} />);

    expect(document.querySelector('[role="status"]').textContent).toContain("履歴に保存しました");
    click(buttonByText("履歴を見る"));
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});

function renderNotice(element) {
  act(() => {
    root = createRoot(container);
    root.render(element);
  });
}

function click(element) {
  act(() => element.click());
}

function buttonByText(text) {
  return [...document.querySelectorAll("button")].find((button) => button.textContent.trim() === text);
}
