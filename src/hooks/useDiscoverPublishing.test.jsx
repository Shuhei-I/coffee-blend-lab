import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { useDiscoverPublishing } from "./useDiscoverPublishing.js";

const versionId = "22222222-2222-4222-8222-222222222222";

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

describe("useDiscoverPublishing", () => {
  test("loads publications and indexes them by recipe version", async () => {
    const publication = { versionId, postId: "post-1", content: "公開コメント", status: "published" };
    const repository = createRepository({ publications: [publication] });
    const rendered = await renderHook({ versionIds: [versionId], discoverRepository: repository });

    expect(repository.getOwnPostsForVersions).toHaveBeenCalledWith([versionId]);
    expect(rendered.current.loading).toBe(false);
    expect(rendered.current.loadError).toBeNull();
    expect(rendered.current.publicationsByVersionId[versionId]).toEqual(publication);
  });

  test("publishes a version and updates its local publication state", async () => {
    const repository = createRepository();
    const rendered = await renderHook({ versionIds: [versionId], discoverRepository: repository });

    let result;
    await act(async () => {
      result = await rendered.current.savePublication({ versionId, content: "新しいコメント", status: "private", includeBeanDetails: true });
    });

    expect(repository.publishRecipeVersion).toHaveBeenCalledWith({
      versionId,
      content: "新しいコメント",
      status: "private",
      includeBeanDetails: true,
    });
    expect(result).toEqual(expect.objectContaining({ versionId, content: "新しいコメント", status: "private" }));
    expect(rendered.current.publicationsByVersionId[versionId]).toEqual(result);
    expect(rendered.current.saveError).toBeNull();
  });

  test("keeps the dialog flow recoverable when publishing fails", async () => {
    const error = new Error("publish failed");
    const repository = createRepository({ publishError: error });
    const rendered = await renderHook({ versionIds: [versionId], discoverRepository: repository });

    await act(async () => {
      await expect(rendered.current.savePublication({ versionId })).resolves.toBeNull();
    });

    expect(rendered.current.saveError).toBe(error);
    expect(rendered.current.savingVersionId).toBeNull();
  });
});

async function renderHook(hookProps) {
  const rendered = { current: null };

  function TestComponent() {
    rendered.current = useDiscoverPublishing(hookProps);
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

function createRepository({ publications = [], publishError = null } = {}) {
  return {
    getOwnPostsForVersions: vi.fn(async () => publications),
    publishRecipeVersion: vi.fn(async ({ status = "published" }) => {
      if (publishError) throw publishError;
      return {
        postId: "post-1",
        snapshotId: "snapshot-1",
        status,
        publishedAt: status === "published" ? "2026-08-16T00:00:00Z" : null,
      };
    }),
  };
}
