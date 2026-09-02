import { componentPayloadFixtures } from "@sefaria/client/test-fixtures";

import type { ComponentFixture, V3ComponentRequest } from "./contracts.js";
import type {
  BilingualSegmentDataFixture,
  BilingualSegmentPartialFixture,
} from "./bilingual-segment.js";
import {
  invalidTextRefViewModel,
  type TextSegmentDataFixture,
  type TextSegmentEmptyFixture,
} from "./text-segment.js";

const hebrewVersion = "hebrew|Miqra according to the Masorah" as const;
const englishVersion =
  "english|The Contemporary Torah, Jewish Publication Society, 2006" as const;
const missingEnglishVersion = "english|__missing_component_fixture__" as const;
const missingHebrewVersion = "hebrew|__missing_component_fixture__" as const;
const missingEnglishWarningKey =
  "english|  missing component fixture  " as const;
const missingHebrewWarningKey = "hebrew|  missing component fixture  " as const;

const hebrewAttribution = {
  versionTitle: "Miqra according to the Masorah",
  versionSource:
    "https://he.wikisource.org/wiki/%D7%9E%D7%A9%D7%AA%D7%9E%D7%A9:Dovi/%D7%9E%D7%A7%D7%A8%D7%90_%D7%A2%D7%9C_%D7%A4%D7%99_%D7%94%D7%9E%D7%A1%D7%95%D7%A8%D7%94",
} as const;

const englishAttribution = {
  versionTitle: "The Contemporary Torah, Jewish Publication Society, 2006",
  versionSource: "https://www.nli.org.il/he/books/NNL_ALEPH002529489/NLI",
} as const;

function dataSegment(
  ref: string,
  heRef: string,
  language: "en" | "he",
  direction: "ltr" | "rtl",
  content: TextSegmentDataFixture["content"],
): TextSegmentDataFixture {
  return {
    state: "data",
    ref,
    heRef,
    language,
    actualLanguage: language,
    direction,
    content,
    attribution: language === "he" ? hebrewAttribution : englishAttribution,
  };
}

function missingTranslation(
  ref: string,
  heRef: string,
): TextSegmentEmptyFixture {
  return {
    state: "empty",
    ref,
    heRef,
    requestedVersion: missingEnglishVersion,
    message: "The requested English version is not available.",
  };
}

const hebrewSegments = [
  dataSegment("Genesis 1:31", "בראשית א׳:ל״א", "he", "rtl", {
    body: [
      {
        kind: "html",
        html: 'וַיַּ֤רְא אֱלֹהִים֙ אֶת־כׇּל־אֲשֶׁ֣ר עָשָׂ֔ה וְהִנֵּה־ט֖וֹב מְאֹ֑ד וַֽיְהִי־עֶ֥רֶב וַֽיְהִי־בֹ֖קֶר י֥וֹם הַשִּׁשִּֽׁי׃&nbsp;<span class="mam-spi-pe">{פ}</span><br>',
      },
    ],
    notes: [],
  }),
  dataSegment("Genesis 2:1", "בראשית ב׳:א׳", "he", "rtl", {
    body: [
      {
        kind: "html",
        html: "וַיְכֻלּ֛וּ הַשָּׁמַ֥יִם וְהָאָ֖רֶץ וְכׇל־צְבָאָֽם׃",
      },
    ],
    notes: [],
  }),
  dataSegment("Genesis 2:2", "בראשית ב׳:ב׳", "he", "rtl", {
    body: [
      {
        kind: "html",
        html: "וַיְכַ֤ל אֱלֹהִים֙ בַּיּ֣וֹם הַשְּׁבִיעִ֔י מְלַאכְתּ֖וֹ אֲשֶׁ֣ר עָשָׂ֑ה וַיִּשְׁבֹּת֙ בַּיּ֣וֹם הַשְּׁבִיעִ֔י מִכׇּל־מְלַאכְתּ֖וֹ אֲשֶׁ֥ר עָשָֽׂה׃",
      },
    ],
    notes: [],
  }),
] as const;

const englishSegments = [
  dataSegment("Genesis 1:31", "בראשית א׳:ל״א", "en", "ltr", {
    body: [
      {
        kind: "html",
        html: "And God saw all that had been made, and found it very good. And there was evening and there was morning, the sixth day.",
      },
    ],
    notes: [],
  }),
  dataSegment("Genesis 2:1", "בראשית ב׳:א׳", "en", "ltr", {
    body: [
      {
        kind: "html",
        html: "The heaven and the earth were finished, and all their array.",
      },
    ],
    notes: [],
  }),
  dataSegment("Genesis 2:2", "בראשית ב׳:ב׳", "en", "ltr", {
    body: [
      {
        kind: "html",
        html: "On the seventh day God finished the work that had been undertaken: [God] ceased",
      },
      {
        kind: "footnote-marker",
        noteIndex: 0,
        markerText: "*",
      },
      {
        kind: "html",
        html: " on the seventh day from doing any of the work.",
      },
    ],
    notes: [
      {
        index: 0,
        markerText: "*",
        content: "<b>ceased </b>Or “rested.”",
      },
    ],
  }),
] as const;

