import { describe, expect, it } from "vitest";
import {
  humanRef,
  makeRef,
  parseRef,
  refContains,
  sectionRef,
  splitLocalRange,
  type BookIndex,
} from "./index.js";

const index = {
  aliases: {
    Genesis: "genesis",
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
  },
} as const satisfies BookIndex;

function parsed(ref: string) {
  const result = parseRef(ref, index);
  if ("type" in result) {
    throw new Error(`Fixture did not parse: ${result.code}`);
  }
  return result;
}

describe("parsed-first operations", () => {
  it("formats one parsed value without an index", () => {
    const ref = parsed("Genesis 1:2");

    expect(makeRef(ref)).toBe("Genesis.1.2");
    expect(humanRef(ref)).toBe("Genesis 1:2");
  });

  it("derives and compares structured refs", () => {
    const section = parsed("Genesis 1");
    const segment = parsed("Genesis 1:2");

    expect(sectionRef(segment)).toEqual(section);
    expect(refContains(section, segment)).toBe(true);
  });

  it("does not confuse local node keys from unrelated snapshots", () => {
    const first = parsed("Genesis 1:2");
    const second = {
      ...first,
      book: "Other Work",
      index: "Other Work",
    };

    expect(refContains(first, second)).toBe(false);
  });

  it("splits only locally decidable ranges", () => {
    const split = splitLocalRange(parsed("Genesis 1:1-3"));
    if ("type" in split) {
      throw new Error(`Fixture did not split: ${split.code}`);
    }

    expect(split.map(humanRef)).toEqual([
      "Genesis 1:1",
      "Genesis 1:2",
      "Genesis 1:3",
    ]);
  });

  it("requires remote shape for cross-parent terminal ranges", () => {
    expect(splitLocalRange(parsed("Genesis 1:31-2:3"))).toEqual({
      type: "ref-error",
      kind: "remote-required",
      code: "remote-shape-required",
      input: "Genesis 1:31-2:3",
    });
  });
});

describe("selected BookIndex snapshots", () => {
  it("treats an absent title as not loaded rather than globally invalid", () => {
    expect(parseRef("Exodus 1:1", index)).toEqual({
      type: "ref-error",
      kind: "local-data",
      code: "title-not-loaded",
      input: "Exodus 1:1",
    });
  });
});
