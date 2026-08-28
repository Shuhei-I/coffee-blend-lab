import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { useDiscoverPost } from "./useDiscoverPost.js";

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

describe("useDiscoverPost", () => {
  test("loads a public post", async () => {
    const post = postFixture();
    const repository = createRepository([post]);
    const rendered = await renderHook({ postId: post.postId, repository });

    expect(rendered.current.loading).toBe(false);
    expect(rendered.current.post).toEqual(post);
    expect(rendered.current.error).toBeNull();
    expect(repository.getDiscoverPost).toHaveBeenCalledWith(post.postId);
  });

  test("represents a missing post as null", async () => {
    const rendered = await renderHook({ postId: "missing-post", repository: createRepository([null]) });

    expect(rendered.current.loading).toBe(false);
    expect(rendered.current.post).toBeNull();
    expect(rendered.current.error).toBeNull();
  });

  test("exposes an error and retries", async () => {
    const post = postFixture();
    const repository = createRepository([new Error("load failed"), post]);
    const rendered = await renderHook({ postId: post.postId, repository });

    expect(rendered.current.error?.message).toBe("load failed");
    await act(async () => {
      rendered.current.retry();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(rendered.current.post).toEqual(post);
    expect(rendered.current.error).toBeNull();
  });
});

async function renderHook({ postId, repository }) {
  const rendered = { current: null };

  function TestComponent() {
    rendered.current = useDiscoverPost({ postId, discoverRepository: repository });
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
    getDiscoverPost: vi.fn(async () => {
      const result = results[Math.min(index, results.length - 1)];
      index += 1;
      if (result instanceof Error) throw result;
      return result;
    }),
  };
}

function postFixture() {
  return {
    postId: "33333333-3333-4333-8333-333333333333",
    content: "公開コメント",
    publishedAt: "2026-08-26T03:00:00Z",
    author: { username: "shuhey", displayName: "Shuhey", avatarPath: null },
    blend: { name: "Summer Blend", goal: "軽い後味", version: 3, versionName: "v3", beans: [] },
  };
}
