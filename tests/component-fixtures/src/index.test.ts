import type { GetRefData, GetV3TextsData } from "@sefaria/client";
import {
  componentContractExamples,
  componentPayloadFixtures,
} from "@sefaria/client/test-fixtures";
import {
  applyVocalizationToHtml,
  extractFootnotes,
  sanitize,
} from "@sefaria/text-transform";
import { describe, expect, it } from "vitest";

import "./no-network.js";
import {
  browserFixtures,
  componentFixtures,
  type RefComponentRequest,
  type V3ComponentRequest,
} from "./index.js";

const expectedScenarioIds = [
  "bilingual-genesis-data",
  "bilingual-genesis-missing-empty",
  "bilingual-genesis-missing-english-partial",
  "bilingual-invalid-ref-error",
  "bilingual-loading",
  "bilingual-network-rejection",
  "range-genesis-spanning-data",
  "range-genesis-spanning-empty",
  "range-genesis-spanning-partial",
  "range-invalid-ref-error",
  "range-loading",
  "range-network-rejection",
  "ref-label-contract-error",
  "ref-label-invalid-empty",
  "ref-label-loading",
  "ref-label-network-rejection",
  "ref-label-sheet-data",
  "text-segment-genesis-english-data",
  "text-segment-genesis-hebrew-data",
  "text-segment-genesis-missing-empty",
  "text-segment-invalid-format-error",
  "text-segment-invalid-ref-error",
  "text-segment-loading",
  "text-segment-network-rejection",
  "text-segment-shulchan-long-data",
] as const;

const validV3Request = {
  path: { tref: "Genesis 1:1" },
  query: { version: ["primary"] },
} satisfies V3ComponentRequest;

const validRefRequest = {
  path: { tref: "Sheet 643492" },
} satisfies RefComponentRequest;

const generatedV3Request = validV3Request satisfies Pick<
  GetV3TextsData,
  "path" | "query"
>;
const generatedRefRequest = validRefRequest satisfies Pick<GetRefData, "path">;

const invalidV3Request = {
  path: { tref: "Genesis 1:1" },
  // @ts-expect-error Layout is an element property, not request data.
  layout: "side-by-side",
} satisfies V3ComponentRequest;

const invalidRefRequest = {
  path: { tref: "Sheet 643492" },
  // @ts-expect-error Direction is view-model data, not request data.
  direction: "rtl",
} satisfies RefComponentRequest;

void generatedV3Request;
void generatedRefRequest;
void invalidV3Request;
void invalidRefRequest;

type ComponentScenario = (typeof componentFixtures)[number];

function fixture<TId extends ComponentScenario["id"]>(
  id: TId,
): Extract<ComponentScenario, { readonly id: TId }> {
  const result = componentFixtures.find(
    (
      candidate,
    ): candidate is Extract<ComponentScenario, { readonly id: TId }> =>
      candidate.id === id,
  );
  if (!result) {
    throw new Error(`Missing component fixture: ${id}`);
  }
  return result;
}

