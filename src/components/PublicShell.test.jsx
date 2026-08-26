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
  test("renders Discover for unauthenticated visitors", async () => {
    await renderPublicShell();

    expect(document.querySelector(".brand-logo").getAttribute("alt")).toBe("Coffee Blend Lab");
    expect(document.querySelector("#discoverTitle").textContent).toBe("公開ブレンド");
    expect(document.body.textContent).toContain("まだ公開ブレンドはありません");
  });

  test("opens the auth screen from the Discover call to action", async () => {
    await renderPublicShell();

    click(buttonByText("ブレンドを公開する"));

    expect(document.querySelector("#authTitle").textContent).toBe("Coffee Blend Lab");
    expect(document.querySelector("form.auth-form")).toBeTruthy();
  });

  test("opens public legal pages from the public navigation", async () => {
    await renderPublicShell();

    click(buttonByText("Privacy"));
    expect(document.querySelector(".legal-panel")).toBeTruthy();

    click(buttonByText("Discover"));
    await flush();
    expect(document.querySelector("#discoverTitle")).toBeTruthy();
  });
});

async function renderPublicShell(overrides = {}) {
  await import("./DiscoverTimeline.jsx");
  const auth = {
    error: "",
    signIn: vi.fn(),
    signUp: vi.fn(),
    clearError: vi.fn(),
    ...overrides.auth,
  };

  act(() => {
    root = createRoot(container);
    root.render(
      <PublicShell
        auth={auth}
        logoSrc="/logo.png"
        initialPage={overrides.initialPage || "discover"}
        discoverRepository={overrides.discoverRepository || createDiscoverRepository()}
      />,
    );
  });
  await flush();

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

function createDiscoverRepository() {
  return {
    listDiscoverPosts: vi.fn(async () => ({ posts: [], hasMore: false, nextCursor: null })),
  };
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}
