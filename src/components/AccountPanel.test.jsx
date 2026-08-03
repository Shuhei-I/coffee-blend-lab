import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { AccountPanel } from "./AccountPanel.jsx";

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

describe("AccountPanel", () => {
  test("renders the signed-in email and calls sign out", () => {
    const onSignOut = vi.fn();
    renderAccountPanel({ email: "user@example.com", onSignOut });

    expect(document.querySelector(".account-card strong").textContent).toBe("user@example.com");

    act(() => {
      document.querySelector("button").click();
    });

    expect(onSignOut).toHaveBeenCalledTimes(1);
  });

  test("keeps a fallback label when email is unavailable", () => {
    renderAccountPanel({ email: "" });

    expect(document.querySelector(".account-card strong").textContent).toBe("Signed in");
  });
});

function renderAccountPanel(overrides = {}) {
  const props = {
    email: "user@example.com",
    onSignOut: vi.fn(),
    ...overrides,
  };

  act(() => {
    root = createRoot(container);
    root.render(<AccountPanel {...props} />);
  });

  return props;
}
