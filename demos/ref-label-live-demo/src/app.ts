import { createSefariaClient, type SefariaClient } from "@sefaria/client";
import "@sefaria/components";
import type {
  RefLabelLanguage,
  RefLabelRequest,
  RefLabelViewModel,
  SefariaRefLabel,
} from "@sefaria/components";
import { loadRefLabelViewModel } from "@sefaria/components/ref-label";

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
  let activeController: AbortController | undefined;
  let activeOperation = 0;

  const loadCurrentRequest = async (): Promise<void> => {
    activeController?.abort();
    const controller = new AbortController();
    activeController = controller;
    const operation = ++activeOperation;
    const request = { tref: trefInput.value.trim() };

    result.labelLanguage = requireLabelLanguage(languageInput.value);
    result.linked = linkedInput.checked;
    result.viewModel = {
      state: "loading",
      message: `Loading ${request.tref}.`,
    };
    requestState.dataset.state = "loading";
    requestState.textContent = `Loading ${request.tref} from Sefaria.`;
    hostError.hidden = true;
    hostError.textContent = "";
    submitButton.disabled = true;

    try {
      const viewModel = await loader(request, controller.signal);
      if (operation !== activeOperation) {
        return;
      }
      result.viewModel = viewModel;
      requestState.dataset.state = viewModel.state;
      requestState.textContent = `${request.tref} produced ${viewModel.state}.`;
    } catch (error) {
      if (controller.signal.aborted || operation !== activeOperation) {
        return;
      }
      requestState.dataset.state = "error";
      requestState.textContent = `${request.tref} could not complete.`;
      hostError.hidden = false;
      hostError.textContent =
        error instanceof Error ? error.message : String(error);
    } finally {
      if (operation === activeOperation) {
        submitButton.disabled = false;
      }
    }
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

function requireNamedInput(
  form: HTMLFormElement,
  name: string,
): HTMLInputElement {
  const input = form.elements.namedItem(name);
  if (!(input instanceof HTMLInputElement)) {
    throw new Error(`The ${name} input is missing.`);
  }
  return input;
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

function requireElement<T extends Element>(
  root: ParentNode,
  selector: string,
): T {
  const element = root.querySelector<T>(selector);
  if (!element) {
    throw new Error(`The demo requires ${selector}.`);
  }
  return element;
}
