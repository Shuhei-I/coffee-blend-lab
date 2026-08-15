import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { ProfileSettingsPanel } from "./ProfileSettingsPanel.jsx";

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

describe("ProfileSettingsPanel", () => {
  test("renders the current profile and saves normalized input", async () => {
    const onSave = vi.fn(async () => ({}));
    renderProfileSettingsPanel({
      profile: {
        username: "Shuhey_Inoue",
        displayName: "Shuhey Inoue",
        bio: "Coffee blend experiments",
      },
      onSave,
    });

    const [usernameInput, displayNameInput] = document.querySelectorAll("input");
    const bioInput = document.querySelector("textarea");
    expect(usernameInput.value).toBe("Shuhey_Inoue");
    expect(displayNameInput.value).toBe("Shuhey Inoue");
    expect(bioInput.value).toBe("Coffee blend experiments");

    await submit();

    expect(onSave).toHaveBeenCalledWith({
      username: "shuhey_inoue",
      displayName: "Shuhey Inoue",
      bio: "Coffee blend experiments",
      avatarPath: null,
    });
  });

  test("disables save for invalid usernames", async () => {
    const onSave = vi.fn();
    renderProfileSettingsPanel({ profile: { username: "no" }, onSave });

    expect(document.querySelector("button[type='submit']").disabled).toBe(true);
    expect(document.querySelector("[role='status']").textContent).toContain("ユーザー名は3〜20文字");
    await submit();

    expect(onSave).not.toHaveBeenCalled();
  });

  test("shows loading and error states", () => {
    renderProfileSettingsPanel({ loading: true });
    expect(document.querySelector("[role='status']").textContent).toBe("読み込み中...");

    renderProfileSettingsPanel({ loading: false, loadError: new Error("load failed") });
    expect(document.querySelector("[role='status']").textContent).toBe("プロフィールを読み込めませんでした。");

    renderProfileSettingsPanel({ saveError: new Error("save failed") });
    expect(document.querySelector("[role='status']").textContent).toBe("save failed");
  });
});

function renderProfileSettingsPanel(overrides = {}) {
  const props = {
    profile: {
      username: "shuhey",
      displayName: "Shuhey",
      bio: "",
    },
    loading: false,
    loadError: null,
    saveError: null,
    saveStatus: "saved",
    onSave: vi.fn(),
    ...overrides,
  };

  act(() => {
    if (!root) {
      root = createRoot(container);
    }
    root.render(<ProfileSettingsPanel {...props} />);
  });

  return props;
}

async function submit() {
  await act(async () => {
    document.querySelector("form").dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true }));
  });
}
