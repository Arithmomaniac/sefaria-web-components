import { describe, expect, it } from "vitest";
import {
  dafToInt,
  humanRef as formatHumanRef,
  makeRef,
  normRef,
  parseRef,
  refContains as containsParsed,
  sectionRef as deriveSectionRef,
  splitLocalRange,
  type BookIndex,
  type ParsedRef,
  type RefError,
} from "./index.js";

const index = {
  aliases: {
    Genesis: "genesis",
    Bereshit: "genesis",
    בראשית: "genesis",
    Shabbat: "shabbat",
    "Rashi on Genesis": "rashi-genesis",
    "Complex Work": "complex-root",
    "Complex Work, Part One": "complex-part-one",
    "Complex Work, Part Two": "complex-part-two",
    "Single Level": "single-level",
    "Known Without Metadata": "missing",
  },
  nodes: {
    genesis: {
      key: "genesis",
      title: "Genesis",
      indexTitle: "Genesis",
      nodePath: ["genesis"],
      addressTypes: ["integer", "integer"],
      sectionNames: ["Chapter", "Verse"],
    },
    shabbat: {
      key: "shabbat",
      title: "Shabbat",
      indexTitle: "Shabbat",
      nodePath: ["shabbat"],
      addressTypes: ["talmud", "integer"],
      sectionNames: ["Daf", "Line"],
    },
    "rashi-genesis": {
      key: "rashi-genesis",
      title: "Rashi on Genesis",
      indexTitle: "Rashi on Genesis",
      nodePath: ["rashi-genesis"],
      addressTypes: ["integer", "integer", "integer"],
      sectionNames: ["Chapter", "Verse", "Comment"],
    },
    "complex-root": {
      key: "complex-root",
      title: "Complex Work",
      indexTitle: "Complex Work",
      nodePath: ["complex-root"],
      addressTypes: [],
      sectionNames: [],
    },
    "complex-part-one": {
      key: "complex-part-one",
      title: "Complex Work, Part One",
      indexTitle: "Complex Work",
      nodePath: ["complex-root", "complex-part-one"],
      addressTypes: ["integer", "integer"],
      sectionNames: ["Chapter", "Paragraph"],
    },
    "complex-part-two": {
      key: "complex-part-two",
      title: "Complex Work, Part Two",
      indexTitle: "Complex Work",
      nodePath: ["complex-root", "complex-part-two"],
      addressTypes: ["integer"],
      sectionNames: ["Paragraph"],
    },
    "single-level": {
      key: "single-level",
      title: "Single Level",
      indexTitle: "Single Level",
      nodePath: ["single-level"],
      addressTypes: ["integer"],
      sectionNames: ["Paragraph"],
    },
  },
} as const satisfies BookIndex;

function parseFixture(
  ref: string,
  bookIndex: BookIndex = index,
): ParsedRef | RefError {
  return parseRef(ref, bookIndex);
}

function humanRef(
  ref: string,
  bookIndex: BookIndex = index,
): string | RefError {
  const parsed = parseFixture(ref, bookIndex);
  return "type" in parsed ? parsed : formatHumanRef(parsed);
}

function sectionRef(
  ref: string,
  bookIndex: BookIndex = index,
): string | RefError {
  const parsed = parseFixture(ref, bookIndex);
  return "type" in parsed ? parsed : formatHumanRef(deriveSectionRef(parsed));
}

function refContains(
  outer: string,
  inner: string,
  bookIndex: BookIndex = index,
): boolean | RefError {
  const outerRef = parseFixture(outer, bookIndex);
  if ("type" in outerRef) {
    return outerRef;
  }
  const innerRef = parseFixture(inner, bookIndex);
  return "type" in innerRef ? innerRef : containsParsed(outerRef, innerRef);
}

function splitRefLocally(
  ref: string,
  bookIndex: BookIndex = index,
): readonly string[] | RefError {
  const parsed = parseFixture(ref, bookIndex);
  if ("type" in parsed) {
    return parsed;
  }
  const split = splitLocalRange(parsed);
  return "type" in split ? split : split.map(formatHumanRef);
}

