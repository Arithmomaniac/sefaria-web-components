import { createSefariaClient, type SefariaClient } from "@sefaria/client";
import "@sefaria/components";
import type {
  RefLabelLanguage,
  RefLabelRequest,
  RefLabelViewModel,
  SefariaRefLabel,
} from "@sefaria/components";
import { loadRefLabelViewModel } from "@sefaria/components/ref-label";

import {
  startLiveDemo,
  requireNamedInput,
  requireNamedSelect,
} from "../../live-demo-core.js";

/** One host-owned reference-label request operation. */
export type RefLabelLoader = (
  request: RefLabelRequest,
  signal: AbortSignal,
) => Promise<RefLabelViewModel>;

/** Controls the interactive live reference-label demonstration. */
export interface RefLabelLiveDemo {
  /** Loads the current form values. */
  readonly loadCurrentRequest: () => Promise<void>;
}

/** Connects the demo controls to the production reference-label factory. */
export function startRefLabelLiveDemo(
  root: Document,
  loader: RefLabelLoader = createDefaultLoader(),
): RefLabelLiveDemo {
  return startLiveDemo(root, {
    title: "Live reference-label demo",
    description:
      "The host calls the deployed Sefaria API and supplies the result to a request-free Web Component.",
    requestHeading: "Choose a reference",
    presetsLabel: "Example references",
    controls: [
      {
        kind: "text",
        name: "tref",
        label: "Sefaria reference",
        value: "Genesis 1:1",
        required: true,
      },
      {
        kind: "select",
        name: "labelLanguage",
        label: "Label language",
        value: "both",
        options: [
          { value: "english", label: "English" },
          { value: "hebrew", label: "Hebrew" },
          { value: "both", label: "Both" },
        ],
      },
      {
        kind: "checkbox",
        name: "linked",
        label: "Link behavior",
        description: "Render a canonical link",
        checked: true,
      },
    ],
    presets: [
      {
        id: "segment",
        label: "Segment",
        values: { tref: "Genesis 1:1" },
      },
      {
        id: "range",
        label: "Range",
        values: { tref: "Genesis 1:1-3" },
      },
      {
        id: "spanning",
        label: "Spanning range",
        values: { tref: "Genesis 1:31-2:2" },
      },
      {
        id: "commentary",
        label: "Commentary",
        values: { tref: "Rashi on Genesis 1:1:1" },
      },
      {
        id: "empty",
        label: "Unresolvable",
        values: { tref: "__missing_ref_label_probe__" },
      },
    ],
    submitLabel: "Load from Sefaria",
    createResultElement: (document) =>
      document.createElement("sefaria-ref-label") as SefariaRefLabel,
    loader,
    createRequest: (form) => ({
      tref: requireNamedInput(form, "tref").value.trim(),
    }),
    createLoadingViewModel: (request): RefLabelViewModel => ({
      state: "loading",
      message: `Loading ${request.tref}.`,
    }),
    setViewModel: (result, viewModel) => {
      result.viewModel = viewModel;
    },
    formatRequest: (request) => request.tref,
    configureResult: (result, form) => {
      result.labelLanguage = requireLabelLanguage(
        requireNamedSelect(form, "labelLanguage").value,
      );
      result.linked = requireNamedInput(form, "linked").checked;
    },
  });
}

function createDefaultLoader(): RefLabelLoader {
  const client: SefariaClient = createSefariaClient();
  return async (request, signal) =>
    await loadRefLabelViewModel(request, client, signal);
}

function requireLabelLanguage(value: string): RefLabelLanguage {
  if (value === "english" || value === "hebrew" || value === "both") {
    return value;
  }
  throw new TypeError(`Unsupported label language "${value}".`);
}
