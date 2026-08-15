import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { PublicShell } from "./PublicShell.jsx";

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

describe("PublicShell", () => {
  test("renders Discover for unauthenticated visitors", () => {
    renderPublicShell();

    expect(document.querySelector(".brand-logo").getAttribute("alt")).toBe("Coffee Blend Lab");
    expect(document.querySelector("#publicDiscoverTitle").textContent).toBe("公開ブレンド");
    expect(document.querySelector(".public-discover-panel").textContent).toContain("投稿一覧は次の実装フェーズ");
  });

  test("opens the auth screen from the Discover call to action", () => {
    renderPublicShell();

    click(buttonByText("ログインして始める"));

    expect(document.querySelector("#authTitle").textContent).toBe("Coffee Blend Lab");
    expect(document.querySelector("form.auth-form")).toBeTruthy();
  });

  test("opens public legal pages from the public navigation", () => {
    renderPublicShell();

    click(buttonByText("Privacy"));
    expect(document.querySelector(".legal-panel")).toBeTruthy();

    click(buttonByText("Discover"));
    expect(document.querySelector("#publicDiscoverTitle")).toBeTruthy();
  });
});

function renderPublicShell(overrides = {}) {
  const auth = {
    error: "",
    signIn: vi.fn(),
    signUp: vi.fn(),
    clearError: vi.fn(),
    ...overrides.auth,
  };

  act(() => {
    root = createRoot(container);
    root.render(<PublicShell auth={auth} logoSrc="/logo.png" initialPage={overrides.initialPage || "discover"} />);
  });

  return auth;
}

function click(element) {
  act(() => {
    element.click();
  });
}

function buttonByText(text) {
  return [...document.querySelectorAll("button")].find((button) => button.textContent === text);
}