describe("parseRef", () => {
  it("parses a canonical integer-addressed ref", () => {
    expect(parseRef("Genesis 1:1", index)).toEqual({
      book: "Genesis",
      index: "Genesis",
      nodeKey: "genesis",
      nodePath: ["genesis"],
      addressTypes: ["integer", "integer"],
      sections: ["1", "1"],
      toSections: ["1", "1"],
      sectionPositions: [1, 1],
      toSectionPositions: [1, 1],
    });
  });

  it("resolves a supplied alias to its canonical node", () => {
    expect(parseRef("Bereshit 1:1", index)).toMatchObject({
      book: "Genesis",
      index: "Genesis",
      nodeKey: "genesis",
      sections: ["1", "1"],
    });
  });

  it("matches the web parser's first-letter normalization", () => {
    expect(parseRef("genesis 1:1", index)).toMatchObject({
      book: "Genesis",
      sections: ["1", "1"],
    });
  });

  it("accepts a supplied Unicode title alias", () => {
    expect(parseRef("בראשית 1:1", index)).toMatchObject({
      book: "Genesis",
      sections: ["1", "1"],
    });
  });

  it("parses canonical URL separators", () => {
    expect(parseRef("Genesis.1.31-2.3", index)).toMatchObject({
      sections: ["1", "31"],
      toSections: ["2", "3"],
    });
  });

  it("parses an abbreviated range end", () => {
    expect(parseRef("Genesis 1:1-3", index)).toMatchObject({
      sections: ["1", "1"],
      toSections: ["1", "3"],
    });
  });

  it("uses the terminal address type for an abbreviated range end", () => {
    expect(parseRef("Shabbat 2a:1-3", index)).toMatchObject({
      sections: ["2a", "1"],
      toSections: ["2a", "3"],
      sectionPositions: [3, 1],
      toSectionPositions: [3, 3],
    });
  });

  it("keeps daf labels and one-based comparison positions separate", () => {
    expect(parseRef("Shabbat 2a:1-2b:2", index)).toMatchObject({
      sections: ["2a", "1"],
      toSections: ["2b", "2"],
      sectionPositions: [3, 1],
      toSectionPositions: [4, 2],
    });
  });

  it("supports Talmud-addressed works that begin on daf 1", () => {
    expect(parseRef("Shabbat 1a:1-1b:2", index)).toMatchObject({
      sections: ["1a", "1"],
      toSections: ["1b", "2"],
      sectionPositions: [1, 1],
      toSectionPositions: [2, 2],
    });
  });

  it("supports commentary at the configured depth", () => {
    expect(parseRef("Rashi on Genesis 1:1:1", index)).toMatchObject({
      book: "Rashi on Genesis",
      sections: ["1", "1", "1"],
      sectionPositions: [1, 1, 1],
    });
  });

  it("keeps complex leaf and root identities separate", () => {
    expect(parseRef("Complex Work, Part One 1:2", index)).toMatchObject({
      book: "Complex Work, Part One",
      index: "Complex Work",
      nodeKey: "complex-part-one",
      nodePath: ["complex-root", "complex-part-one"],
    });
  });

  it("supports the Sheet pseudo-reference grammar", () => {
    expect(parseRef("Sheet 123", index)).toMatchObject({
      book: "Sheet",
      index: "Sheet",
      sections: ["123"],
      sectionPositions: [123],
    });
  });

  it("does not accept a known title as a prefix of another word", () => {
    expect(parseRef("Genesiss 1:1", index)).toEqual({
      type: "ref-error",
      kind: "local-data",
      code: "title-not-loaded",
      input: "Genesiss 1:1",
    });
  });

  it("distinguishes unknown titles from unloaded metadata", () => {
    expect(parseRef("Unknown 1:1", index)).toEqual({
      type: "ref-error",
      kind: "local-data",
      code: "title-not-loaded",
      input: "Unknown 1:1",
    });
    expect(parseRef("Known Without Metadata 1", index)).toEqual({
      type: "ref-error",
      kind: "local-data",
      code: "missing-book-metadata",
      input: "Known Without Metadata 1",
    });
  });

  it("does not treat a word that starts with Sheet as a sheet ref", () => {
    expect(parseRef("Sheeted 1", index)).toEqual({
      type: "ref-error",
      kind: "local-data",
      code: "title-not-loaded",
      input: "Sheeted 1",
    });
  });

  it("distinguishes missing hierarchy from inconsistent node data", () => {
    expect(
      parseRef("Broken 1", {
        aliases: { Broken: "broken" },
        nodes: {
          broken: {
            key: "broken",
            title: "Broken",
            indexTitle: "Broken",
            nodePath: ["missing-parent", "broken"],
            addressTypes: ["integer"],
            sectionNames: ["Section"],
          },
        },
      }),
    ).toEqual({
      type: "ref-error",
      kind: "local-data",
      code: "missing-hierarchy",
      input: "Broken 1",
    });

    expect(
      parseRef("Broken 1", {
        aliases: { Broken: "broken" },
        nodes: {
          broken: {
            key: "broken",
            title: "Broken",
            indexTitle: "Broken",
            nodePath: ["broken"],
            addressTypes: ["integer"],
            sectionNames: [],
          },
        },
      }),
    ).toEqual({
      type: "ref-error",
      kind: "local-data",
      code: "inconsistent-data",
      input: "Broken 1",
    });
  });

  it("rejects unsupported runtime address metadata", () => {
    const unsupported = {
      aliases: { Yearbook: "yearbook" },
      nodes: {
        yearbook: {
          key: "yearbook",
          title: "Yearbook",
          indexTitle: "Yearbook",
          nodePath: ["yearbook"],
          addressTypes: ["year"],
          sectionNames: ["Year"],
        },
      },
    } as unknown as BookIndex;

    expect(parseRef("Yearbook 2026", unsupported)).toEqual({
      type: "ref-error",
      kind: "local-data",
      code: "inconsistent-data",
      input: "Yearbook 2026",
    });
  });

  it("returns inconsistent-data for malformed runtime index objects", () => {
    expect(
      parseRef("Genesis 1", {
        aliases: null,
        nodes: {},
      } as unknown as BookIndex),
    ).toEqual({
      type: "ref-error",
      kind: "local-data",
      code: "inconsistent-data",
      input: "Genesis 1",
    });

    expect(
      parseRef("Broken 1", {
        aliases: { Broken: "broken" },
        nodes: { broken: null },
      } as unknown as BookIndex),
    ).toEqual({
      type: "ref-error",
      kind: "local-data",
      code: "inconsistent-data",
      input: "Broken 1",
    });

    expect(
      parseRef("Broken 1", {
        aliases: { Broken: "broken" },
        nodes: {
          broken: {
            key: "broken",
            title: 42,
            indexTitle: 42,
            nodePath: ["broken"],
            addressTypes: ["integer"],
            sectionNames: ["Section"],
          },
        },
      } as unknown as BookIndex),
    ).toEqual({
      type: "ref-error",
      kind: "local-data",
      code: "inconsistent-data",
      input: "Broken 1",
    });
  });

  it.each(["__proto__", "constructor", "toString"])(
    "does not read inherited node key %s",
    (nodeKey) => {
      expect(
        parseRef("Known 1", {
          aliases: { Known: nodeKey },
          nodes: {},
        }),
      ).toEqual({
        type: "ref-error",
        kind: "local-data",
        code: "missing-book-metadata",
        input: "Known 1",
      });
    },
  );

  it("requires every canonical title to resolve through the alias map", () => {
    expect(
      parseRef("Bereshit 1", {
        aliases: { Bereshit: "genesis" },
        nodes: { genesis: index.nodes.genesis },
      }),
    ).toEqual({
      type: "ref-error",
      kind: "local-data",
      code: "inconsistent-data",
      input: "Bereshit 1",
    });
  });

  it("rejects a canonical title that maps to another loaded node", () => {
    expect(
      parseRef("Alpha 1", {
        aliases: { Alpha: "beta", Beta: "beta" },
        nodes: {
          alpha: {
            key: "alpha",
            title: "Alpha",
            indexTitle: "Alpha",
            nodePath: ["alpha"],
            addressTypes: ["integer"],
            sectionNames: ["Section"],
          },
          beta: {
            key: "beta",
            title: "Beta",
            indexTitle: "Beta",
            nodePath: ["beta"],
            addressTypes: ["integer"],
            sectionNames: ["Section"],
          },
        },
      }),
    ).toEqual({
      type: "ref-error",
      kind: "local-data",
      code: "inconsistent-data",
      input: "Alpha 1",
    });
  });

  it("does not mutate the supplied index", () => {
    const before = JSON.stringify(index);

    parseRef("Bereshit 1:1", index);

    expect(JSON.stringify(index)).toBe(before);
  });

  it.each([
    ["", "malformed-reference"],
    ["Genesis 1:x", "malformed-sections"],
    ["Genesis 1::2", "malformed-sections"],
    ["Genesis.1.", "malformed-sections"],
    ["Genesis.", "malformed-sections"],
    ["Genesis..1", "malformed-sections"],
    ["Genesis...1:2", "malformed-sections"],
    ["Genesis . . 1:2", "malformed-sections"],
    ["Genesis 1:1-2:3-4", "invalid-range"],
    ["Genesis 2:1-1:1", "invalid-range"],
    ["Shabbat 2c:1", "invalid-daf"],
    ["Sheet 0", "malformed-sections"],
  ])("returns %s as %s", (ref, code) => {
    expect(parseRef(ref, index)).toMatchObject({
      type: "ref-error",
      kind: "invalid-input",
      code,
    });
  });

  it("routes unsupported local grammar to the remote client", () => {
    expect(parseRef("Genesis 1:1:1", index)).toEqual({
      type: "ref-error",
      kind: "remote-required",
      code: "unsupported-local-grammar",
      input: "Genesis 1:1:1",
    });
  });

  it("returns a typed error for malformed URI encoding", () => {
    expect(parseRef("Genesis%E0%A4%A 1:1", index)).toEqual({
      type: "ref-error",
      kind: "invalid-input",
      code: "malformed-reference",
      input: "Genesis%E0%A4%A 1:1",
    });
  });
});

