import { componentPayloadFixtures } from "@sefaria/client/test-fixtures";
import type { ExtractFootnotesResult } from "@sefaria/text-transform";

import type { ComponentFixture, V3ComponentRequest } from "./contracts.js";

const hebrewVersion = "hebrew|Miqra according to the Masorah" as const;
const englishVersion =
  "english|The Contemporary Torah, Jewish Publication Society, 2006" as const;
const missingEnglishVersion = "english|__missing_component_fixture__" as const;

export interface TextAttributionFixture {
  readonly versionTitle: string;
  readonly versionSource: string | null;
}

export type TextSegmentViewModelFixture =
  | {
      readonly state: "loading";
      readonly message: string;
    }
  | {
      readonly state: "data";
      readonly ref: string;
      readonly heRef: string;
      readonly language: string;
      readonly actualLanguage: string;
      readonly direction: "ltr" | "rtl";
      readonly content: ExtractFootnotesResult;
      readonly attribution: TextAttributionFixture;
    }
  | {
      readonly state: "empty";
      readonly ref: string;
      readonly heRef: string;
      readonly requestedVersion: string;
      readonly message: string;
    }
  | {
      readonly state: "error";
      readonly status: 400 | 404;
      readonly message: string;
    };

export type TextSegmentDataFixture = Extract<
  TextSegmentViewModelFixture,
  { readonly state: "data" }
>;

export type TextSegmentEmptyFixture = Extract<
  TextSegmentViewModelFixture,
  { readonly state: "empty" }
>;

export type TextSegmentElementPropertiesFixture = {
  readonly footnoteMode: "interactive" | "static";
  readonly wordSelection: boolean;
};

export const genesisHebrewTextSegment = {
  state: "data",
  ref: "Genesis 1:1",
  heRef: "בראשית א׳:א׳",
  language: "he",
  actualLanguage: "he",
  direction: "rtl",
  content: {
    body: [
      {
        kind: "html",
        html: "<big>בְּ</big>רֵאשִׁ֖ית בָּרָ֣א אֱלֹהִ֑ים אֵ֥ת הַשָּׁמַ֖יִם וְאֵ֥ת הָאָֽרֶץ׃",
      },
    ],
    notes: [],
  },
  attribution: {
    versionTitle: "Miqra according to the Masorah",
    versionSource:
      "https://he.wikisource.org/wiki/%D7%9E%D7%A9%D7%AA%D7%9E%D7%A9:Dovi/%D7%9E%D7%A7%D7%A8%D7%90_%D7%A2%D7%9C_%D7%A4%D7%99_%D7%94%D7%9E%D7%A1%D7%95%D7%A8%D7%94",
  },
} as const satisfies TextSegmentViewModelFixture;

export const genesisEnglishTextSegment = {
  state: "data",
  ref: "Genesis 1:1",
  heRef: "בראשית א׳:א׳",
  language: "en",
  actualLanguage: "en",
  direction: "ltr",
  content: {
    body: [
      {
        kind: "html",
        html: "When God began to create",
      },
      {
        kind: "footnote-marker",
        noteIndex: 0,
        markerText: "*",
      },
      {
        kind: "html",
        html: " heaven and earth—",
      },
    ],
    notes: [
      {
        index: 0,
        markerText: "*",
        content:
          "<b>When God began to create </b>Others “In the beginning God created.”",
      },
    ],
  },
  attribution: {
    versionTitle: "The Contemporary Torah, Jewish Publication Society, 2006",
    versionSource: "https://www.nli.org.il/he/books/NNL_ALEPH002529489/NLI",
  },
} as const satisfies TextSegmentViewModelFixture;

export const missingEnglishTextSegment = {
  state: "empty",
  ref: "Genesis 1:1",
  heRef: "בראשית א׳:א׳",
  requestedVersion: missingEnglishVersion,
  message: "The requested English version is not available.",
} as const satisfies TextSegmentViewModelFixture;

export const invalidTextRefViewModel = {
  state: "error",
  status: 404,
  message: "Could not find title in reference:   missing component fixture  ",
} as const satisfies TextSegmentViewModelFixture;

