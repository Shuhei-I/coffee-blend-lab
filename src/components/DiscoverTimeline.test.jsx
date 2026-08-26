import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { DiscoverTimeline } from "./DiscoverTimeline.jsx";

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
  act(() => root?.unmount());
  root = undefined;
  dom?.window.close();
  delete globalThis.window;
  delete globalThis.document;
});

describe("DiscoverTimeline", () => {
  test("renders public blend data and an optional login action", async () => {
    const onLogin = vi.fn();
    await renderTimeline({ repository: createRepository([{ posts: [postFixture()], hasMore: false, nextCursor: null }]), onLogin });

    expect(document.querySelector("#discoverTitle").textContent).toBe("公開ブレンド");
    expect(document.querySelector(".discover-card").textContent).toContain("Shuhey");
    expect(document.querySelector(".discover-card").textContent).toContain("@shuhey");
    expect(document.querySelector(".discover-card").textContent).toContain("Summer Blend v3");
    expect(document.querySelector(".discover-card").textContent.match(/Summer Blend/g)).toHaveLength(1);
    expect([...document.querySelectorAll(".discover-bean-row")].map((row) => row.textContent)).toEqual([
      "Brazil50%",
      "Ethiopia50%",
    ]);

    click(buttonByText("ブレンドを公開する"));
    expect(onLogin).toHaveBeenCalledTimes(1);
  });

  test("renders an empty state", async () => {
    await renderTimeline({ repository: createRepository([{ posts: [], hasMore: false, nextCursor: null }]) });

    expect(document.body.textContent).toContain("まだ公開ブレンドはありません");
  });

  test("loads another page from the timeline", async () => {
    const firstPost = postFixture({ postId: "post-1" });
    const secondPost = postFixture({ postId: "post-2", blend: { ...postFixture().blend, name: "Autumn Blend" } });
    const cursor = { publishedAt: firstPost.publishedAt, postId: firstPost.postId };
    const repository = createRepository([
      { posts: [firstPost], hasMore: true, nextCursor: cursor },
      { posts: [secondPost], hasMore: false, nextCursor: null },
    ]);
    await renderTimeline({ repository });

    await clickAsync(buttonByText("さらに読み込む"));

    expect(repository.listDiscoverPosts).toHaveBeenLastCalledWith({ cursor });
    expect([...document.querySelectorAll(".discover-card h2")].map((heading) => heading.textContent)).toEqual([
      "Summer Blend v3",
      "Autumn Blend v3",
    ]);
  });

  test("shows a retry action after an initial error", async () => {
    const repository = createRepository([
      new Error("load failed"),
      { posts: [], hasMore: false, nextCursor: null },
    ]);
    await renderTimeline({ repository });

    expect(document.body.textContent).toContain("公開ブレンドを読み込めませんでした");
    await clickAsync(buttonByText("再試行"));
    expect(document.body.textContent).toContain("まだ公開ブレンドはありません");
  });
});

async function renderTimeline({ repository, onLogin } = {}) {
  act(() => {
    root = createRoot(container);
    root.render(<DiscoverTimeline discoverRepository={repository} onLogin={onLogin} />);
  });
  await flush();
}

function createRepository(results) {
  let index = 0;
  return {
    listDiscoverPosts: vi.fn(async () => {
      const result = results[Math.min(index, results.length - 1)];
      index += 1;
      if (result instanceof Error) throw result;
      return result;
    }),
  };
}

function postFixture(patch = {}) {
  const base = {
    postId: "post-1",
    content: "夏向けに軽く調整しました",
    publishedAt: "2026-08-26T03:00:00Z",
    author: { username: "shuhey", displayName: "Shuhey", avatarPath: null },
    blend: {
      name: "Summer Blend",
      goal: "軽い後味",
      version: 3,
      versionName: "Summer Blend",
      beans: [
        { name: "Brazil", ratio: 50, roastLevel: "medium" },
        { name: "Ethiopia", ratio: 50, roastLevel: "light" },
      ],
    },
  };
  return { ...base, ...patch };
}

function click(element) {
  act(() => element.click());
}

async function clickAsync(element) {
  await act(async () => {
    element.click();
    await Promise.resolve();
  });
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

function buttonByText(text) {
  return [...document.querySelectorAll("button")].find((button) => button.textContent === text);
}
