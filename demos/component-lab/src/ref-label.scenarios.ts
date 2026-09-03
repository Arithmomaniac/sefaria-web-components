import type { RefLabelViewModel } from "@sefaria/components";

export interface RefLabelScenario {
  readonly id: "data" | "loading" | "empty" | "error";
  readonly title: string;
  readonly viewModel: RefLabelViewModel;
}

export const refLabelDataScenario = {
  id: "data",
  title: "Reference label data",
  viewModel: {
    state: "data",
    normalized: "Rashi on Genesis 1:1:1",
    hebrew: 'רש"י על בראשית א׳:א׳:א׳',
    urlRef: "Rashi_on_Genesis.1.1.1",
    url: "https://www.sefaria.org/Rashi_on_Genesis.1.1.1",
    indexTitle: "Rashi on Genesis",
    nodeType: "JaggedArrayNode",
  },
} satisfies RefLabelScenario;

export const refLabelLoadingScenario = {
  id: "loading",
  title: "Reference label loading",
  viewModel: {
    state: "loading",
    message: "Loading Genesis 1:1.",
  },
} satisfies RefLabelScenario;

export const refLabelEmptyScenario = {
  id: "empty",
  title: "Reference label empty",
  viewModel: {
    state: "empty",
    tref: "not a reference",
    message: '"not a reference" is not a recognized Sefaria reference.',
  },
} satisfies RefLabelScenario;

export const refLabelErrorScenario = {
  id: "error",
  title: "Reference label error",
  viewModel: {
    state: "error",
    errorKind: "http",
    status: 404,
    message: "The reference could not be resolved.",
  },
} satisfies RefLabelScenario;

export const refLabelScenarios: readonly RefLabelScenario[] = [
  refLabelDataScenario,
  refLabelLoadingScenario,
  refLabelEmptyScenario,
  refLabelErrorScenario,
];