describe("formatting", () => {
  it("builds canonical web and server URL refs", () => {
    const parsed = parseRef("Genesis 1:31-2:3", index);
    if ("type" in parsed) {
      throw new Error("Fixture ref did not parse");
    }

    expect(makeRef(parsed)).toBe("Genesis.1.31-2.3");
  });

  it("encodes a complex title", () => {
    expect(normRef("Complex Work, Part One 1:2", index)).toBe(
      "Complex_Work%2C_Part_One.1.2",
    );
    expect(humanRef("Complex_Work%2C_Part_One.1.2", index)).toBe(
      "Complex Work, Part One 1:2",
    );
  });

  it("normalizes aliases with index metadata", () => {
    expect(normRef("Bereshit 1:1", index)).toBe("Genesis.1.1");
  });

  it("does not synthesize a fallback URL for invalid input", () => {
    expect(normRef("Unknown Work 1:1", index)).toEqual({
      type: "ref-error",
      kind: "local-data",
      code: "title-not-loaded",
      input: "Unknown Work 1:1",
    });
  });

  it("converts URL refs to canonical human refs", () => {
    expect(humanRef("Genesis.1.31-2.3", index)).toBe("Genesis 1:31-2:3");
  });

  it.each([
    "Genesis",
    "Genesis 1",
    "Genesis 1:1",
    "Genesis 1:31-2:3",
    "Shabbat 2a:1-2b:2",
    "Rashi on Genesis 1:1:1",
    "Sheet 123",
  ])("round trips %s", (ref) => {
    const normalized = normRef(ref, index);
    expect(typeof normalized).toBe("string");
    if (typeof normalized !== "string") {
      throw new Error("Fixture ref did not normalize");
    }

    expect(humanRef(normalized, index)).toBe(ref);
  });
});