export const shulchanArukhLongTextSegment = {
  state: "data",
  ref: "Shulchan Arukh, Orach Chayim 1:1",
  heRef: "שולחן ערוך, אורח חיים א׳:א׳",
  language: "he",
  actualLanguage: "he",
  direction: "rtl",
  content: {
    body: [
      {
        kind: "html",
        html: '<b>דין השכמת הבוקר. ובו ט סעיפים:</b><br><i data-commentator="Be\'er HaGolah" data-label="א" data-order="1"></i><i data-commentator="Turei Zahav" data-order="1"></i>יתגבר <i data-commentator="Ba\'er Hetev" data-order="1"></i><i data-commentator="Sha\'arei Teshuvah" data-order="1"></i>כארי לעמוד בבוקר <i data-commentator="Mishnah" data-label="א"></i>לעבודת בוראו <i data-commentator="Be\'er HaGolah" data-label="ב" data-order="2"></i><i data-commentator="Turei Zahav" data-order="2"></i><i data-commentator="Magen Avraham" data-order="1"></i>שיהא הוא מעורר <i data-commentator="Ba\'er Hetev" data-order="2"></i><i data-commentator="Sha\'arei Teshuvah" data-order="2"></i><i data-commentator="Mishnah" data-label="ב"></i>השחר: <small>הגה ועכ"פ לא יאחר זמן התפלה <i data-commentator="Mishnah" data-label="ג"></i>שהצבור מתפללין (טור). הגה <i data-commentator="Ba\'er Hetev" data-order="3"></i><i data-commentator="Sha\'arei Teshuvah" data-order="3"></i>שויתי ה\' לנגדי תמיד הוא כלל גדול בתורה ובמעלות <i data-commentator="Mishnah" data-label="ד"></i>הצדיקים אשר הולכים לפני האלהים כי אין ישיבת האדם ותנועותיו ועסקיו והוא לבדו בביתו כישיבתו ותנועותיו ועסקיו והוא לפני מלך גדול ולא דבורו והרחבת פיו כרצונו והוא עם אנשי ביתו וקרוביו כדבורו במושב המלך כ"ש כשישים האדם אל לבו שהמלך הגדול הקב"ה אשר מלא כל הארץ כבודו עומד עליו ורואה במעשיו כמו שנאמר אם יסתר איש במסתרים ואני לא אראנו נאום ה\' מיד יגיע אליו הירא\' וההכנעה בפחד הש"י ובושתו ממנו תמיד (מורה נבוכים ח"ג פ\' נ"ב) ולא יתבייש <i data-commentator="Magen Avraham" data-order="2"></i><i data-commentator="Mishnah" data-label="ה"></i>מפני בני אדם <i data-commentator="Ba\'er Hetev" data-order="4"></i><i data-commentator="Sha\'arei Teshuvah" data-order="4"></i><i data-commentator="Mishnah" data-label="ו"></i>המלעיגים עליו בעבודת הש"י <i data-commentator="Mishnah" data-label="ז"></i>גם בהצנע לכת ובשכבו על משכבו ידע לפני מי הוא שוכב <i data-commentator="Magen Avraham" data-order="3"></i><i data-commentator="Ateret Zekenim" data-label="♦" data-order="1"></i>ומיד כשיעור משנתו יקום <i data-commentator="Ba\'er Hetev" data-order="5"></i><i data-commentator="Sha\'arei Teshuvah" data-order="5"></i><i data-commentator="Mishnah" data-label="ח"></i>בזריזות לעבודת בוראו יתברך ויתעלה (טור):</small>',
      },
    ],
    notes: [],
  },
  attribution: {
    versionTitle: "Maginei Eretz: Shulchan Aruch Orach Chaim, Lemberg, 1893",
    versionSource: "https://www.nli.org.il/he/books/NNL_ALEPH002084080",
  },
} as const satisfies TextSegmentViewModelFixture;

const genesisBilingualPayload =
  componentPayloadFixtures.genesisBilingual.payload;

export const textSegmentFixtures = [
  {
    kind: "render",
    id: "text-segment-loading",
    ownerIssue: 16,
    viewModel: {
      state: "loading",
      message: "Loading text.",
    },
  },
  {
    kind: "projection",
    id: "text-segment-genesis-hebrew-data",
    ownerIssue: 16,
    request: {
      path: { tref: "Genesis 1:1" },
      query: { version: [hebrewVersion], return_format: "default" },
    },
    payloadKey: "genesisBilingual",
    payload: genesisBilingualPayload,
    expected: genesisHebrewTextSegment,
  },
  {
    kind: "projection",
    id: "text-segment-genesis-english-data",
    ownerIssue: 16,
    request: {
      path: { tref: "Genesis 1:1" },
      query: { version: [englishVersion], return_format: "default" },
    },
    payloadKey: "genesisBilingual",
    payload: genesisBilingualPayload,
    expected: genesisEnglishTextSegment,
  },
  {
    kind: "projection",
    id: "text-segment-shulchan-long-data",
    ownerIssue: 16,
    request: {
      path: { tref: "Shulchan Arukh, Orach Chayim 1:1" },
      query: { version: ["primary"], return_format: "default" },
    },
    payloadKey: "shulchanArukhLong",
    payload: componentPayloadFixtures.shulchanArukhLong.payload,
    expected: shulchanArukhLongTextSegment,
  },
  {
    kind: "projection",
    id: "text-segment-genesis-missing-empty",
    ownerIssue: 16,
    request: {
      path: { tref: "Genesis 1:1" },
      query: {
        version: [missingEnglishVersion],
        return_format: "default",
      },
    },
    payloadKey: "genesisMissingOnly",
    payload: componentPayloadFixtures.genesisMissingOnly.payload,
    expected: missingEnglishTextSegment,
  },
  {
    kind: "http-error",
    id: "text-segment-invalid-format-error",
    ownerIssue: 16,
    transportTrigger: {
      path: { tref: "Genesis 1:1" },
      query: { return_format: "__invalid_component_fixture__" },
      reason:
        "The deployed 400 trigger is outside the generated return_format union and cannot be a component request.",
    },
    status: 400,
    payloadKey: "invalidTextFormat",
    payload: componentPayloadFixtures.invalidTextFormat.payload,
    expected: {
      state: "error",
      status: 400,
      message:
        "return_format should be one of those formats: ['default', 'wrap_all_entities', 'text_only', 'strip_only_footnotes'].",
    },
  },
  {
    kind: "http-error",
    id: "text-segment-invalid-ref-error",
    ownerIssue: 16,
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
    id: "text-segment-network-rejection",
    ownerIssue: 16,
    request: {
      path: { tref: "Genesis 1:1" },
      query: { version: [hebrewVersion] },
    },
    rejection: "network",
  },
] as const satisfies readonly ComponentFixture<
  V3ComponentRequest,
  TextSegmentViewModelFixture
>[];
