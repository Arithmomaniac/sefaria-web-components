import { createSefariaClient, type SefariaClient } from "@sefaria/client";
import "@sefaria/components";
import type {
  SefariaTextSegment,
  TextSegmentRequest,
  TextSegmentViewModel,
} from "@sefaria/components";
import { loadTextSegmentViewModel } from "@sefaria/components/text-segment";

import { startLiveDemo, requireNamedInput } from "../../live-demo-core.js";

/** One host-owned text-segment request operation. */
export type TextSegmentLoader = (
  request: TextSegmentRequest,
  signal: AbortSignal,
) => Promise<TextSegmentViewModel>;

/** Controls the interactive live text-segment demonstration. */
export interface TextSegmentLiveDemo {
  /** Loads the current form values. */
  readonly loadCurrentRequest: () => Promise<void>;
}

/** Connects the demo form and presets to the production text-segment factory. */
export function startTextSegmentLiveDemo(
  root: Document,
  loader: TextSegmentLoader = createDefaultLoader(),
): TextSegmentLiveDemo {
  return startLiveDemo(root, {
    title: "Live text-segment demo",
    description:
      "This page calls the deployed Sefaria API and supplies each result to the request-free Web Component.",
    requestHeading: "Choose a request",
    presetsLabel: "Example requests",
    controls: [
      {
        kind: "text",
        name: "tref",
        label: "Sefaria reference",
        value: "Genesis 1:1",
        required: true,
      },
      {
        kind: "text",
        name: "language",
        label: "Language",
        value: "hebrew",
        required: true,
      },
      {
        kind: "text",
        name: "versionTitle",
        label: "Exact version title",
        value: "",
        placeholder: "Optional exact version title",
      },
    ],
    presets: [
      {
        id: "hebrew",
        label: "Hebrew segment",
        values: { tref: "Genesis 1:1", language: "hebrew", versionTitle: "" },
      },
      {
        id: "english-footnote",
        label: "English static footnote",
        values: {
          tref: "Genesis 1:1",
          language: "english",
          versionTitle:
            "The Contemporary Torah, Jewish Publication Society, 2006",
        },
      },
      {
        id: "hebrew-markup",
        label: "Retained Hebrew markup",
        values: {
          tref: "Obadiah 1:1",
          language: "hebrew",
          versionTitle: "Miqra according to the Masorah",
        },
      },
      {
        id: "missing",
        label: "Missing language",
        values: { tref: "Genesis 1:1", language: "klingon", versionTitle: "" },
      },
      {
        id: "range",
        label: "Wrong granularity",
        values: { tref: "Genesis 1", language: "hebrew", versionTitle: "" },
      },
    ],
    submitLabel: "Load from Sefaria",
    createResultElement: (document) =>
      document.createElement("sefaria-text-segment") as SefariaTextSegment,
    loader,
    createRequest: (form) =>
      createRequest(
        requireNamedInput(form, "tref").value,
        requireNamedInput(form, "language").value,
        requireNamedInput(form, "versionTitle").value,
      ),
    createLoadingViewModel: (request): TextSegmentViewModel => ({
      state: "loading",
      message: `Loading ${request.tref}.`,
    }),
    setViewModel: (result, viewModel) => {
      result.viewModel = viewModel;
    },
    formatRequest,
  });
}

function createDefaultLoader(): TextSegmentLoader {
  const client: SefariaClient = createSefariaClient();
  return async (request, signal) =>
    await loadTextSegmentViewModel(request, client, signal);
}

function createRequest(
  tref: string,
  language: string,
  versionTitle: string,
): TextSegmentRequest {
  const trimmedVersionTitle = versionTitle.trim();
  return {
    tref: tref.trim(),
    version:
      trimmedVersionTitle.length === 0
        ? { language: language.trim() }
        : {
            language: language.trim(),
            versionTitle: trimmedVersionTitle,
          },
  };
}

function formatRequest(request: TextSegmentRequest): string {
  const version =
    request.version.versionTitle === undefined
      ? request.version.language
      : `${request.version.language} | ${request.version.versionTitle}`;
  return `${request.tref} (${version})`;
}