describe("component fixture contract", () => {
  it("defines the named component scenarios", () => {
    expect(componentFixtures.map(({ id }) => id).sort()).toEqual(
      [...expectedScenarioIds].sort(),
    );
  });

  it("links payload scenarios to client-owned payloads or contract examples", () => {
    const payloadKeys = new Set<string>(Object.keys(componentPayloadFixtures));
    const contractKeys = new Set<string>(
      Object.values(componentContractExamples).map(({ key }) => key),
    );

    for (const scenario of componentFixtures) {
      if (scenario.kind === "projection" || scenario.kind === "http-error") {
        expect(
          payloadKeys.has(scenario.payloadKey) ||
            contractKeys.has(scenario.payloadKey),
          scenario.id,
        ).toBe(true);
      }
    }
  });

  it("assigns every scenario to its production owner", () => {
    expect(
      componentFixtures.every(({ ownerIssue }) =>
        [16, 17, 18, 19].includes(ownerIssue),
      ),
    ).toBe(true);
  });

  it("commits the lower-layer English footnote result", () => {
    const scenario = fixture("text-segment-genesis-english-data");
    expect(scenario.kind).toBe("projection");
    if (scenario.kind !== "projection" || scenario.expected.state !== "data") {
      throw new Error("Expected an English text-segment data fixture.");
    }

    const payload = componentPayloadFixtures.genesisBilingual.payload;
    const version = payload.versions.find(({ language }) => language === "en");
    if (!version || typeof version.text !== "string") {
      throw new Error("Missing English Genesis fixture text.");
    }
    const sanitized = sanitize(version.text);
    const extracted = extractFootnotes(sanitized);

    expect(scenario.expected.content).toEqual({
      body: extracted.body.map((part) =>
        part.kind === "html"
          ? {
              ...part,
              html: applyVocalizationToHtml(part.html, "taamim_and_nikkud"),
            }
          : part,
      ),
      notes: extracted.notes.map((note) => ({
        ...note,
        content:
          note.content === null
            ? null
            : applyVocalizationToHtml(note.content, "taamim_and_nikkud"),
      })),
    });
  });

  it("commits the lower-layer long Hebrew transform result", () => {
    const scenario = fixture("text-segment-shulchan-long-data");
    expect(scenario.kind).toBe("projection");
    if (scenario.kind !== "projection" || scenario.expected.state !== "data") {
      throw new Error("Expected a long Hebrew text-segment data fixture.");
    }

    const payload = componentPayloadFixtures.shulchanArukhLong.payload;
    const version = payload.versions[0];
    if (!version || typeof version.text !== "string") {
      throw new Error("Missing Shulchan Arukh fixture text.");
    }

    expect(scenario.expected.content).toEqual(
      extractFootnotes(
        applyVocalizationToHtml(sanitize(version.text), "taamim_and_nikkud"),
      ),
    );
  });

  it("distinguishes partial, empty, error, and rejection outcomes", () => {
    const partial = fixture("bilingual-genesis-missing-english-partial");
    const empty = fixture("bilingual-genesis-missing-empty");
    const error = fixture("bilingual-invalid-ref-error");
    const rejection = fixture("bilingual-network-rejection");

    expect(partial.kind).toBe("projection");
    expect(partial.kind === "projection" && partial.expected.state).toBe(
      "partial",
    );
    expect(empty.kind).toBe("projection");
    expect(empty.kind === "projection" && empty.expected.state).toBe("empty");
    expect(error.kind).toBe("http-error");
    expect(error.kind === "http-error" && error.expected.state).toBe("error");
    expect(rejection.kind).toBe("rejection");
    expect("expected" in rejection).toBe(false);
  });

  it("keeps an unrepresentable HTTP error trigger outside component requests", () => {
    const scenario = fixture("text-segment-invalid-format-error");

    expect(scenario.kind).toBe("http-error");
    expect("request" in scenario).toBe(false);
    expect(scenario.transportTrigger).toEqual({
      path: { tref: "Genesis 1:1" },
      query: { return_format: "__invalid_component_fixture__" },
      reason:
        "The deployed 400 trigger is outside the generated return_format union and cannot be a component request.",
    });
  });

  it("aligns derived range states with their requested missing versions", () => {
    const partial = fixture("range-genesis-spanning-partial");
    const empty = fixture("range-genesis-spanning-empty");

    expect(partial.kind).toBe("projection");
    expect(empty.kind).toBe("projection");
    if (partial.kind !== "projection" || empty.kind !== "projection") {
      throw new Error("Expected range projection fixtures.");
    }

    expect(partial.request.query?.version).toEqual([
      "hebrew|Miqra according to the Masorah",
      "english|__missing_component_fixture__",
    ]);
    expect(empty.request.query?.version).toEqual([
      "hebrew|__missing_component_fixture__",
      "english|__missing_component_fixture__",
    ]);
    expect(partial.payload.warnings).toEqual([
      expect.objectContaining({
        "english|  missing component fixture  ": expect.any(Object),
      }),
    ]);
    expect(empty.payload.warnings).toEqual([
      expect.objectContaining({
        "hebrew|  missing component fixture  ": expect.any(Object),
      }),
      expect.objectContaining({
        "english|  missing component fixture  ": expect.any(Object),
      }),
    ]);
  });

  it("keeps direction in view models and outside element properties", () => {
    for (const fixture of browserFixtures) {
      expect(fixture.elementProperties).not.toHaveProperty("direction");
      if (
        fixture.viewModel.state === "data" &&
        "direction" in fixture.viewModel
      ) {
        expect(["ltr", "rtl"]).toContain(fixture.viewModel.direction);
      }
    }
  });
});
