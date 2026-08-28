import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { DiscoverPostDetail } from "./DiscoverPostDetail.jsx";

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

describe("DiscoverPostDetail", () => {
  test("renders the public snapshot and returns to Discover", async () => {
    const onClose = vi.fn();
    await renderDetail({ repository: createRepository([postFixture()]), onClose });

    expect(document.querySelector("dialog").hasAttribute("open")).toBe(true);
    expect(document.querySelector("#discoverDetailTitle").textContent).toBe("Summer Blend v3");
    expect(document.body.textContent).toContain("夏向けに軽く調整しました");
    expect([...document.querySelectorAll(".discover-detail-bean-row")].map((row) => row.textContent)).toEqual([
      "Brazil焙煎: ミディアム50%",
      "Ethiopia焙煎: ライト50%",
    ]);
    expect([...document.querySelectorAll(".discover-brew-facts > div")].map((row) => row.textContent)).toEqual([
      "淹れ方V60 4投式",
      "抽出方式ドリップ",
      "使用器具V60",
      "挽き目中細挽き",
      "湯温92℃",
      "粉量15g",
      "抽出量240g",
      "抽出比率1:16",
    ]);
    expect([...document.querySelectorAll(".discover-pour-list li")].map((row) => row.textContent)).toEqual([
      "蒸らし12%29g30秒",
      "1投目28%67g",
      "2投目30%72g",
      "3投目30%72g",
    ]);

    click(buttonByLabel("閉じる"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("renders a not-found state", async () => {
    await renderDetail({ repository: createRepository([null]) });

    expect(document.body.textContent).toContain("公開ブレンドが見つかりませんでした");
  });

  test("retries after an error", async () => {
    const repository = createRepository([new Error("load failed"), postFixture()]);
    await renderDetail({ repository });

    expect(document.body.textContent).toContain("公開ブレンドを読み込めませんでした");
    await clickAsync(buttonByText("再試行"));
    expect(document.querySelector("#discoverDetailTitle")).toBeTruthy();
  });

  test("closes from the backdrop and cancel action", async () => {
    const onClose = vi.fn();
    await renderDetail({ repository: createRepository([postFixture()]), onClose });
    const dialog = document.querySelector("dialog");

    click(dialog);
    expect(onClose).toHaveBeenCalledTimes(1);

    const cancelEvent = new window.Event("cancel", { cancelable: true });
    act(() => dialog.dispatchEvent(cancelEvent));
    expect(cancelEvent.defaultPrevented).toBe(true);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  test("copies the public brew method to the signed-in user's master", async () => {
    const onCopyBrewMethod = vi.fn(async () => ({ id: "copied-method" }));
    await renderDetail({ repository: createRepository([postFixture()]), onCopyBrewMethod });

    await clickAsync(buttonByText("自分の淹れ方に追加"));

    expect(onCopyBrewMethod).toHaveBeenCalledWith(postFixture().blend.brew.method);
    expect(document.body.textContent).toContain("淹れ方マスタに追加しました");
    expect(buttonByText("追加済み").disabled).toBe(true);
  });

  test("shows a retryable message when copying a brew method fails", async () => {
    const onCopyBrewMethod = vi.fn(async () => null);
    await renderDetail({ repository: createRepository([postFixture()]), onCopyBrewMethod });

    await clickAsync(buttonByText("自分の淹れ方に追加"));

    expect(document.querySelector('[role="alert"]').textContent).toContain("追加できませんでした");
    expect(buttonByText("自分の淹れ方に追加").disabled).toBe(false);
  });

  test("sends anonymous users to login before copying a brew method", async () => {
    const onLogin = vi.fn();
    await renderDetail({ repository: createRepository([postFixture()]), onLogin });

    click(buttonByText("自分の淹れ方に追加"));

    expect(onLogin).toHaveBeenCalledTimes(1);
  });

  test("copies a public blend and opens the copied recipe", async () => {
    const copiedBlend = {
      seriesId: "series-copy",
      versionId: "version-copy",
      series: { name: "Summer Blend（コピー）" },
    };
    const onCopyBlend = vi.fn(async () => copiedBlend);
    const onOpenCopiedBlend = vi.fn();
    await renderDetail({
      repository: createRepository([postFixture()]),
      onCopyBlend,
      onOpenCopiedBlend,
    });

    await clickAsync(buttonByText("自分のブレンドに追加"));

    expect(onCopyBlend).toHaveBeenCalledWith(postFixture().postId);
    expect(document.body.textContent).toContain("「Summer Blend（コピー）」を履歴に追加しました。");
    click(buttonByText("編集を始める"));
    expect(onOpenCopiedBlend).toHaveBeenCalledWith(copiedBlend);
  });

  test("allows retrying a failed public blend copy", async () => {
    const onCopyBlend = vi.fn(async () => null);
    await renderDetail({ repository: createRepository([postFixture()]), onCopyBlend });

    await clickAsync(buttonByText("自分のブレンドに追加"));

    expect(document.querySelector(".discover-detail-actions [role=\"alert\"]").textContent).toContain("追加できませんでした");
    expect(buttonByText("自分のブレンドに追加").disabled).toBe(false);
  });
  test("renders engagement and sends an authenticated like action", async () => {
    const interactionRepository = {
      getEngagement: vi.fn(async () => new Map([
        [postFixture().postId, { likeCount: 4, commentCount: 1, likedByViewer: false }],
      ])),
      listComments: vi.fn(async () => [{
        commentId: "comment-1",
        content: "試してみます",
        createdAt: "2026-08-27T00:00:00Z",
        author: { displayName: "Coffee Explorer", username: "explorer", avatarPath: null },
        isAuthor: false,
        canHide: false,
        status: "visible",
      }]),
      setLike: vi.fn(async () => {}),
    };
    await renderDetail({ repository: createRepository([postFixture()]), interactionRepository, isAuthenticated: true });

    expect(document.querySelector('[aria-label="いいね"]').textContent).toContain("4");
    expect(document.body.textContent).toContain("試してみます");
    await clickAsync(buttonByLabel("いいね"));
    expect(interactionRepository.setLike).toHaveBeenCalledWith(postFixture().postId, true);
  });
});

async function renderDetail({
  repository,
  onCopyBrewMethod,
  onCopyBlend,
  onOpenCopiedBlend,
  onLogin,
  interactionRepository,
  isAuthenticated = false,
  onClose = vi.fn(),
}) {
  act(() => {
    root = createRoot(container);
    root.render(
      <DiscoverPostDetail
        postId="33333333-3333-4333-8333-333333333333"
        discoverRepository={repository}
        onCopyBrewMethod={onCopyBrewMethod}
        onCopyBlend={onCopyBlend}
        onOpenCopiedBlend={onOpenCopiedBlend}
        onLogin={onLogin}
        interactionRepository={interactionRepository}
        isAuthenticated={isAuthenticated}
        onClose={onClose}
      />,
    );
  });
  await flush();
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
    content: "夏向けに軽く調整しました",
    publishedAt: "2026-08-26T03:00:00Z",
    author: { username: "shuhey", displayName: "Shuhey", avatarPath: null },
    blend: {
      name: "Summer Blend",
      goal: "軽い後味",
      version: 3,
      versionName: "v3",
      beans: [
        { name: "Brazil", ratio: 50, roastLevel: "medium" },
        { name: "Ethiopia", ratio: 50, roastLevel: "light" },
      ],
      brew: {
        doseGram: 15,
        brewRatio: 16,
        targetBrewGram: 240,
        grindSize: "medium_fine",
        temperatureC: 92,
        totalBrewSeconds: null,
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

function click(element) {
  act(() => element.click());
}

async function clickAsync(element) {
  await act(async () => {
    element.click();
    await Promise.resolve();
    await Promise.resolve();
  });
}

function buttonByText(text) {
  return [...document.querySelectorAll("button")].find((button) => button.textContent.trim() === text);
}

function buttonByLabel(label) {
  return [...document.querySelectorAll("button")].find((button) => button.getAttribute("aria-label") === label);
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}
