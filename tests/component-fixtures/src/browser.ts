import type { BrowserFixture } from "./contracts.js";
import {
  genesisBilingualSegment,
  type BilingualSegmentElementPropertiesFixture,
  type BilingualSegmentViewModelFixture,
} from "./bilingual-segment.js";
import {
  sheetRefLabel,
  type RefLabelElementPropertiesFixture,
  type RefLabelViewModelFixture,
} from "./ref-label.js";
import {
  genesisEnglishTextSegment,
  type TextSegmentElementPropertiesFixture,
  type TextSegmentViewModelFixture,
} from "./text-segment.js";
import {
  genesisSpanningTextRange,
  type TextRangeElementPropertiesFixture,
  type TextRangeViewModelFixture,
} from "./text-range.js";

const lightTheme = {
  colorScheme: "light",
  properties: {
    "--sefaria-font-english": "system-ui, sans-serif",
    "--sefaria-font-hebrew": "serif",
    "--sefaria-fg": "rgb(24, 24, 23)",
    "--sefaria-bg": "rgb(255, 255, 255)",
  },
} as const;

const darkTheme = {
  colorScheme: "dark",
  properties: {
    "--sefaria-font-english": "system-ui, sans-serif",
    "--sefaria-font-hebrew": "serif",
    "--sefaria-fg": "rgb(255, 255, 255)",
    "--sefaria-bg": "rgb(45, 45, 43)",
  },
} as const;

const textSegmentBrowserFixture = {
  id: "browser-text-segment-english-narrow",
  ownerIssue: 16,
  viewModel: genesisEnglishTextSegment,
  elementProperties: {
    footnoteMode: "interactive",
    wordSelection: true,
  },
  container: { width: 320 },
  theme: lightTheme,
  blockingAssertions: [
    "content-contained",
    "ltr-content-direction",
    "footnote-control-accessible",
    "word-selection-keyboard-operable",
  ],
  informationalScreenshot: "text-segment-english-narrow-light.png",
} as const satisfies BrowserFixture<
  TextSegmentViewModelFixture,
  TextSegmentElementPropertiesFixture
>;

const refLabelBrowserFixture = {
  id: "browser-ref-label-sheet-narrow",
  ownerIssue: 17,
  viewModel: sheetRefLabel,
  elementProperties: {
    form: "human",
    language: "he",
    link: true,
  },
  container: { width: 320 },
  theme: darkTheme,
  blockingAssertions: [
    "content-contained",
    "rtl-label-direction",
    "link-href-preserved",
    "link-keyboard-operable",
  ],
  informationalScreenshot: "ref-label-sheet-narrow-dark.png",
} as const satisfies BrowserFixture<
  RefLabelViewModelFixture,
  RefLabelElementPropertiesFixture
>;

const bilingualSegmentBrowserFixture = {
  id: "browser-bilingual-segment-wide",
  ownerIssue: 18,
  viewModel: genesisBilingualSegment,
  elementProperties: {
    layout: "side-by-side",
    primarySide: "source",
  },
  container: { width: 960 },
  theme: lightTheme,
  blockingAssertions: [
    "content-contained",
    "source-rtl-translation-ltr",
    "paired-segments-aligned",
    "unequal-text-lengths-supported",
  ],
  informationalScreenshot: "bilingual-segment-wide-light.png",
} as const satisfies BrowserFixture<
  BilingualSegmentViewModelFixture,
  BilingualSegmentElementPropertiesFixture
>;

const textRangeBrowserFixture = {
  id: "browser-text-range-spanning-wide",
  ownerIssue: 19,
  viewModel: genesisSpanningTextRange,
  elementProperties: {
    layout: "side-by-side",
    numbering: "segment",
    selection: true,
    highlights: [
      {
        ref: "Genesis 2:2",
        tone: "primary",
      },
    ],
  },
  container: { width: 960 },
  theme: darkTheme,
  blockingAssertions: [
    "content-contained",
    "segment-order-preserved",
    "range-numbering-visible",
    "highlight-bound-to-reference",
  ],
  informationalScreenshot: "text-range-spanning-wide-dark.png",
} as const satisfies BrowserFixture<
  TextRangeViewModelFixture,
  TextRangeElementPropertiesFixture
>;

export const browserFixtures = [
  textSegmentBrowserFixture,
  refLabelBrowserFixture,
  bilingualSegmentBrowserFixture,
  textRangeBrowserFixture,
] as const;
