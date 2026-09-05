import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { DiscoverPage } from "./DiscoverPage.jsx";

const postId = "33333333-3333-4333-8333-333333333333";
let dom;
let container;
let root;

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  dom = new JSDOM("<!doctype html><html><body><div id=\"root\"></div></body></html>", {
    url: "https://coffee.test/",
  });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  container = document.getElementById("root");
});

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  dom?.window.close();
  delete globalThis.window;
  delete globalThis.document;
});

describe("DiscoverPage", () => {
  test("opens a detail URL and returns to the preserved timeline", async () => {
    const repository = createRepository();
    await renderPage(repository);

    const detailButton = buttonByLabel("「Summer Blend v3」の詳細を見る");
    await clickAsync(detailButton);
    expect(window.location.search).toBe(`?post=${postId}`);
    expect(document.querySelector("#discoverDetailTitle").textContent).toContain("Summer Blend");
    expect(document.querySelector("#discoverTitle").closest(".discover-page").hidden).toBe(true);

    click(buttonByLabel("閉じる"));
    await flushTimers();
    expect(window.location.search).toBe("");
    expect(document.querySelector("#discoverTitle").closest(".discover-page").hidden).toBe(false);
    expect(repository.listDiscoverPosts).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(detailButton);
  });

  test("opens a shared detail URL without loading the timeline", async () => {
    window.history.replaceState(null, "", `/?post=${postId}`);
    const repository = createRepository();
    await renderPage(repository);

    expect(document.querySelector("#discoverDetailTitle").textContent).toContain("Summer Blend");
    expect(repository.getDiscoverPost).toHaveBeenCalledWith(postId);
    expect(repository.listDiscoverPosts).not.toHaveBeenCalled();
  });

  test("returns to the preserved timeline on browser navigation", async () => {
    const repository = createRepository();
    await renderPage(repository);
    await clickAsync(buttonByLabel("「Summer Blend v3」の詳細を見る"));

    act(() => {
      window.history.replaceState(null, "", "/");
      window.dispatchEvent(new window.PopStateEvent("popstate"));
    });

    expect(document.querySelector("#discoverDetailTitle")).toBeNull();
    expect(document.querySelector("#discoverTitle").closest(".discover-page").hidden).toBe(false);
    expect(repository.listDiscoverPosts).toHaveBeenCalledTimes(1);
  });

  test("forwards the brew method copy action to the detail dialog", async () => {
    const repository = createRepository();
    const onCopyBrewMethod = vi.fn(async () => ({ id: "copied-method" }));
    await renderPage(repository, { onCopyBrewMethod });
    await clickAsync(buttonByLabel("「Summer Blend v3」の詳細を見る"));

    await clickAsync(buttonByText("淹れ方を保存"));

    expect(onCopyBrewMethod).toHaveBeenCalledWith(postFixture().blend.brew.method);
  });

  test("opens a copied blend after removing the detail URL", async () => {
    const repository = createRepository();
    const copiedBlend = { seriesId: "series-copy", versionId: "version-copy" };
    const onCopyBlend = vi.fn(async () => copiedBlend);
    const onOpenCopiedBlend = vi.fn();
    await renderPage(repository, { onCopyBlend, onOpenCopiedBlend });
    await clickAsync(buttonByLabel("「Summer Blend v3」の詳細を見る"));
    await clickAsync(buttonByText("ブレンドを履歴に追加"));

    click(buttonByText("編集を始める"));

    expect(window.location.search).toBe("");
    expect(onOpenCopiedBlend).toHaveBeenCalledWith(copiedBlend);
  });
});

async function renderPage(repository, props = {}) {
  act(() => {
    root = createRoot(container);
    root.render(<DiscoverPage discoverRepository={repository} {...props} />);
  });
  await flush();
}

function createRepository() {
  const post = postFixture();
  return {
    listDiscoverPosts: vi.fn(async () => ({ posts: [post], hasMore: false, nextCursor: null })),
    getDiscoverPost: vi.fn(async () => post),
  };
}

function postFixture() {
  return {
    postId,
    content: "公開コメント",
    publishedAt: "2026-08-26T03:00:00Z",
    author: { username: "shuhey", displayName: "Shuhey", avatarPath: null },
    blend: {
      name: "Summer Blend",
      goal: "軽い後味",
      version: 3,
      versionName: "v3",
      beans: [{ name: "Brazil", ratio: 100, roastLevel: "medium" }],
      brew: {
        method: {
          name: "V60 4投式",
          extractionType: "pour_over",
          equipmentName: "V60",
          bloomPercent: 12,
          bloomSeconds: 30,
          pour1Percent: 28,
          pour2Percent: 30,
          pour3Percent: 30,
        },
      },
    },
  };
}

async function clickAsync(element) {
  await act(async () => {
    element.click();
    await Promise.resolve();
    await Promise.resolve();
  });
}

function click(element) {
  act(() => element.click());
}

function buttonByLabel(label) {
  return [...document.querySelectorAll("button")].find((button) => button.getAttribute("aria-label") === label);
}

function buttonByText(text) {
  return [...document.querySelectorAll("button")].find((button) => button.textContent.trim() === text);
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

async function flushTimers() {
  await act(async () => {
    await new Promise((resolve) => window.setTimeout(resolve, 0));
  });
}
