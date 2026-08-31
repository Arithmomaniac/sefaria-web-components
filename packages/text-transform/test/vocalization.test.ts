import { describe, expect, it } from "vitest";

import { applyVocalization } from "../src/index.js";

describe("applyVocalization", () => {
  it("preserves all marks in taamim_and_nikkud mode", () => {
    const text = "בְּרֵאשִׁ֖ית ׀";

    expect(applyVocalization(text, "taamim_and_nikkud")).toBe(text);
  });

  it("removes cantillation while preserving vowel marks in nikkud mode", () => {
    expect(applyVocalization("בְּרֵאשִׁ֖ית", "nikkud")).toBe("בְּרֵאשִׁית");
  });

  it("removes cantillation and vowel marks in none mode", () => {
    expect(applyVocalization("בְּרֵאשִׁ֖ית׃", "none")).toBe("בראשית");
    expect(applyVocalization("בְּרֵאשִׁ֖ית׃", "nikkud")).toBe("בְּרֵאשִׁית׃");
  });

  it("distinguishes both PASEQ policies", () => {
    const text = "א ׀ ב׀ג";

    expect(applyVocalization(text, "nikkud", { paseq: "always" })).toBe(
      "א  בג",
    );
    expect(applyVocalization(text, "nikkud", { paseq: "after-space" })).toBe(
      "א ב׀ג",
    );
  });

  it("defaults to the after-space PASEQ policy", () => {
    expect(applyVocalization("א ׀ ב׀ג", "none")).toBe("א ב׀ג");
  });

  it("uses original input adjacency for the after-space PASEQ policy", () => {
    expect(applyVocalization(`א \u0591\u05c0 ב`, "nikkud")).toBe(`א \u05c0 ב`);
    expect(applyVocalization(`א \u05b0\u05c0 ב`, "none")).toBe(`א \u05c0 ב`);
    expect(applyVocalization(`א \u200d\u05c0 ב`, "nikkud")).toBe(`א \u05c0 ב`);
  });

  it("handles reordered combining marks without normalizing the result", () => {
    expect(applyVocalization(`א\u05b0\u0591`, "nikkud")).toBe(`א\u05b0`);
    expect(applyVocalization(`א\u0591\u05b0`, "nikkud")).toBe(`א\u05b0`);
  });

  it("preserves already-unpointed and mixed-script text", () => {
    const text = "Genesis 1:1 — בראשית 123";

    expect(applyVocalization(text, "none")).toBe(text);
  });

  it("handles empty text", () => {
    expect(applyVocalization("", "none")).toBe("");
  });

  it("handles many after-space PASEQ removals without changing semantics", () => {
    const text = "א ׀".repeat(100_000);

    expect(applyVocalization(text, "nikkud")).toBe("א".repeat(100_000));
  });

  it("rejects unsupported runtime values", () => {
    expect(() => applyVocalization("text", "partial" as never)).toThrow(
      TypeError,
    );
    expect(() =>
      applyVocalization("text", "nikkud", { paseq: "sometimes" as never }),
    ).toThrow(TypeError);
  });
});
