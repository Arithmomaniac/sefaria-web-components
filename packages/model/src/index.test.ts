import { describe, expect, it } from "vitest";
import { isSourceCardData, isTextDirection } from "./index.js";

describe("isTextDirection", () => {
  it.each(["ltr", "rtl"])("accepts %s", (direction) => {
    expect(isTextDirection(direction)).toBe(true);
  });

  it.each(["auto", "", undefined])("rejects %s", (direction) => {
    expect(isTextDirection(direction)).toBe(false);
  });
});

describe("isSourceCardData", () => {
  function validPayload(): Record<string, unknown> {
    return {
      ref: "Genesis 1:1",
      segments: [
        {
          ref: "Genesis 1:1",
          source: {
            content: "בראשית",
            language: "he",
            direction: "rtl",
            versionTitle: "Masoretic Text",
          },
          translations: [],
        },
      ],
    };
  }

  function firstSegment(
    payload: Record<string, unknown>,
  ): Record<string, unknown> {
    const segments = payload.segments;
    if (!Array.isArray(segments) || !segments[0]) {
      throw new Error("Test payload has no first segment");
    }

    return segments[0] as Record<string, unknown>;
  }

  function sourceBlock(
    payload: Record<string, unknown>,
  ): Record<string, unknown> {
    const source = firstSegment(payload).source;
    if (typeof source !== "object" || source === null) {
      throw new Error("Test payload has no source block");
    }

    return source as Record<string, unknown>;
  }

  it("accepts a source card payload", () => {
    expect(isSourceCardData(validPayload())).toBe(true);
  });

  it("rejects a payload with an invalid direction", () => {
    const payload = validPayload();
    sourceBlock(payload).direction = "auto";

    expect(isSourceCardData(payload)).toBe(false);
  });

  it.each([
    [
      "an empty reference",
      (payload: Record<string, unknown>) => {
        payload.ref = "";
      },
    ],
    [
      "an empty segment list",
      (payload: Record<string, unknown>) => {
        payload.segments = [];
      },
    ],
    [
      "an invalid Hebrew reference",
      (payload: Record<string, unknown>) => {
        payload.heRef = 42;
      },
    ],
    [
      "an extra top-level property",
      (payload: Record<string, unknown>) => {
        payload.extra = true;
      },
    ],
    [
      "an extra segment property",
      (payload: Record<string, unknown>) => {
        firstSegment(payload).extra = true;
      },
    ],
    [
      "an invalid optional field",
      (payload: Record<string, unknown>) => {
        sourceBlock(payload).license = false;
      },
    ],
    [
      "a model-only text field",
      (payload: Record<string, unknown>) => {
        sourceBlock(payload).actualLanguage = "he";
      },
    ],
  ])("rejects %s", (_name, mutate) => {
    const payload = validPayload();
    mutate(payload);

    expect(isSourceCardData(payload)).toBe(false);
  });
});
