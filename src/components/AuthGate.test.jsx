import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { AuthGate } from "./AuthGate.jsx";

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

describe("AuthGate", () => {
  test("renders loading state", () => {
    renderAuthGate({ loading: true });

    expect(document.querySelector("h1").textContent).toBe("読み込み中");
  });

  test("renders AuthScreen when unauthenticated", () => {
    renderAuthGate({ session: null });

    expect(document.querySelector("h1").textContent).toBe("Coffee Blend Lab");
    expect(document.querySelector("form")).toBeTruthy();
  });

  test("renders initialization loading state", () => {
    renderAuthGate({ session: createSession(), isInitializingUser: true });

    expect(document.querySelector("h1").textContent).toBe("初期データ準備中");
  });

  test("renders initialization error with retry and logout actions", () => {
    const retryInitializeUser = vi.fn();
    const signOut = vi.fn();
    renderAuthGate({
      session: createSession(),
      initializationError: "rpc failed",
      retryInitializeUser,
      signOut,
    });

    expect(document.querySelector("h1").textContent).toBe("初期化エラー");
    expect(document.body.textContent).toContain("rpc failed");
    buttonByText("再試行").click();
    buttonByText("ログアウト").click();
    expect(retryInitializeUser).toHaveBeenCalledTimes(1);
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  test("renders existing app children after auth and initialization", () => {
    renderAuthGate({ session: createSession() });

    expect(document.querySelector("#app").textContent).toBe("Existing App");
  });
});

function renderAuthGate(overrides = {}) {
  const auth = {
    session: null,
    loading: false,
    error: "",
    initializationError: null,
    isInitializingUser: false,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    retryInitializeUser: vi.fn(),
    clearError: vi.fn(),
    ...overrides,
  };

  act(() => {
    root = createRoot(container);
    root.render(
      <AuthGate auth={auth}>
        <div id="app">Existing App</div>
      </AuthGate>,
    );
  });

  return auth;
}

function createSession() {
  return { user: { id: "user-1", email: "user@example.com" } };
}

function buttonByText(text) {
  return [...document.querySelectorAll("button")].find((button) => button.textContent === text);
}
