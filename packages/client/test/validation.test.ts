import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  validateGetIndexV2200,
  validateGetLinks200,
  validateGetLinks400,
  validateGetRef200,
  validateGetRef404,
  validateGetShape200,
  validateGetTextVersions200,
  validateGetV3Texts200,
  validateGetV3Texts400,
  validateGetV3Texts404,
} from "../src/generated/response-validators.gen.js";
import {
  zCoreStringArrayOrNull,
  zCoreV3AvailableVersion,
  zCoreV3TextValue,
  zCoreV3Version,
} from "../src/generated/zod.gen.js";
import { validateExternalResponse } from "../src/validation.js";

const fixtureRoot = resolve(import.meta.dirname, "fixtures");

describe("public generated response validators", () => {
  it("validates every documented Core success and error shape", async () => {
    const v3 = JSON.parse(
      await readFile(
        resolve(fixtureRoot, "v3-text-spanning-2026-08-29.json"),
        "utf8",
      ),
    ) as unknown;

    expect(validateGetV3Texts200(v3)).toBe(true);
    expect(validateGetV3Texts400({ error: "invalid format" })).toBe(true);
    expect(validateGetV3Texts404({ error: "unknown ref" })).toBe(true);
    expect(validateGetTextVersions200([])).toBe(true);
    expect(
      validateGetTextVersions200({ error: "invalid text reference" }),
    ).toBe(true);
    expect(validateGetRef200({ is_ref: false })).toBe(true);
    expect(validateGetRef404({ error: "unexpected parse failure" })).toBe(true);
    expect(
      validateGetIndexV2200({
        title: "Genesis",
        categories: ["Tanakh", "Torah"],
        schema: {},
        firstSectionRef: "Genesis 1",
        relatedTopics: [],
      }),
    ).toBe(true);
    expect(validateGetIndexV2200({ error: "unknown index" })).toBe(true);
    expect(
      validateGetShape200([
        {
          section: "Torah",
          heTitle: "Bereshit",
          title: "Genesis",
          length: 50,
          chapters: [31, 25],
          book: "Genesis",
          heBook: "Bereshit",
        },
      ]),
    ).toBe(true);
    expect(
      validateGetShape200([
        {
          isComplex: true,
          section: "Minor Tractates",
          length: 2,
          chapters: [
            {
              section: "Minor Tractates",
              heTitle: "Derekh Eretz",
              title: "Derekh Eretz",
              length: 2,
              chapters: [1, 1],
              book: "Derekh Eretz",
              heBook: "Derekh Eretz",
            },
          ],
          book: "Derekh Eretz",
          heBook: "Derekh Eretz",
        },
      ]),
    ).toBe(true);
    expect(validateGetShape200({ error: "unknown category" })).toBe(true);
    expect(validateGetLinks200([])).toBe(true);
    expect(validateGetLinks200({ error: "invalid link reference" })).toBe(true);
    expect(
      validateGetLinks200([
        {
          isSheet: true,
          index_title: "Sheet",
          category: "Sheets",
          collectiveTitle: { en: "Sheet", he: "Sheet" },
          sourceRef: "Sheet",
          sourceHeRef: "Sheet",
        },
      ]),
    ).toBe(true);
    expect(
      validateGetLinks400({
        error: "with_text is not supported for whole-book refs.",
        ref: "Genesis",
      }),
    ).toBe(true);
  });

  it("accepts recursive nullable text and link values", () => {
    expect(zCoreStringArrayOrNull.safeParse(null).success).toBe(true);
    expect(zCoreV3TextValue.safeParse(null).success).toBe(true);
    expect(zCoreStringArrayOrNull.safeParse(42).success).toBe(false);
    expect(zCoreV3TextValue.safeParse({ text: "wrong" }).success).toBe(false);
    expect(
      validateGetLinks200([
        {
          _id: "1",
          index_title: "Rashi on Genesis",
          category: "Commentary",
          type: "commentary",
          ref: "Rashi on Genesis 1:1:1",
          anchorRef: "Genesis 1:1",
          anchorRefExpanded: ["Genesis 1:1"],
          sourceRef: "Rashi on Genesis 1:1:1",
          sourceHeRef: "Rashi on Genesis 1:1:1",
          anchorVerse: 1,
          sourceHasEn: false,
          commentaryNum: 1.0001,
          collectiveTitle: { en: "Rashi", he: "Rashi" },
          text: [null, ["nested"]],
          versionTitle: null,
          displayedText: { en: "Introduction", he: "Introduction" },
        },
      ]),
    ).toBe(true);
  });

  it("enforces generated required, strict, and minProperties constraints", async () => {
    expect(
      zCoreV3AvailableVersion.safeParse({
        actualLanguage: "he",
        languageFamilyName: "hebrew",
        isSource: true,
        isPrimary: true,
        direction: "rtl",
      }).success,
    ).toBe(false);
    expect(
      zCoreV3Version.safeParse({
        actualLanguage: "he",
        languageFamilyName: "hebrew",
        isSource: true,
        isPrimary: true,
        direction: "rtl",
        text: "text",
      }).success,
    ).toBe(false);
    expect(validateGetRef200({ is_ref: false, unexpected: true })).toBe(false);

    const v3 = JSON.parse(
      await readFile(
        resolve(fixtureRoot, "v3-text-spanning-2026-08-29.json"),
        "utf8",
      ),
    ) as { warnings: unknown[] };
    v3.warnings = [{}];
    expect(validateGetV3Texts200(v3)).toBe(false);

    expect(
      validateGetIndexV2200({
        title: "Genesis",
        categories: ["Tanakh", "Torah"],
        schema: {},
        authors: [
          {
            en: "Author",
            unknown: "not allowed",
          },
        ],
      }),
    ).toBe(false);
  });

  it("returns structured issues for invalid external JSON", () => {
    const result = validateExternalResponse(
      {
        method: "GET",
        path: "/api/v3/texts/{tref}",
        status: 200,
      },
      { versions: "wrong" },
    );

    expect(result.valid).toBe(false);
    if (result.valid) {
      throw new Error("Expected external validation to fail.");
    }
    expect(result.issues.length).toBeGreaterThan(0);
    expect(
      result.issues.some((issue) => issue.instancePath === "/versions"),
    ).toBe(true);
    expect(result.issues.every((issue) => issue.schemaPath.length > 0)).toBe(
      true,
    );
  });
});
