import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { AuthScreen } from "./AuthScreen.jsx";

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

describe("AuthScreen", () => {
  test("renders the login form with current-password autocomplete", () => {
    renderAuthScreen();

    expect(document.querySelector("h1").textContent).toBe("Coffee Blend Lab");
    expect(document.querySelector("input[type='email']").getAttribute("autoComplete")).toBe("email");
    expect(document.querySelector("input[type='password']").getAttribute("autoComplete")).toBe("current-password");
    expect(buttonByText("ログイン")).toBeTruthy();
  });

  test("switches to sign up mode with new-password autocomplete", () => {
    renderAuthScreen();

    click(buttonByText("新規登録"));

    expect(document.querySelector("input[type='password']").getAttribute("autoComplete")).toBe("new-password");
    expect(document.querySelector(".primary-action").textContent).toBe("新規登録");
  });

  test("validates empty values and short passwords", async () => {
    renderAuthScreen();

    await submit();
    expect(document.querySelector(".auth-message").textContent).toBe("メールアドレスを入力してください");

    change(document.querySelector("input[type='email']"), "user@example.com");
    await submit();
    expect(document.querySelector(".auth-message").textContent).toBe("パスワードを入力してください");

    change(document.querySelector("input[type='password']"), "short");
    await submit();
    expect(document.querySelector(".auth-message").textContent).toBe("パスワードは8文字以上で入力してください");
  });

  test("submits login values through the login callback", async () => {
    const onSignIn = vi.fn(async () => ({ ok: true }));
    renderAuthScreen({ onSignIn });

    change(document.querySelector("input[type='email']"), " user@example.com ");
    change(document.querySelector("input[type='password']"), " password123 ");
    await submit();

    expect(onSignIn).toHaveBeenCalledWith(" user@example.com ", " password123 ");
  });

  test("submits sign up values and shows email confirmation message", async () => {
    const onSignUp = vi.fn(async () => ({ ok: true, emailConfirmationRequired: true }));
    renderAuthScreen({ onSignUp });

    click(buttonByText("新規登録"));
    change(document.querySelector("input[type='email']"), "user@example.com");
    change(document.querySelector("input[type='password']"), "password123");
    await submit();

    expect(onSignUp).toHaveBeenCalledWith("user@example.com", "password123");
    expect(document.querySelector(".auth-message[data-status='success']").textContent).toBe(
      "確認メールを送信しました。メール内のリンクから登録を完了してください",
    );
  });

  test("prevents duplicate submit while processing", async () => {
    const deferred = createDeferred();
    const onSignIn = vi.fn(() => deferred.promise);
    renderAuthScreen({ onSignIn });

    change(document.querySelector("input[type='email']"), "user@example.com");
    change(document.querySelector("input[type='password']"), "password123");
    await act(async () => {
      document.querySelector("form").dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true }));
      document.querySelector("form").dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true }));
      await Promise.resolve();
    });

    expect(onSignIn).toHaveBeenCalledTimes(1);
    expect(document.querySelector(".primary-action").disabled).toBe(true);

    await act(async () => {
      deferred.resolve({ ok: true });
      await deferred.promise;
    });
  });

  test("renders auth errors from props", () => {
    renderAuthScreen({ error: "login failed" });

    expect(document.querySelector(".auth-message").textContent).toBe("login failed");
  });
});

function renderAuthScreen(overrides = {}) {
  const props = {
    error: "",
    onSignIn: vi.fn(async () => ({ ok: true })),
    onSignUp: vi.fn(async () => ({ ok: true, emailConfirmationRequired: false })),
    onClearError: vi.fn(),
    ...overrides,
  };

  act(() => {
    root = createRoot(container);
    root.render(<AuthScreen {...props} />);
  });

  return props;
}

function click(element) {
  act(() => {
    element.click();
  });
}

function change(input, value) {
  act(() => {
    reactProps(input).onChange({ target: { value } });
  });
}

async function submit() {
  await act(async () => {
    document.querySelector("form").dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true }));
    await Promise.resolve();
  });
}

function reactProps(element) {
  const key = Object.keys(element).find((item) => item.startsWith("__reactProps$"));
  return element[key];
}

function buttonByText(text) {
  return [...document.querySelectorAll("button")].find((button) => button.textContent === text);
}

function createDeferred() {
  let resolve;
  const promise = new Promise((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
}
