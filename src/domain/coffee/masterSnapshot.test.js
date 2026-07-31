import { describe, expect, test } from "vitest";
import { parseSnapshot, serializeMaster } from "./masterSnapshot.js";

describe("master snapshot helpers", () => {
  test("serializes master data with the existing JSON format", () => {
    expect(serializeMaster([{ id: "standard-4-pour" }])).toBe('[{"id":"standard-4-pour"}]');
  });

  test("parses valid snapshots", () => {
    expect(parseSnapshot('[{"id":"ethiopia"}]', [])).toEqual([{ id: "ethiopia" }]);
  });

  test("returns fallback for invalid snapshots", () => {
    const fallback = [{ id: "fallback" }];

    expect(parseSnapshot("{", fallback)).toBe(fallback);
  });
});
