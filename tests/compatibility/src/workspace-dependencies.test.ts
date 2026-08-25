import type { SefariaClientOptions } from "@sefaria/client";
import type { SourceCardData, TextResponse } from "@sefaria/model";
import type { ParsedRef } from "@sefaria/ref";
import type { VocalizationOptions } from "@sefaria/text-transform";
import { expect, test } from "vitest";

test("composes the lower-layer workspace contracts", () => {
  const client = {} satisfies SefariaClientOptions;
  const sourceCard = {
    ref: "Genesis 1:1",
    segments: [{ ref: "Genesis 1:1", translations: [] }],
  } satisfies SourceCardData;
  const parsedRef = {
    book: "Genesis",
    index: "Genesis",
    nodeKey: "genesis",
    nodePath: ["genesis"],
    addressTypes: ["integer", "integer"],
    sections: ["1", "1"],
    toSections: ["1", "1"],
    sectionPositions: [1, 1],
    toSectionPositions: [1, 1],
  } satisfies ParsedRef;
  const textResponse = {
    ref: "Shabbat 2a:1",
    sections: ["2a", "1"],
    toSections: ["2a", "1"],
    isSpanning: false,
    versions: [],
  } satisfies TextResponse;
  const vocalization = { paseq: "after-space" } satisfies VocalizationOptions;

  expect({
    client,
    sourceCard,
    parsedRef,
    textResponse,
    vocalization,
  }).toBeDefined();
});
