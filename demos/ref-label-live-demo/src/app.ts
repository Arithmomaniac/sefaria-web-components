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
  createLiveDemoRunner,
  requireElement,
  requireNamedInput,
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
  const form = requireElement<HTMLFormElement>(root, "#ref-request-form");
  const trefInput = requireNamedInput(form, "tref");
  const languageInput = requireNamedSelect(form, "labelLanguage");
  const linkedInput = requireNamedInput(form, "linked");
  const submitButton = requireElement<HTMLButtonElement>(
    form,
    'button[type="submit"]',
  );
  const requestState = requireElement<HTMLElement>(root, "#request-state");
  const hostError = requireElement<HTMLElement>(root, "#host-error");
  const result = requireElement<SefariaRefLabel>(root, "#ref-result");
  const runner = createLiveDemoRunner({
    loader,
    createLoadingViewModel: (request): RefLabelViewModel => ({
      state: "loading",
      message: `Loading ${request.tref}.`,
    }),
    setViewModel: (viewModel) => {
      result.viewModel = viewModel;
    },
    formatRequest: (request) => request.tref,
    requestState,
    hostError,
    submitButton,
  });

  const loadCurrentRequest = async (): Promise<void> => {
    const request = { tref: trefInput.value.trim() };

    result.labelLanguage = requireLabelLanguage(languageInput.value);
    result.linked = linkedInput.checked;
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
      form.requestSubmit();
    });
  }

  languageInput.addEventListener("change", () => {
    result.labelLanguage = requireLabelLanguage(languageInput.value);
  });
  linkedInput.addEventListener("change", () => {
    result.linked = linkedInput.checked;
  });

  return { loadCurrentRequest };
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

function requireNamedSelect(
  form: HTMLFormElement,
  name: string,
): HTMLSelectElement {
  const select = form.elements.namedItem(name);
  if (!(select instanceof HTMLSelectElement)) {
    throw new Error(`The ${name} select is missing.`);
  }
  return select;
}
