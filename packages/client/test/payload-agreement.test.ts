import { describe, expect, it } from "vitest";

import fixtureManifest from "./fixtures/manifest.json" with { type: "json" };
import indexGenesisFixture from "./fixtures/index-genesis-2026-09-01.json" with { type: "json" };
import {
  type GetIndexV2Responses,
  type GetShapeResponses,
  validateGetIndexV2200,
  validateGetShape200,
} from "../src/index.js";

const coreOperationFixturePaths = [
  ["get-v3-texts", "/api/v3/texts/"],
  ["get-versions", "/api/texts/versions/"],
  ["get-ref", "/api/ref/"],
  ["get-index-v2", "/api/v2/index/"],
  ["get-shape", "/api/shape/"],
  ["get-links", "/api/links/"],
] as const;

describe("generated payload type and validator agreement", () => {
  it("accepts the Genesis index fixture statically and at runtime", () => {
    const response = indexGenesisFixture satisfies GetIndexV2Responses[200];

    expect(validateGetIndexV2200(response)).toBe(true);
  });

  it("has representative fixture manifest entries for all six Core operations", () => {
    const fixturePaths = Object.values(fixtureManifest).map(
      ({ source }) => new URL(source).pathname,
    );

    for (const [operationId, pathPrefix] of coreOperationFixturePaths) {
      expect(
        fixturePaths.some((path) => path.startsWith(pathPrefix)),
        operationId,
      ).toBe(true);
    }
  });

  it("rejects an index response missing a required field", () => {
    const response =
      // @ts-expect-error categories is required by the generated index response.
      { title: "Genesis", schema: {} } satisfies GetIndexV2Responses[200];

    expect(validateGetIndexV2200(response)).toBe(false);
  });

  it("rejects the uppercase pre-overlay shape response", () => {
    const response = [
      {
        // @ts-expect-error Section is not a corrected lower-case shape field.
        Section: "Torah",
        Length: 50,
        Book: "Genesis",
        heBook: "בראשית",
        Chapters: [31],
      },
    ] satisfies GetShapeResponses[200];

    expect(validateGetShape200(response)).toBe(false);
  });
});
