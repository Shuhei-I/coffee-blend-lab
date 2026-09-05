import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { BrewStopwatch } from "./BrewStopwatch.jsx";

let dom;
let container;
let root;

beforeEach(() => {
  vi.useFakeTimers();
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
  vi.useRealTimers();
});

describe("BrewStopwatch", () => {
  test("renders the idle state", () => {
    renderBrewStopwatch();

    expect(readout()).toBe("00:00");
    expect(document.body.textContent).toContain("抽出開始時に Start を押してください。");
    expect(buttonByText("Start").disabled).toBe(false);
    expect(buttonByText("Reset").disabled).toBe(true);
  });

  test("places reset before start in the action row", () => {
    renderBrewStopwatch();

    expect([...document.querySelectorAll(".brew-stopwatch-actions button")].map((button) => button.textContent)).toEqual([
      "Reset",
      "Start",
    ]);
  });

  test("counts down before starting measurement", () => {
    renderBrewStopwatch();

    click(buttonByText("Start"));
    expect(readout()).toBe("3");

    advance(1000);
    expect(readout()).toBe("2");

    advance(1000);
    expect(readout()).toBe("1");

    advance(1000);
    expect(readout()).toBe("00:00");
    expect(document.body.textContent).toContain("計測中");
  });

  test("increments elapsed time while running", () => {
    renderBrewStopwatch();

    click(buttonByText("Start"));
    advanceToRunning();
    advance(1000);

    expect(readout()).toBe("00:01");
  });

  test("resets to idle", () => {
    renderBrewStopwatch();

    click(buttonByText("Start"));
    advanceToRunning();
    advance(1000);
    click(buttonByText("Reset"));

    expect(readout()).toBe("00:00");
    expect(document.body.textContent).toContain("抽出開始時に Start を押してください。");
    expect(buttonByText("Reset").disabled).toBe(true);
  });

  test("auto-resets after five minutes", () => {
    renderBrewStopwatch();

    click(buttonByText("Start"));
    advanceToRunning();
    advance(300000);

    expect(readout()).toBe("00:00");
    expect(document.body.textContent).toContain("5分経過したためリセットしました。");

    advance(1500);

    expect(document.body.textContent).toContain("抽出開始時に Start を押してください。");
  });
});

function renderBrewStopwatch() {
  act(() => {
    root = createRoot(container);
    root.render(<BrewStopwatch />);
  });
}

function click(element) {
  act(() => {
    element.click();
  });
}

function advance(ms) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

function advanceToRunning() {
  advance(1000);
  advance(1000);
  advance(1000);
}

function readout() {
  return document.querySelector(".brew-stopwatch-readout").textContent;
}

function buttonByText(text) {
  return [...document.querySelectorAll("button")].find((button) => button.textContent === text);
}
