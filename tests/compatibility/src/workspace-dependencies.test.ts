import type { SefariaClientOptions } from "@sefaria/client";
import type { SourceCardData } from "@sefaria/model";
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
    sections: [1, 1],
    toSections: [1, 1],
  } satisfies ParsedRef;
  const vocalization = { paseq: "after-space" } satisfies VocalizationOptions;

  expect({ client, sourceCard, parsedRef, vocalization }).toBeDefined();
});
