import { describe, expect, it } from "vitest";
import { compareText } from "./index.js";

describe("compareText", () => {
  it("passes identical text", () => {
    expect(compareText("בְּרֵאשִׁית", "בְּרֵאשִׁית")).toEqual({
      status: "passed",
    });
  });

  it("reports Unicode code points", () => {
    expect(compareText("א\u05C0", "א")).toEqual({
      status: "failed",
      differences: [
        {
          position: 1,
          expectedCodePoint: "U+05C0",
          actualCodePoint: "<end>",
        },
      ],
    });
  });
});