describe("dafToInt", () => {
  it.each([
    ["1a", 0],
    ["1b", 1],
    ["2a", 2],
    ["2b", 3],
    ["15a", 28],
    ["15b", 29],
  ])("converts %s to zero-based position %i", (daf, expected) => {
    expect(dafToInt(daf)).toBe(expected);
  });

  it.each(["2c", "2A", "0b", "-2a", "a"])("rejects invalid daf %s", (daf) => {
    expect(dafToInt(daf)).toEqual({
      type: "ref-error",
      kind: "invalid-input",
      code: "invalid-daf",
      input: daf,
    });
  });

  it("rejects daf values that produce unsafe coordinates", () => {
    expect(dafToInt("9007199254740991a")).toEqual({
      type: "ref-error",
      kind: "invalid-input",
      code: "invalid-daf",
      input: "9007199254740991a",
    });
  });
});

describe("sectionRef", () => {
  it("removes one address level", () => {
    expect(sectionRef("Genesis 1:2", index)).toBe("Genesis 1");
    expect(sectionRef("Rashi on Genesis 1:1:1", index)).toBe(
      "Rashi on Genesis 1:1",
    );
  });

  it("preserves a spanning section range", () => {
    expect(sectionRef("Genesis 1:31-2:3", index)).toBe("Genesis 1-2");
  });

  it("keeps section-level input unchanged", () => {
    expect(sectionRef("Genesis 1", index)).toBe("Genesis 1");
    expect(sectionRef("Rashi on Genesis 1:1", index)).toBe(
      "Rashi on Genesis 1:1",
    );
  });

  it("uses the book as the section ref for a depth-one text", () => {
    expect(sectionRef("Single Level 3", index)).toBe("Single Level");
  });
});

