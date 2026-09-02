import { describe, expect, it } from "vitest";

import "./no-network.js";
import { compareText, summarizeCompatibility } from "./index.js";

describe("compareText", () => {
  it("passes identical text", () => {
    expect(compareText("בְּרֵאשִׁית", "בְּרֵאשִׁית")).toEqual({
      status: "passed",
      normalization: "none",
      indexing: "code-point",
    });
  });

  it("does not normalize canonically equivalent text", () => {
    expect(compareText("\u00E9", "e\u0301")).toEqual({
      status: "failed",
      normalization: "none",
      indexing: "code-point",
      differenceCount: 2,
      truncated: false,
      firstDifference: {
        position: 0,
        expectedCodePoint: "U+00E9",
        actualCodePoint: "U+0065",
        context: {
          startPosition: 0,
          expectedCodePoints: ["U+00E9", "<end>"],
          actualCodePoints: ["U+0065", "U+0301"],
        },
      },
      differences: [
        {
          position: 0,
          expectedCodePoint: "U+00E9",
          actualCodePoint: "U+0065",
          context: {
            startPosition: 0,
            expectedCodePoints: ["U+00E9", "<end>"],
            actualCodePoints: ["U+0065", "U+0301"],
          },
        },
        {
          position: 1,
          expectedCodePoint: "<end>",
          actualCodePoint: "U+0301",
          context: {
            startPosition: 0,
            expectedCodePoints: ["U+00E9", "<end>"],
            actualCodePoints: ["U+0065", "U+0301"],
          },
        },
      ],
    });
  });

  it("uses code-point positions and includes surrounding context", () => {
    expect(compareText("😀א\u05C0ב", "😀אגב", { contextRadius: 1 })).toEqual({
      status: "failed",
      normalization: "none",
      indexing: "code-point",
      differenceCount: 1,
      truncated: false,
      firstDifference: {
        position: 2,
        expectedCodePoint: "U+05C0",
        actualCodePoint: "U+05D2",
        context: {
          startPosition: 1,
          expectedCodePoints: ["U+05D0", "U+05C0", "U+05D1"],
          actualCodePoints: ["U+05D0", "U+05D2", "U+05D1"],
        },
      },
      differences: [
        {
          position: 2,
          expectedCodePoint: "U+05C0",
          actualCodePoint: "U+05D2",
          context: {
            startPosition: 1,
            expectedCodePoints: ["U+05D0", "U+05C0", "U+05D1"],
            actualCodePoints: ["U+05D0", "U+05D2", "U+05D1"],
          },
        },
      ],
    });
  });

  it("caps reported differences while retaining the total", () => {
    const result = compareText("abcd", "WXYZ", {
      maxDifferences: 2,
      contextRadius: 0,
    });

    expect(result).toMatchObject({
      status: "failed",
      normalization: "none",
      indexing: "code-point",
      differenceCount: 4,
      truncated: true,
      firstDifference: {
        position: 0,
        expectedCodePoint: "U+0061",
        actualCodePoint: "U+0057",
      },
    });
    expect(result.status === "failed" ? result.differences : []).toEqual([
      {
        position: 0,
        expectedCodePoint: "U+0061",
        actualCodePoint: "U+0057",
        context: {
          startPosition: 0,
          expectedCodePoints: ["U+0061"],
          actualCodePoints: ["U+0057"],
        },
      },
      {
        position: 1,
        expectedCodePoint: "U+0062",
        actualCodePoint: "U+0058",
        context: {
          startPosition: 1,
          expectedCodePoints: ["U+0062"],
          actualCodePoints: ["U+0058"],
        },
      },
    ]);
  });

  it("reports an ended side without losing nearby code points", () => {
    expect(compareText("א\u05C0", "א", { contextRadius: 1 })).toMatchObject({
      status: "failed",
      firstDifference: {
        position: 1,
        expectedCodePoint: "U+05C0",
        actualCodePoint: "<end>",
        context: {
          startPosition: 0,
          expectedCodePoints: ["U+05D0", "U+05C0"],
          actualCodePoints: ["U+05D0", "<end>"],
        },
      },
    });
  });

  describe("summarizeCompatibility", () => {
    it("groups counts and emits one detail line per non-passing case", () => {
      const summary = summarizeCompatibility([
        { id: "ordinary-pass", category: "text", status: "passed" },
        {
          id: "unexpected",
          category: "text",
          status: "failed",
          message: "expected א but received ב",
        },
        {
          id: "offline",
          category: "source",
          status: "unavailable",
          message: "pinned fixture was not present",
        },
        {
          id: "web-default",
          category: "vocalization",
          status: "intentional-difference",
          message: 'project="א ב׀ג" reference="א  בג"',
        },
      ]);

      expect(summary).toEqual({
        exitCode: 1,
        counts: {
          passed: 1,
          failed: 1,
          unavailable: 1,
          intentionalDifference: 1,
        },
        lines: [
          "passed=1 failed=1 unavailable=1 intentional-difference=1",
          "[failed] text/unexpected: expected א but received ב",
          "[unavailable] source/offline: pinned fixture was not present",
          '[intentional-difference] vocalization/web-default: project="א ב׀ג" reference="א  בג"',
        ],
      });
      expect(summary.lines.some((line) => line.includes("ordinary-pass"))).toBe(
        false,
      );
    });

    it("uses a nonzero exit only for unexpected failures", () => {
      expect(
        summarizeCompatibility([
          {
            id: "known",
            category: "vocalization",
            status: "intentional-difference",
            message: "documented policy difference",
          },
          {
            id: "missing",
            category: "source",
            status: "unavailable",
            message: "source unavailable",
          },
        ]).exitCode,
      ).toBe(0);
    });
  });

  it("rejects invalid bounds", () => {
    expect(() => compareText("a", "b", { maxDifferences: 0 })).toThrow(
      RangeError,
    );
    expect(() => compareText("a", "b", { contextRadius: -1 })).toThrow(
      RangeError,
    );
    expect(() =>
      compareText("a", "b", { maxDifferences: Number.POSITIVE_INFINITY }),
    ).toThrow(RangeError);
  });
});
