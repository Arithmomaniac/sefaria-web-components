import type { SourceCardViewModel } from "@sefaria/components";

import { primarySide, translationSide } from "./bilingual-segment.scenarios.js";

export interface SourceCardScenario {
  readonly id:
    | "one-item"
    | "many-items"
    | "hidden-addresses"
    | "one-sided"
    | "loading"
    | "empty"
    | "error";
  readonly title: string;
  readonly viewModel: SourceCardViewModel;
  readonly selectable?: boolean;
  readonly selectedPosition?: readonly number[];
  readonly showAddressLabels?: boolean;
}

const header = {
  ref: "Genesis 1:1-3",
  heRef: "בראשית א׳:א׳-ג׳",
  indexTitle: "Genesis",
  heIndexTitle: "בראשית",
  primaryCategory: "Tanakh",
  categories: ["Tanakh", "Torah"],
} as const;

const attributions = [
  {
    side: "primary",
    versionTitle: "Component lab source edition",
    versionSource: "Authored demonstration data",
    versionSourceUrl: null,
  },
  {
    side: "translation",
    versionTitle: "Component lab translation edition",
    versionSource: "Authored demonstration data",
    versionSourceUrl: null,
  },
] as const;

const dataPair = {
  state: "data",
  primary: primarySide,
  translation: translationSide,
} as const;

export const sourceCardOneItemScenario = {
  id: "one-item",
  title: "One-item source card",
  viewModel: {
    state: "data",
    header: { ...header, ref: "Genesis 1:1", heRef: "בראשית א׳:א׳" },
    attributions,
    items: [{ position: [], pair: dataPair }],
  },
} satisfies SourceCardScenario;

export const sourceCardManyItemsScenario = {
  id: "many-items",
  title: "Multi-item source card",
  selectable: true,
  selectedPosition: [1],
  viewModel: {
    state: "data",
    header,
    attributions,
    navigation: {
      state: "available",
      sectionRef: "Genesis 1",
      firstRef: "Genesis 1:1",
    },
    items: [
      {
        position: [0],
        ref: "Genesis 1:1",
        addressLabel: "1",
        pair: dataPair,
      },
      {
        position: [1],
        ref: "Genesis 1:2",
        addressLabel: "2",
        pair: dataPair,
      },
      {
        position: [2],
        ref: "Genesis 1:3",
        addressLabel: "3",
        pair: dataPair,
      },
    ],
  },
} satisfies SourceCardScenario;

export const sourceCardHiddenAddressesScenario = {
  ...sourceCardManyItemsScenario,
  id: "hidden-addresses",
  title: "Selectable source card without visible labels",
  showAddressLabels: false,
} satisfies SourceCardScenario;

export const sourceCardOneSidedScenario = {
  id: "one-sided",
  title: "One-sided source card",
  viewModel: {
    state: "data",
    header,
    attributions: [attributions[0]],
    items: [
      {
        position: [0],
        pair: {
          state: "partial",
          present: { side: "primary", view: primarySide },
          absent: {
            side: "translation",
            message: "No translation is available.",
          },
        },
      },
    ],
  },
} satisfies SourceCardScenario;

export const sourceCardLoadingScenario = {
  id: "loading",
  title: "Loading source card",
  viewModel: { state: "loading", message: "Loading Genesis 1:1-3." },
} satisfies SourceCardScenario;

export const sourceCardEmptyScenario = {
  id: "empty",
  title: "Empty source card",
  viewModel: {
    state: "empty",
    header,
    attributions,
    absent: [
      { side: "primary", message: "No primary text is available." },
      { side: "translation", message: "No translation is available." },
    ],
  },
} satisfies SourceCardScenario;

export const sourceCardErrorScenario = {
  id: "error",
  title: "Source-card error",
  viewModel: {
    state: "error",
    errorKind: "projection",
    message: "The two sides disagree structurally.",
  },
} satisfies SourceCardScenario;

export const sourceCardScenarios: readonly SourceCardScenario[] = [
  sourceCardOneItemScenario,
  sourceCardManyItemsScenario,
  sourceCardHiddenAddressesScenario,
  sourceCardOneSidedScenario,
  sourceCardLoadingScenario,
  sourceCardEmptyScenario,
  sourceCardErrorScenario,
];