describe("refContains", () => {
  it("uses structural coordinate containment", () => {
    expect(refContains("Genesis 1", "Genesis 1:3", index)).toBe(true);
    expect(refContains("Genesis 1:1-3", "Genesis 1:2", index)).toBe(true);
    expect(refContains("Genesis 1:1-3", "Genesis 1:4", index)).toBe(false);
  });

  it("resolves aliases before comparison", () => {
    expect(refContains("Genesis 1", "Bereshit 1:3", index)).toBe(true);
  });

  it("uses complex node ancestry", () => {
    expect(
      refContains("Complex Work", "Complex Work, Part One 1:2", index),
    ).toBe(true);
    expect(
      refContains("Complex Work, Part One", "Complex Work, Part Two 1", index),
    ).toBe(false);
  });

  it("does not claim topology-backed extensional equivalence", () => {
    expect(refContains("Genesis 1:1-31", "Genesis 1", index)).toBe(false);
  });
});

describe("splitLocalRange", () => {
  it("returns one canonical human ref for a non-range", () => {
    expect(splitRefLocally("Bereshit 1:1", index)).toEqual(["Genesis 1:1"]);
  });

  it("expands a same-parent terminal range", () => {
    expect(splitRefLocally("Genesis 1:1-3", index)).toEqual([
      "Genesis 1:1",
      "Genesis 1:2",
      "Genesis 1:3",
    ]);
  });

  it("preserves depth for a section range", () => {
    expect(splitRefLocally("Genesis 1-2", index)).toEqual([
      "Genesis 1",
      "Genesis 2",
    ]);
  });

  it("expands a same-depth daf range", () => {
    expect(splitRefLocally("Shabbat 15a-16b", index)).toEqual([
      "Shabbat 15a",
      "Shabbat 15b",
      "Shabbat 16a",
      "Shabbat 16b",
    ]);
  });

  it("rejects an arithmetic range that is too large", () => {
    expect(splitRefLocally("Genesis 1-10001", index)).toEqual({
      type: "ref-error",
      kind: "invalid-input",
      code: "range-too-large",
      input: "Genesis 1-10001",
    });
  });

  it("requires remote shape for a cross-parent terminal range", () => {
    expect(splitRefLocally("Genesis 1:31-2:3", index)).toEqual({
      type: "ref-error",
      kind: "remote-required",
      code: "remote-shape-required",
      input: "Genesis 1:31-2:3",
    });
  });
});
