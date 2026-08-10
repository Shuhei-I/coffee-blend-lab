import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { WorkspaceStatus } from "./WorkspaceStatus.jsx";

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

describe("WorkspaceStatus", () => {
  test("renders nothing when there is no pending or failed workspace state", () => {
    renderWorkspaceStatus();

    expect(document.querySelector(".workspace-status")).toBeNull();
  });

  test("renders the loading state", () => {
    renderWorkspaceStatus({ loading: true });

    expect(document.querySelector('[role="status"]').textContent).toBe("データを読み込んでいます。");
  });

  test("renders load and save errors with safe messages", () => {
    renderWorkspaceStatus({
      loadError: new Error("beans failed"),
      saveError: "recipe failed",
    });

    expect([...document.querySelectorAll('[role="alert"]')].map((item) => item.textContent)).toEqual([
      "データを読み込めませんでした。beans failed",
      "保存できませんでした。recipe failed",
    ]);
  });

  test("uses fallback messages for nonstandard errors", () => {
    renderWorkspaceStatus({ loadError: { code: "500" }, saveError: {} });

    expect(document.body.textContent).toContain("データを読み込めませんでした。");
    expect(document.body.textContent).toContain("保存できませんでした。");
  });
});

function renderWorkspaceStatus(overrides = {}) {
  const props = {
    loading: false,
    loadError: null,
    saveError: null,
    ...overrides,
  };

  act(() => {
    root = createRoot(container);
    root.render(<WorkspaceStatus {...props} />);
  });

  return props;
}