export const genesisSpanningTextRange = {
  state: "data",
  ref: "Genesis 1:31-2:2",
  heRef: "בראשית א׳:ל״א-ב׳:ב׳",
  segments: hebrewSegments.map((source, index) => ({
    state: "data",
    ref: source.ref,
    source,
    translation: englishSegments[index]!,
  })) as readonly BilingualSegmentDataFixture[],
} as const satisfies TextRangeViewModelFixture;

export const genesisSpanningPartialTextRange = {
  state: "partial",
  ref: "Genesis 1:31-2:2",
  heRef: "בראשית א׳:ל״א-ב׳:ב׳",
  segments: hebrewSegments.map((source) => ({
    state: "partial",
    ref: source.ref,
    source,
    translation: missingTranslation(source.ref, source.heRef),
    missing: ["translation"],
  })) as readonly BilingualSegmentPartialFixture[],
  missing: ["translation"],
} as const satisfies TextRangeViewModelFixture;

export type TextRangeViewModelFixture =
  | {
      readonly state: "loading";
      readonly message: string;
    }
  | {
      readonly state: "data";
      readonly ref: string;
      readonly heRef: string;
      readonly segments: readonly BilingualSegmentDataFixture[];
    }
  | {
      readonly state: "partial";
      readonly ref: string;
      readonly heRef: string;
      readonly segments: readonly BilingualSegmentPartialFixture[];
      readonly missing: readonly ["translation"];
    }
  | {
      readonly state: "empty";
      readonly ref: string;
      readonly heRef: string;
      readonly message: string;
    }
  | {
      readonly state: "error";
      readonly status: 400 | 404;
      readonly message: string;
    };

export type TextRangeElementPropertiesFixture = {
  readonly layout: "side-by-side" | "stacked";
  readonly numbering: "none" | "segment";
  readonly selection: boolean;
  readonly highlights: readonly {
    readonly ref: string;
    readonly tone: "primary" | "secondary";
  }[];
};

const spanningPayload =
  componentPayloadFixtures.genesisSpanningBilingual.payload;

const spanningMissingEnglishPayload = {
  ...spanningPayload,
  versions: spanningPayload.versions.filter(
    ({ language }) => language === "he",
  ),
  warnings: [
    {
      [missingEnglishWarningKey]: {
        warning_code: 101,
        message:
          "We do not have the requested English version for Genesis 1:31-2:2",
      },
    },
  ],
};

const spanningEmptyPayload = {
  ...spanningPayload,
  versions: [],
  warnings: [
    {
      [missingHebrewWarningKey]: {
        warning_code: 101,
        message:
          "We do not have the requested Hebrew version for Genesis 1:31-2:2",
      },
    },
    {
      [missingEnglishWarningKey]: {
        warning_code: 101,
        message:
          "We do not have the requested English version for Genesis 1:31-2:2",
      },
    },
  ],
};

export const textRangeFixtures = [
  {
    kind: "render",
    id: "range-loading",
    ownerIssue: 19,
    viewModel: {
      state: "loading",
      message: "Loading text range.",
    },
  },
  {
    kind: "projection",
    id: "range-genesis-spanning-data",
    ownerIssue: 19,
    request: {
      path: { tref: "Genesis 1:31-2:2" },
      query: {
        version: [hebrewVersion, englishVersion],
        return_format: "default",
      },
    },
    payloadKey: "genesisSpanningBilingual",
    payload: spanningPayload,
    expected: genesisSpanningTextRange,
  },
  {
    kind: "projection",
    id: "range-genesis-spanning-partial",
    ownerIssue: 19,
    request: {
      path: { tref: "Genesis 1:31-2:2" },
      query: {
        version: [hebrewVersion, missingEnglishVersion],
        return_format: "default",
      },
    },
    payloadKey: "genesisSpanningBilingual",
    payload: spanningMissingEnglishPayload,
    derivedFrom: {
      payloadKey: "genesisSpanningBilingual",
      operation:
        "Keep the Hebrew version and replace the English version with warning code 101.",
    },
    expected: genesisSpanningPartialTextRange,
  },
  {
    kind: "projection",
    id: "range-genesis-spanning-empty",
    ownerIssue: 19,
    request: {
      path: { tref: "Genesis 1:31-2:2" },
      query: {
        version: [missingHebrewVersion, missingEnglishVersion],
        return_format: "default",
      },
    },
    payloadKey: "genesisSpanningBilingual",
    payload: spanningEmptyPayload,
    derivedFrom: {
      payloadKey: "genesisSpanningBilingual",
      operation:
        "Remove all versions and add warning code 101 for both requested versions.",
    },
    expected: {
      state: "empty",
      ref: "Genesis 1:31-2:2",
      heRef: "בראשית א׳:ל״א-ב׳:ב׳",
      message: "No requested text is available in this range.",
    },
  },
  {
    kind: "http-error",
    id: "range-invalid-ref-error",
    ownerIssue: 19,
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
    id: "range-network-rejection",
    ownerIssue: 19,
    request: {
      path: { tref: "Genesis 1:31-2:2" },
      query: { version: [hebrewVersion, englishVersion] },
    },
    rejection: "network",
  },
] as const satisfies readonly ComponentFixture<
  V3ComponentRequest,
  TextRangeViewModelFixture
>[];
