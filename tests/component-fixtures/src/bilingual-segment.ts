import { componentPayloadFixtures } from "@sefaria/client/test-fixtures";

import type { ComponentFixture, V3ComponentRequest } from "./contracts.js";
import {
  genesisEnglishTextSegment,
  genesisHebrewTextSegment,
  invalidTextRefViewModel,
  missingEnglishTextSegment,
  type TextSegmentDataFixture,
  type TextSegmentEmptyFixture,
} from "./text-segment.js";

const hebrewVersion = "hebrew|Miqra according to the Masorah" as const;
const englishVersion =
  "english|The Contemporary Torah, Jewish Publication Society, 2006" as const;
const missingEnglishVersion = "english|__missing_component_fixture__" as const;

export type BilingualSegmentViewModelFixture =
  | {
      readonly state: "loading";
      readonly message: string;
    }
  | {
      readonly state: "data";
      readonly ref: string;
      readonly source: TextSegmentDataFixture;
      readonly translation: TextSegmentDataFixture;
    }
  | {
      readonly state: "partial";
      readonly ref: string;
      readonly source: TextSegmentDataFixture;
      readonly translation: TextSegmentEmptyFixture;
      readonly missing: readonly ["translation"];
    }
  | {
      readonly state: "empty";
      readonly ref: string;
      readonly message: string;
    }
  | {
      readonly state: "error";
      readonly status: 400 | 404;
      readonly message: string;
    };

export type BilingualSegmentDataFixture = Extract<
  BilingualSegmentViewModelFixture,
  { readonly state: "data" }
>;

export type BilingualSegmentPartialFixture = Extract<
  BilingualSegmentViewModelFixture,
  { readonly state: "partial" }
>;

export type BilingualSegmentElementPropertiesFixture = {
  readonly layout:
    "auto" | "english-only" | "hebrew-only" | "side-by-side" | "stacked";
  readonly primarySide: "source" | "translation";
};

export const genesisBilingualSegment = {
  state: "data",
  ref: "Genesis 1:1",
  source: genesisHebrewTextSegment,
  translation: genesisEnglishTextSegment,
} as const satisfies BilingualSegmentViewModelFixture;

export const genesisMissingEnglishBilingualSegment = {
  state: "partial",
  ref: "Genesis 1:1",
  source: genesisHebrewTextSegment,
  translation: missingEnglishTextSegment,
  missing: ["translation"],
} as const satisfies BilingualSegmentViewModelFixture;

export const bilingualSegmentFixtures = [
  {
    kind: "render",
    id: "bilingual-loading",
    ownerIssue: 18,
    viewModel: {
      state: "loading",
      message: "Loading bilingual text.",
    },
  },
  {
    kind: "projection",
    id: "bilingual-genesis-data",
    ownerIssue: 18,
    request: {
      path: { tref: "Genesis 1:1" },
      query: {
        version: [hebrewVersion, englishVersion],
        return_format: "default",
      },
    },
    payloadKey: "genesisBilingual",
    payload: componentPayloadFixtures.genesisBilingual.payload,
    expected: genesisBilingualSegment,
  },
  {
    kind: "projection",
    id: "bilingual-genesis-missing-english-partial",
    ownerIssue: 18,
    request: {
      path: { tref: "Genesis 1:1" },
      query: {
        version: [hebrewVersion, missingEnglishVersion],
        return_format: "default",
      },
    },
    payloadKey: "genesisMissingEnglish",
    payload: componentPayloadFixtures.genesisMissingEnglish.payload,
    expected: genesisMissingEnglishBilingualSegment,
  },
  {
    kind: "projection",
    id: "bilingual-genesis-missing-empty",
    ownerIssue: 18,
    request: {
      path: { tref: "Genesis 1:1" },
      query: {
        version: [missingEnglishVersion],
        return_format: "default",
      },
    },
    payloadKey: "genesisMissingOnly",
    payload: componentPayloadFixtures.genesisMissingOnly.payload,
    expected: {
      state: "empty",
      ref: "Genesis 1:1",
      message: "No requested language is available.",
    },
  },
  {
    kind: "http-error",
    id: "bilingual-invalid-ref-error",
    ownerIssue: 18,
    request: {
      path: { tref: "__missing_component_fixture__" },
    },
    status: 404,
    payloadKey: "invalidTextRef",
    payload: componentPayloadFixtures.invalidTextRef.payload,
    expected: invalidTextRefViewModel,
  },
  {
    kind: "rejection",
    id: "bilingual-network-rejection",
    ownerIssue: 18,
    request: {
      path: { tref: "Genesis 1:1" },
      query: { version: [hebrewVersion, englishVersion] },
    },
    rejection: "network",
  },
] as const satisfies readonly ComponentFixture<
  V3ComponentRequest,
  BilingualSegmentViewModelFixture
>[];
