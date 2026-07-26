import { afterEach, describe, expect, test, vi } from "vitest";
import { downloadFile } from "./downloadFile.js";

describe("downloadFile", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("creates a Blob, object URL, anchor download, click, and revokes the URL", () => {
    const click = vi.fn();
    const anchor = { click };
    const createElement = vi.fn(() => anchor);
    const createObjectURL = vi.fn(() => "blob:download-url");
    const revokeObjectURL = vi.fn();
    const blobCalls = [];

    class BlobMock {
      constructor(parts, options) {
        this.parts = parts;
        this.options = options;
        blobCalls.push({ parts, options });
      }
    }

    vi.stubGlobal("Blob", BlobMock);
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
    vi.stubGlobal("document", { createElement });

    downloadFile({
      content: "name,value\nCoffee,1",
      fileName: "coffee-blend-recipes.csv",
      mimeType: "text/csv",
    });

    expect(blobCalls).toEqual([{ parts: ["name,value\nCoffee,1"], options: { type: "text/csv" } }]);
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(BlobMock));
    expect(createElement).toHaveBeenCalledWith("a");
    expect(anchor.href).toBe("blob:download-url");
    expect(anchor.download).toBe("coffee-blend-recipes.csv");
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:download-url");
  });
});
