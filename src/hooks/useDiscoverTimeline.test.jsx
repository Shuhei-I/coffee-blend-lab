import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { useDiscoverTimeline } from "./useDiscoverTimeline.js";

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

describe("useDiscoverTimeline", () => {
  test("loads the first timeline page", async () => {
    const firstPost = postFixture("post-1");
    const repository = createRepository([
      { posts: [firstPost], hasMore: true, nextCursor: { publishedAt: "2026-08-26T03:00:00Z", postId: "post-1" } },
    ]);
    const rendered = await renderHook(repository);

    expect(rendered.current.loading).toBe(false);
    expect(rendered.current.posts).toEqual([firstPost]);
    expect(rendered.current.hasMore).toBe(true);
    expect(rendered.current.error).toBeNull();
  });

  test("appends the next page without duplicate posts", async () => {
    const firstPost = postFixture("post-1");
    const secondPost = postFixture("post-2");
    const cursor = { publishedAt: "2026-08-26T03:00:00Z", postId: "post-1" };
    const repository = createRepository([
      { posts: [firstPost], hasMore: true, nextCursor: cursor },
      { posts: [firstPost, secondPost], hasMore: false, nextCursor: null },
    ]);
    const rendered = await renderHook(repository);

    await act(async () => {
      await rendered.current.loadMore();
    });

    expect(repository.listDiscoverPosts).toHaveBeenLastCalledWith({ cursor });
    expect(rendered.current.posts).toEqual([firstPost, secondPost]);
    expect(rendered.current.hasMore).toBe(false);
  });

  test("exposes an initial load error and retries", async () => {
    const post = postFixture("post-1");
    const repository = createRepository([
      new Error("load failed"),
      { posts: [post], hasMore: false, nextCursor: null },
    ]);
    const rendered = await renderHook(repository);

    expect(rendered.current.error?.message).toBe("load failed");
    await act(async () => {
      await rendered.current.retry();
    });
    expect(rendered.current.posts).toEqual([post]);
    expect(rendered.current.error).toBeNull();
  });
});

async function renderHook(repository) {
  const rendered = { current: null };

  function TestComponent() {
    rendered.current = useDiscoverTimeline({ discoverRepository: repository });
    return null;
  }

  act(() => {
    root = createRoot(container);
    root.render(<TestComponent />);
  });
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });

  return {
    get current() {
      return rendered.current;
    },
  };
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

function postFixture(postId) {
  return {
    postId,
    content: "公開コメント",
    publishedAt: "2026-08-26T03:00:00Z",
    author: { username: "shuhey", displayName: "Shuhey", avatarPath: null },
    blend: { name: "Summer Blend", goal: "", version: 3, versionName: "", beans: [] },
  };
}
