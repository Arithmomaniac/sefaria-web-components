import { createSefariaClient, type SefariaClient } from "@sefaria/client";
import "@sefaria/components";
import type {
  SefariaTextSegment,
  TextSegmentRequest,
  TextSegmentViewModel,
} from "@sefaria/components";
import { loadTextSegmentViewModel } from "@sefaria/components/text-segment";

import {
  createLiveDemoRunner,
  requireElement,
  requireNamedInput,
} from "../../live-demo-core.js";

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
  const form = requireElement<HTMLFormElement>(root, "#text-request-form");
  const trefInput = requireNamedInput(form, "tref");
  const languageInput = requireNamedInput(form, "language");
  const versionTitleInput = requireNamedInput(form, "versionTitle");
  const submitButton = requireElement<HTMLButtonElement>(
    form,
    'button[type="submit"]',
  );
  const requestState = requireElement<HTMLElement>(root, "#request-state");
  const hostError = requireElement<HTMLElement>(root, "#host-error");
  const result = requireElement<SefariaTextSegment>(root, "#text-result");
  const runner = createLiveDemoRunner({
    loader,
    createLoadingViewModel: (request): TextSegmentViewModel => ({
      state: "loading",
      message: `Loading ${request.tref}.`,
    }),
    setViewModel: (viewModel) => {
      result.viewModel = viewModel;
    },
    formatRequest,
    requestState,
    hostError,
    submitButton,
  });

  const loadCurrentRequest = async (): Promise<void> => {
    const request = createRequest(
      trefInput.value,
      languageInput.value,
      versionTitleInput.value,
    );
    await runner.run(request);
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    void loadCurrentRequest();
  });

  for (const preset of root.querySelectorAll<HTMLButtonElement>(
    "[data-demo-request]",
  )) {
    preset.addEventListener("click", () => {
      trefInput.value = preset.dataset.tref ?? "";
      languageInput.value = preset.dataset.language ?? "";
      versionTitleInput.value = preset.dataset.versionTitle ?? "";
      form.requestSubmit();
    });
  }

  return { loadCurrentRequest };
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
