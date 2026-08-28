import { describe, expect, test } from "vitest";
import { buildDiscoverUrl, getInitialAppPage, readDiscoverPostId } from "./navigation.js";

describe("Discover navigation", () => {
  test("reads a post id and opens Discover for a shared URL", () => {
    expect(readDiscoverPostId("?post=post-1")).toBe("post-1");
    expect(getInitialAppPage("?post=post-1")).toBe("discover");
    expect(getInitialAppPage("")).toBe("blend");
  });

  test("adds and removes the post parameter while preserving the rest of the URL", () => {
    expect(buildDiscoverUrl("https://coffee.test/?source=share#top", "post-1")).toBe(
      "/?source=share&post=post-1#top",
    );
    expect(buildDiscoverUrl("https://coffee.test/?source=share&post=post-1#top", null)).toBe(
      "/?source=share#top",
    );
  });
});
