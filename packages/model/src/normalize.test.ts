import { describe, expect, it } from "vitest";
import {
  isModelError,
  normalizeLinkRef,
  normalizeSourceCardData,
  normalizeTextResponse,
  normalizeVersion,
  type TextResponse,
} from "./index.js";

function textCandidate(): Record<string, unknown> {
  return {
    ref: "Genesis 1:1",
    heRef: "בראשית א׳:א׳",
    sections: ["1", "1"],
    toSections: ["1", "1"],
    isSpanning: false,
    versions: [
      {
        versionTitle: "Miqra according to the Masorah",
        language: "he",
        direction: "rtl",
        isSource: true,
        license: "CC-BY-SA",
      },
      {
        versionTitle: "The Contemporary Torah",
        language: "en",
        direction: "ltr",
        shortVersionTitle: "Contemporary Torah",
      },
    ],
    segments: [
      {
        ref: "Genesis 1:1",
        text: "בראשית",
        lang: "he",
        direction: "rtl",
        versionTitle: "Miqra according to the Masorah",
      },
      {
        ref: "Genesis 1:1",
        text: "When God began to create",
        lang: "en",
        direction: "ltr",
        versionTitle: "The Contemporary Torah",
      },
    ],
  };
}

describe("normalizeTextResponse", () => {
  it("preserves concrete text for multiple versions", () => {
    const result = normalizeTextResponse(textCandidate());

    expect(isModelError(result)).toBe(false);
    expect((result as TextResponse).segments).toEqual([
      {
        ref: "Genesis 1:1",
        text: "בראשית",
        lang: "he",
        direction: "rtl",
        versionTitle: "Miqra according to the Masorah",
      },
      {
        ref: "Genesis 1:1",
        text: "When God began to create",
        lang: "en",
        direction: "ltr",
        versionTitle: "The Contemporary Torah",
      },
    ]);
  });

  it("preserves explicit direction instead of inferring from language", () => {
    const candidate = textCandidate();
    const versions = candidate.versions as Record<string, unknown>[];
    versions[0]!.direction = "ltr";
    const segments = candidate.segments as Record<string, unknown>[];
    segments[0]!.direction = "ltr";

    const result = normalizeTextResponse(candidate);

    expect(isModelError(result)).toBe(false);
    expect((result as TextResponse).versions[0]?.direction).toBe("ltr");
  });

  it("preserves spanning and complex refs in candidate order", () => {
    const candidate = textCandidate();
    candidate.ref = "Genesis 1:31-2:2";
    candidate.isSpanning = true;
    candidate.versions = [
      {
        versionTitle: "Test",
        language: "en",
        direction: "ltr",
      },
    ];
    candidate.segments = [
      {
        ref: "Genesis 1:31",
        text: "first",
        lang: "en",
        direction: "ltr",
        versionTitle: "Test",
      },
      {
        ref: "Genesis 2:1",
        text: "second",
        lang: "en",
        direction: "ltr",
        versionTitle: "Test",
      },
      {
        ref: "Pesach Haggadah, Magid, The Four Sons 1",
        text: "complex",
        lang: "en",
        direction: "ltr",
        versionTitle: "Test",
      },
    ];

    const result = normalizeTextResponse(candidate);

    expect(isModelError(result)).toBe(false);
    expect((result as TextResponse).segments.map(({ ref }) => ref)).toEqual([
      "Genesis 1:31",
      "Genesis 2:1",
      "Pesach Haggadah, Magid, The Four Sons 1",
    ]);
  });

  it("accepts one language, empty segments, and partial metadata", () => {
    const candidate = textCandidate();
    candidate.versions = [
      {
        versionTitle: "Miqra according to the Masorah",
        language: "he",
        direction: "rtl",
      },
    ];
    candidate.segments = [];

    const result = normalizeTextResponse(candidate);

    expect(result).toMatchObject({
      versions: [{ language: "he" }],
      segments: [],
    });
  });

  it("prunes unknown raw fields without corrupting known fields", () => {
    const candidate = textCandidate();
    candidate.available_versions = [{ unstable: true }];
    (candidate.versions as Record<string, unknown>[])[0]!.priority = 2;

    const result = normalizeTextResponse(candidate);

    expect(result).not.toHaveProperty("available_versions");
    expect(result).not.toHaveProperty("versions.0.priority");
    expect(result).toHaveProperty(
      "versions.0.versionTitle",
      "Miqra according to the Masorah",
    );
  });

  it("returns a path-aware error for a missing required field", () => {
    const candidate = textCandidate();
    delete (candidate.versions as Record<string, unknown>[])[0]!.versionTitle;

    expect(normalizeTextResponse(candidate)).toEqual({
      type: "model-error",
      code: "missing-required-field",
      path: ["versions", 0, "versionTitle"],
    });
  });

  it("rejects an unexpected direction", () => {
    const candidate = textCandidate();
    (candidate.versions as Record<string, unknown>[])[0]!.direction = "auto";

    expect(normalizeTextResponse(candidate)).toEqual({
      type: "model-error",
      code: "invalid-field",
      path: ["versions", 0, "direction"],
    });
  });

  it("rejects segment metadata that disagrees with its version", () => {
    const candidate = textCandidate();
    (candidate.segments as Record<string, unknown>[])[0]!.direction = "ltr";

    expect(normalizeTextResponse(candidate)).toEqual({
      type: "model-error",
      code: "invalid-field",
      path: ["segments", 0, "direction"],
    });
  });

  it("rejects duplicate version identities instead of matching by order", () => {
    const candidate = textCandidate();
    const versions = candidate.versions as Record<string, unknown>[];
    versions.push({
      ...versions[0],
      direction: "ltr",
    });

    expect(normalizeTextResponse(candidate)).toEqual({
      type: "model-error",
      code: "invalid-field",
      path: ["versions", 2, "versionTitle"],
    });
  });
});

describe("other public normalizers", () => {
  it("normalizes link metadata and prunes unknown fields", () => {
    expect(
      normalizeLinkRef({
        ref: "Rashi on Genesis 1:1:1",
        commentator: "Rashi",
        order: 1,
        sourceHasEn: true,
        anchorRef: "Genesis 1:1",
      }),
    ).toEqual({
      ref: "Rashi on Genesis 1:1:1",
      commentator: "Rashi",
      order: 1,
      sourceHasEn: true,
    });
  });

  it("accepts missing optional version attribution", () => {
    expect(
      normalizeVersion({
        versionTitle: "Test",
        language: "en",
        direction: "ltr",
      }),
    ).toEqual({
      versionTitle: "Test",
      language: "en",
      direction: "ltr",
    });
  });

  it("normalizes a source card while its public guard remains strict", () => {
    expect(
      normalizeSourceCardData({
        ref: "Genesis 1:1",
        raw: "ignored",
        segments: [
          {
            ref: "Genesis 1:1",
            translations: [],
            raw: "ignored",
          },
        ],
      }),
    ).toEqual({
      ref: "Genesis 1:1",
      segments: [{ ref: "Genesis 1:1", translations: [] }],
    });
  });

  it("does not let input records impersonate model errors", () => {
    expect(
      normalizeVersion({
        type: "model-error",
        code: "invalid-field",
        path: [],
        versionTitle: "Test",
        language: "en",
        direction: "ltr",
      }),
    ).toEqual({
      versionTitle: "Test",
      language: "en",
      direction: "ltr",
    });
  });
});
