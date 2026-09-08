import type { ConnectionsViewModel } from "@sefaria/components";

/** One authored state for request-free connections-panel development. */
export interface ConnectionsPanelScenario {
  /** Stable scenario identity. */
  readonly id:
    "summary" | "details" | "metadata-only" | "loading" | "empty" | "error";
  /** Visible scenario heading. */
  readonly title: string;
  /** Complete panel rendering state. */
  readonly viewModel: ConnectionsViewModel;
}

const categories = [
  { id: "Commentary", count: 21 },
  { id: "Targum", count: 1 },
] as const;

const summary = {
  state: "data",
  reference: "Genesis 1:1",
  categories,
  category: null,
  entries: [],
  total: 22,
  page: 0,
  pageSize: 20,
  previewsIncluded: true,
} as const;

export const connectionsSummaryScenario = {
  id: "summary",
  title: "Category summary",
  viewModel: summary,
} satisfies ConnectionsPanelScenario;

export const connectionsDetailsScenario = {
  id: "details",
  title: "Detail page with partial preview",
  viewModel: {
    ...summary,
    category: "Commentary",
    total: 21,
    entries: [
      {
        id: "rashi",
        targetRef: "Rashi on Genesis 1:1:1",
        hebrewRef: "רש״י על בראשית א׳:א׳:א׳",
        book: "Rashi on Genesis",
        preview: {
          state: "available",
          english: {
            html: "<b>IN THE BEGINNING</b> — Rabbi Isaac said...",
            text: "IN THE BEGINNING — Rabbi Isaac said...",
            truncated: true,
          },
          hebrew: null,
        },
        editions: ["Pentateuch with Rashi's commentary"],
        licenses: ["Public Domain"],
      },
    ],
  },
} satisfies ConnectionsPanelScenario;

export const connectionsMetadataScenario = {
  id: "metadata-only",
  title: "Labels only",
  viewModel: {
    ...connectionsDetailsScenario.viewModel,
    previewsIncluded: false,
    entries: connectionsDetailsScenario.viewModel.entries.map((entry) => ({
      ...entry,
      preview: { state: "not-requested" as const },
    })),
  },
} satisfies ConnectionsPanelScenario;

export const connectionsLoadingScenario = {
  id: "loading",
  title: "Loading connections",
  viewModel: { state: "loading", message: "Loading Genesis 1:1 connections." },
} satisfies ConnectionsPanelScenario;

export const connectionsEmptyScenario = {
  id: "empty",
  title: "No text connections",
  viewModel: { state: "empty", message: "No text connections were returned." },
} satisfies ConnectionsPanelScenario;

export const connectionsErrorScenario = {
  id: "error",
  title: "Connections error",
  viewModel: {
    state: "error",
    errorKind: "projection",
    message: "Conflicting connections share one identity.",
  },
} satisfies ConnectionsPanelScenario;

/** All important connections-panel states rendered by the component lab. */
export const connectionsPanelScenarios: readonly ConnectionsPanelScenario[] = [
  connectionsSummaryScenario,
  connectionsDetailsScenario,
  connectionsMetadataScenario,
  connectionsLoadingScenario,
  connectionsEmptyScenario,
  connectionsErrorScenario,
];
