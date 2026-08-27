import Ajv2020 from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";
import sourceCardSchema from "../contracts/source-card.schema.json";
import { isModelError, isSourceCardData, isTextDirection } from "./index.js";

const validateSourceCardSchema = new Ajv2020().compile(sourceCardSchema);

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

describe("isTextDirection", () => {
  it.each(["ltr", "rtl"])("accepts %s", (direction) => {
    expect(isTextDirection(direction)).toBe(true);
  });

  it.each(["auto", "", undefined])("rejects %s", (direction) => {
    expect(isTextDirection(direction)).toBe(false);
  });
});

describe("source-card contract parity", () => {
  const invalidMutations: readonly [
    string,
    (payload: Record<string, unknown>) => void,
  ][] = [
    ["an empty reference", (payload) => void (payload.ref = "")],
    ["an empty segment list", (payload) => void (payload.segments = [])],
    ["an invalid Hebrew reference", (payload) => void (payload.heRef = 42)],
    ["an extra top-level property", (payload) => void (payload.extra = true)],
    [
      "an extra segment property",
      (payload) => void (firstSegment(payload).extra = true),
    ],
    [
      "an invalid optional field",
      (payload) => void (sourceBlock(payload).license = false),
    ],
    [
      "an invalid direction",
      (payload) => void (sourceBlock(payload).direction = "auto"),
    ],
    [
      "a model-only text field",
      (payload) => void (sourceBlock(payload).actualLanguage = "he"),
    ],
    [
      "a sparse segment list",
      (payload) => {
        const segments = payload.segments;
        if (Array.isArray(segments)) {
          delete segments[0];
        }
      },
    ],
  ];

  it("accepts a valid payload in both validators", () => {
    const payload = validPayload();

    expect(isSourceCardData(payload)).toBe(true);
    expect(validateSourceCardSchema(payload)).toBe(true);
  });

  it.each(invalidMutations)(
    "rejects %s in both validators",
    (_name, mutate) => {
      const payload = validPayload();
      mutate(payload);

      expect(isSourceCardData(payload)).toBe(false);
      expect(validateSourceCardSchema(payload)).toBe(false);
    },
  );
});

describe("isModelError", () => {
  it("rejects incomplete and malformed error-like values", () => {
    expect(isModelError({ type: "model-error" })).toBe(false);
    expect(
      isModelError({
        type: "model-error",
        code: "invalid-field",
        path: "direction",
      }),
    ).toBe(false);
  });
});
