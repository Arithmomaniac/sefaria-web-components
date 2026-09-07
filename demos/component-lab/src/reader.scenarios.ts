import type { ReaderViewModel } from "@sefaria/components";

/** One authored state for request-free reader development. */
export interface ReaderScenario {
  /** Stable scenario identity. */
  readonly id:
    | "paired"
    | "source-only"
    | "connections-only"
    | "connections-loading"
    | "connections-unavailable"
    | "truncated-history";
  /** Visible scenario heading. */
  readonly title: string;
  /** Complete reader rendering state. */
  readonly viewModel: ReaderViewModel;
  /** Compact pane selected by the host. */
  readonly activePane?: "source" | "connections";
  /** Whether the host offers explicit chat export. */
  readonly chatExport?: boolean;
}

const primary = {
  state: "data",
  ref: "Micah 6:8",
  heRef: "מיכה ו׳:ח׳",
  language: "he",
  actualLanguage: "he",
  direction: "rtl",
  body: [
    {
      kind: "html",
      html: "הִגִּיד לְךָ אָדָם מַה טּוֹב וּמָה יְהוָה דּוֹרֵשׁ מִמְּךָ",
    },
  ],
  notes: [],
} as const;

const translation = {
  state: "data",
  ref: "Micah 6:8",
  heRef: "מיכה ו׳:ח׳",
  language: "en",
  actualLanguage: "en",
  direction: "ltr",
  body: [
    {
      kind: "html",
      html: "You have been told what is good and what the Eternal requires of you.",
    },
  ],
  notes: [],
} as const;

const source = {
  viewModel: {
    state: "data",
    header: {
      ref: "Micah 6:8",
      heRef: "מיכה ו׳:ח׳",
      indexTitle: "Micah",
      heIndexTitle: "מיכה",
      primaryCategory: "Tanakh",
      categories: ["Tanakh", "Prophets"],
    },
    attributions: [],
    items: [
      {
        position: [0],
        ref: "Micah 6:8",
        addressLabel: "8",
        pair: { state: "data", primary, translation },
      },
    ],
  },
  selectedPosition: [0],
  contentLanguage: "both",
  layout: "auto",
  sideOrder: "primary-first",
} as const;

const connections = {
  state: "component",
  showPreviews: true,
  viewModel: {
    state: "data",
    reference: "Micah 6:8",
    categories: [
      { id: "Commentary", count: 2 },
      { id: "Targum", count: 1 },
    ],
    category: "Commentary",
    entries: [
      {
        id: "rashi-micah-6-8",
        targetRef: "Rashi on Micah 6:8",
        hebrewRef: "רש״י על מיכה ו׳:ח׳",
        book: "Rashi on Micah",
        preview: {
          state: "available",
          english: {
            html: "The prophet explains the path of justice and humility.",
            text: "The prophet explains the path of justice and humility.",
            truncated: false,
          },
          hebrew: null,
        },
        editions: [],
        licenses: [],
      },
    ],
    total: 2,
    page: 0,
    pageSize: 20,
    previewsIncluded: true,
  },
} as const;

const base = {
  currentEntryId: "entry-micah",
  label: "Micah 6:8",
  breadcrumbs: [
    { entryId: "entry-isaiah", label: "Isaiah 1:17", current: false },
    { entryId: "entry-micah", label: "Micah 6:8", current: true },
  ],
  canGoBack: true,
  historyTruncated: false,
  selectedTarget: { ref: "Micah 6:8" },
} as const;

export const readerPairedScenario = {
  id: "paired",
  title: "Paired text and connections",
  viewModel: { ...base, source, connections },
  chatExport: true,
} satisfies ReaderScenario;

export const readerSourceOnlyScenario = {
  id: "source-only",
  title: "Source only",
  viewModel: { ...base, source },
} satisfies ReaderScenario;

export const readerConnectionsOnlyScenario = {
  id: "connections-only",
  title: "Connections only",
  activePane: "connections",
  viewModel: { ...base, connections },
} satisfies ReaderScenario;

export const readerConnectionsLoadingScenario = {
  id: "connections-loading",
  title: "Connections loading",
  viewModel: {
    ...base,
    source,
    connections: {
      state: "component",
      viewModel: {
        state: "loading",
        message: "Loading connections for Micah 6:8.",
      },
      showPreviews: false,
    },
  },
} satisfies ReaderScenario;

export const readerConnectionsUnavailableScenario = {
  id: "connections-unavailable",
  title: "Connections interrupted",
  viewModel: {
    ...base,
    source,
    connections: {
      state: "unavailable",
      reason: "interrupted",
      message: "Connections loading was interrupted by later navigation.",
    },
  },
} satisfies ReaderScenario;

export const readerTruncatedHistoryScenario = {
  id: "truncated-history",
  title: "Truncated retained history",
  viewModel: {
    ...base,
    historyTruncated: true,
    source,
    connections,
  },
} satisfies ReaderScenario;

/** All important reader states rendered by the component lab. */
export const readerScenarios: readonly ReaderScenario[] = [
  readerPairedScenario,
  readerSourceOnlyScenario,
  readerConnectionsOnlyScenario,
  readerConnectionsLoadingScenario,
  readerConnectionsUnavailableScenario,
  readerTruncatedHistoryScenario,
];
