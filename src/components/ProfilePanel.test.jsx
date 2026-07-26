import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { profileLabels } from "../domain/coffee/profile.js";
import { ProfilePanel } from "./ProfilePanel.jsx";

let dom;
let container;
let root;
let canvasContext;

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  dom = new JSDOM("<!doctype html><html><body><div id=\"root\"></div></body></html>");
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  canvasContext = createCanvasContext();
  dom.window.HTMLCanvasElement.prototype.getContext = vi.fn(() => canvasContext);
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

describe("ProfilePanel", () => {
  test("renders profile values in existing label order", () => {
    renderProfilePanel();

    expect([...document.querySelectorAll(".metric-label span:first-child")].map((item) => item.textContent)).toEqual(
      profileLabels.map(([, label]) => label),
    );
    expect([...document.querySelectorAll(".metric-label span:last-child")].map((item) => item.textContent)).toEqual([
      "80",
      "60",
      "20",
      "40",
      "90",
    ]);
  });

  test("shows existing total output state", () => {
    renderProfilePanel({ total: 95 });

    const total = document.querySelector(".total-output");
    expect(total.textContent).toBe("95%");
    expect(total.dataset.ok).toBe("false");
  });

  test("keeps canvas as the drawing target and uses canvas drawing calls", () => {
    renderProfilePanel();

    const canvas = document.querySelector("canvas");
    expect(canvas).toBeTruthy();
    expect(canvas.width).toBe(420);
    expect(canvas.height).toBe(300);
    expect(canvas.getContext).toHaveBeenCalledWith("2d");
    expect(canvasContext.clearRect).toHaveBeenCalledWith(0, 0, 420, 300);
    expect(canvasContext.beginPath).toHaveBeenCalled();
    expect(canvasContext.lineTo).toHaveBeenCalled();
    expect(canvasContext.fillText).toHaveBeenCalledTimes(profileLabels.length);
    expect(canvasContext.fill).toHaveBeenCalled();
    expect(canvasContext.stroke).toHaveBeenCalled();
  });

  test("redraws when profile values change", () => {
    const firstProfile = createProfile({ acidity: 10 });
    const secondProfile = createProfile({ acidity: 70 });
    renderProfilePanel({ profile: firstProfile });
    const firstClearCount = canvasContext.clearRect.mock.calls.length;

    act(() => {
      root.render(<ProfilePanel profile={secondProfile} total={100} />);
    });

    expect(canvasContext.clearRect.mock.calls.length).toBe(firstClearCount + 1);
  });

  test("preserves zero profile behavior", () => {
    renderProfilePanel({ profile: createProfile({ acidity: 0, sweetness: 0, bitterness: 0, body: 0, aroma: 0 }), total: 0 });

    expect(document.querySelector(".total-output").textContent).toBe("0%");
    expect([...document.querySelectorAll(".meter span")].map((meter) => meter.style.width)).toEqual([
      "0%",
      "0%",
      "0%",
      "0%",
      "0%",
    ]);
    expect(canvasContext.clearRect).toHaveBeenCalled();
  });

  test("depends only on profile and total props", () => {
    renderProfilePanel({
      profile: createProfile({ acidity: 1, sweetness: 2, bitterness: 3, body: 4, aroma: 5 }),
      total: 100,
    });

    expect(document.querySelectorAll(".metric")).toHaveLength(profileLabels.length);
    expect(document.querySelector(".total-output").dataset.ok).toBe("true");
  });
});

function renderProfilePanel(overrides = {}) {
  const props = {
    profile: createProfile(),
    total: 100,
    ...overrides,
  };

  act(() => {
    if (!root) root = createRoot(container);
    root.render(<ProfilePanel {...props} />);
  });

  return props;
}

function createProfile(overrides = {}) {
  return {
    acidity: 80,
    sweetness: 60,
    bitterness: 20,
    body: 40,
    aroma: 90,
    ...overrides,
  };
}

function createCanvasContext() {
  return {
    beginPath: vi.fn(),
    clearRect: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    fillText: vi.fn(),
    lineTo: vi.fn(),
    moveTo: vi.fn(),
    stroke: vi.fn(),
    set fillStyle(value) {
      this.currentFillStyle = value;
    },
    set font(value) {
      this.currentFont = value;
    },
    set lineWidth(value) {
      this.currentLineWidth = value;
    },
    set strokeStyle(value) {
      this.currentStrokeStyle = value;
    },
    set textAlign(value) {
      this.currentTextAlign = value;
    },
    set textBaseline(value) {
      this.currentTextBaseline = value;
    },
  };
}
