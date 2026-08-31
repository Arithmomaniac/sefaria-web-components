import { describe, expect, it } from "vitest";

import { extractFootnotes, sanitize } from "../src/index.js";
import fixtureManifest from "./fixtures/manifest.json" with { type: "json" };

const footnoteFixture = fixtureManifest.fixtures.find(
  (candidate) => candidate.name === "genesis-footnote",
);

if (!footnoteFixture) {
  throw new Error("Missing genesis-footnote fixture");
}

describe("extractFootnotes", () => {
  it("extracts a source-backed marker/body pair into structured parts", () => {
    expect(extractFootnotes(sanitize(footnoteFixture.input))).toEqual({
      body: [
        { kind: "html", html: "When God began to create" },
        { kind: "footnote-marker", noteIndex: 0, markerText: "*" },
        { kind: "html", html: " heaven" },
      ],
      notes: [
        {
          index: 0,
          markerText: "*",
          content: "<b>When God began to create </b>Others.",
        },
      ],
    });
  });

  it("preserves nested ordinary italics in one note", () => {
    expect(
      extractFootnotes(
        'A<sup class="footnote-marker">a</sup><i class="footnote">outer <i>inner</i> end</i>Z',
      ),
    ).toEqual({
      body: [
        { kind: "html", html: "A" },
        { kind: "footnote-marker", noteIndex: 0, markerText: "a" },
        { kind: "html", html: "Z" },
      ],
      notes: [
        {
          index: 0,
          markerText: "a",
          content: "outer <i>inner</i> end",
        },
      ],
    });
  });

  it("keeps several notes and non-numeric markers in source order", () => {
    const result = extractFootnotes(
      'A<sup class="footnote-marker">א</sup><i class="footnote">one</i>B<sup class="footnote-marker">♦</sup><i class="footnote">two</i>C',
    );

    expect(result.notes).toEqual([
      { index: 0, markerText: "א", content: "one" },
      { index: 1, markerText: "♦", content: "two" },
    ]);
    expect(result.body).toEqual([
      { kind: "html", html: "A" },
      { kind: "footnote-marker", noteIndex: 0, markerText: "א" },
      { kind: "html", html: "B" },
      { kind: "footnote-marker", noteIndex: 1, markerText: "♦" },
      { kind: "html", html: "C" },
    ]);
  });

  it("distinguishes a present empty body from a missing body", () => {
    expect(
      extractFootnotes(
        '<sup class="footnote-marker">1</sup><i class="footnote"></i><sup class="footnote-marker">2</sup>',
      ).notes,
    ).toEqual([
      { index: 0, markerText: "1", content: "" },
      { index: 1, markerText: "2", content: null },
    ]);
  });

  it("preserves an orphan body as ordinary italic content", () => {
    expect(
      extractFootnotes('A<i class="footnote">orphan <b>body</b></i>Z'),
    ).toEqual({
      body: [{ kind: "html", html: "A<i>orphan <b>body</b></i>Z" }],
      notes: [],
    });
  });

  it("does not treat endFootnote or itag markers as note bodies", () => {
    expect(
      extractFootnotes(
        'A<sup class="endFootnote">*</sup><sup class="itag">3</sup>Z',
      ),
    ).toEqual({
      body: [
        {
          kind: "html",
          html: 'A<sup class="endFootnote">*</sup><sup class="itag">3</sup>Z',
        },
      ],
      notes: [],
    });
  });

  it("accepts extra source class tokens on recognized pairs", () => {
    expect(
      extractFootnotes(
        '<sup class="extra footnote-marker">x</sup> <i class="footnote other">note</i>',
      ).notes,
    ).toEqual([{ index: 0, markerText: "x", content: "note" }]);
  });

  it("allows duplicate markers while keeping logical indices unique", () => {
    const result = extractFootnotes(
      '<sup class="footnote-marker">*</sup><i class="footnote">one</i><sup class="footnote-marker">*</sup><i class="footnote">two</i>',
    );

    expect(result.notes).toEqual([
      { index: 0, markerText: "*", content: "one" },
      { index: 1, markerText: "*", content: "two" },
    ]);
    expect(result.notes[0]).not.toHaveProperty("id");
  });

  it("coalesces adjacent HTML into one body part", () => {
    expect(extractFootnotes("<b>A &amp; B</b><i>&lt;C&gt;</i>")).toEqual({
      body: [{ kind: "html", html: "<b>A &amp; B</b><i>&lt;C&gt;</i>" }],
      notes: [],
    });
  });

  it("returns marker text as plain text and keeps HTML escaped", () => {
    const result = extractFootnotes(
      '<sup class="footnote-marker">&lt;img src=x onerror=alert(1)&gt;</sup><i class="footnote">note</i>',
    );

    expect(result.notes[0]?.markerText).toBe("<img src=x onerror=alert(1)>");
    expect(result.body[0]).toEqual({
      kind: "footnote-marker",
      noteIndex: 0,
      markerText: "<img src=x onerror=alert(1)>",
    });
  });

  it("bounds ancestor reserialization around deeply nested markers", () => {
    const depth = 500;
    let input = "";
    for (let index = 0; index < depth; index += 1) {
      input += `<b>${index}<sup class="footnote-marker">*</sup><i class="footnote">note</i>`;
    }
    input += "text";
    input += "</b>".repeat(depth);

    expect(() => extractFootnotes(input)).toThrow(RangeError);
  });
});
