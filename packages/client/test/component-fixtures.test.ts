import { describe, expect, it } from "vitest";

import {
  componentContractExamples,
  componentPayloadFixtures,
} from "@sefaria/client/test-fixtures";

import fixtureManifest from "./fixtures/manifest.json" with { type: "json" };
import {
  validateGetRef200,
  validateGetRef404,
  validateGetV3Texts200,
  validateGetV3Texts400,
  validateGetV3Texts404,
} from "../src/index.js";

const expectedFixtureNames = [
  "ref-invalid-2026-09-02.json",
  "ref-sheet-2026-08-30.json",
  "v3-text-genesis-bilingual-2026-09-02.json",
  "v3-text-genesis-missing-english-2026-09-02.json",
  "v3-text-genesis-missing-only-2026-09-02.json",
  "v3-text-genesis-spanning-bilingual-2026-09-02.json",
  "v3-text-invalid-format-2026-09-02.json",
  "v3-text-invalid-ref-2026-09-02.json",
  "v3-text-shulchan-arukh-long-2026-09-02.json",
] as const;

describe("component payload fixtures", () => {
  it("exports the exact client-owned fixture set", () => {
    expect(
      Object.values(componentPayloadFixtures)
        .map(({ fileName }) => fileName)
        .sort(),
    ).toEqual([...expectedFixtureNames].sort());
  });

  it("records deployed provenance for every payload fixture", () => {
    for (const { capturedAt, fileName, status } of Object.values(
      componentPayloadFixtures,
    )) {
      const provenance = fixtureManifest[fileName];

      expect(provenance.source, fileName).toMatch(
        /^https:\/\/www\.sefaria\.org\/api\//,
      );
      expect(provenance.capturedAt, fileName).toBe(capturedAt);
      expect(provenance.reduction.length, fileName).toBeGreaterThan(0);
      expect(provenance.status, fileName).toBe(status);
    }
  });

  it("records an HTTP status for every deployed fixture", () => {
    for (const [fileName, provenance] of Object.entries(fixtureManifest)) {
      expect(Number.isInteger(provenance.status), fileName).toBe(true);
      expect(provenance.status, fileName).toBeGreaterThanOrEqual(200);
      expect(provenance.status, fileName).toBeLessThan(600);
    }
  });

  it("validates each payload with its generated response contract", () => {
    expect(
      validateGetV3Texts200(componentPayloadFixtures.genesisBilingual.payload),
    ).toBe(true);
    expect(
      validateGetV3Texts200(
        componentPayloadFixtures.genesisMissingEnglish.payload,
      ),
    ).toBe(true);
    expect(
      validateGetV3Texts200(
        componentPayloadFixtures.genesisMissingOnly.payload,
      ),
    ).toBe(true);
    expect(
      validateGetV3Texts200(
        componentPayloadFixtures.genesisSpanningBilingual.payload,
      ),
    ).toBe(true);
    expect(
      validateGetV3Texts200(componentPayloadFixtures.shulchanArukhLong.payload),
    ).toBe(true);
    expect(
      validateGetV3Texts400(componentPayloadFixtures.invalidTextFormat.payload),
    ).toBe(true);
    expect(
      validateGetV3Texts404(componentPayloadFixtures.invalidTextRef.payload),
    ).toBe(true);
    expect(validateGetRef200(componentPayloadFixtures.invalidRef.payload)).toBe(
      true,
    );
    expect(validateGetRef200(componentPayloadFixtures.sheetRef.payload)).toBe(
      true,
    );
  });

  it("keeps generated contract examples outside the deployed manifest", () => {
    expect(
      validateGetRef404(componentContractExamples.refNotFound.payload),
    ).toBe(true);
    expect(componentContractExamples.refNotFound.schemaPath).toBe(
      "/paths/~1api~1ref~1{tref}/get/responses/404/content/application~1json/schema",
    );
    expect(
      Object.hasOwn(fixtureManifest, componentContractExamples.refNotFound.key),
    ).toBe(false);
  });

  it("does not expose test fixtures from the main client entry point", async () => {
    const publicClient = await import("../src/index.js");

    expect(publicClient).not.toHaveProperty("componentPayloadFixtures");
    expect(publicClient).not.toHaveProperty("componentContractExamples");
  });
});
