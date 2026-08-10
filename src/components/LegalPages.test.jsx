import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { isLegalPage, LegalPage } from "./LegalPages.jsx";

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

describe("LegalPage", () => {
  test("renders the privacy policy", () => {
    renderLegalPage({ page: "privacy" });

    expect(document.querySelector("h2").textContent).toBe("プライバシーポリシー");
    expect(document.body.textContent).toContain("Supabase");
  });

  test("renders the terms of use", () => {
    renderLegalPage({ page: "terms" });

    expect(document.querySelector("h2").textContent).toBe("利用規約");
    expect(document.body.textContent).toContain("個人向け実験記録ツール");
  });

  test("renders contact as preparing feedback support", () => {
    renderLegalPage({ page: "contact" });

    expect(document.querySelector("h2").textContent).toBe("Contact / Feedback");
    expect(document.querySelector("a")).toBeNull();
    expect(document.body.textContent).toContain("問い合わせ窓口は準備中です");
    expect(document.body.textContent).toContain("認証情報、パスワード、個人情報");
  });

  test("calls back to Manage", () => {
    const onBack = vi.fn();
    renderLegalPage({ onBack });

    act(() => {
      document.querySelector("button").click();
    });

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  test("recognizes legal page identifiers", () => {
    expect(isLegalPage("privacy")).toBe(true);
    expect(isLegalPage("terms")).toBe(true);
    expect(isLegalPage("contact")).toBe(true);
    expect(isLegalPage("blend")).toBe(false);
  });
});

function renderLegalPage(overrides = {}) {
  const props = {
    page: "privacy",
    onBack: vi.fn(),
    ...overrides,
  };

  act(() => {
    root = createRoot(container);
    root.render(<LegalPage {...props} />);
  });

  return props;
}
