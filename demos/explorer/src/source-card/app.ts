import { createSefariaClient, type SefariaClient } from "@sefaria/client";
import "@sefaria/components";
import type {
  SefariaSourceCard,
  SourceCardRequest,
  SourceCardViewModel,
} from "@sefaria/components";
import { loadSourceCardViewModel } from "@sefaria/components/source-card";

/** One host-owned source-card request operation. */
export type SourceCardLoader = (
  request: SourceCardRequest,
  signal: AbortSignal,
) => Promise<SourceCardViewModel>;

/** Controls the interactive live source-card demonstration. */
export interface SourceCardLiveDemo {
  /** Loads the current form values. */
  readonly loadCurrentRequest: () => Promise<void>;
}

/** Connects the request form, presets, and display controls to the source card. */
export function startSourceCardLiveDemo(
  root: Document,
  loader: SourceCardLoader = createDefaultLoader(),
): SourceCardLiveDemo {
  const form = requireElement<HTMLFormElement>(root, "#source-card-form");
  const trefInput = requireNamedInput(form, "tref");
  const primaryTitleInput = requireNamedInput(form, "primaryVersionTitle");
  const translationTitleInput = requireNamedInput(
    form,
    "translationVersionTitle",
  );
  const submitButton = requireElement<HTMLButtonElement>(
    form,
    'button[type="submit"]',
  );
  const displayForm = requireElement<HTMLFormElement>(root, "#display-form");
  const requestState = requireElement<HTMLElement>(root, "#request-state");
  const hostError = requireElement<HTMLElement>(root, "#host-error");
  const result = requireElement<SefariaSourceCard>(root, "#source-card-result");
  let activeController: AbortController | undefined;
  let activeOperation = 0;

  const applyDisplaySettings = (): void => {
    const values = new FormData(displayForm);
    result.contentLanguage = readContentLanguage(values.get("contentLanguage"));
    result.layout = readLayout(values.get("layout"));
    result.sideOrder = readSideOrder(values.get("sideOrder"));
  };

  const loadCurrentRequest = async (): Promise<void> => {
    activeController?.abort();
    const controller = new AbortController();
    activeController = controller;
    const operation = ++activeOperation;
    const request = createRequest(
      trefInput.value,
      primaryTitleInput.value,
      translationTitleInput.value,
    );

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
      requestState.textContent =
        viewModel.state === "data"
          ? `${request.tref} produced ${viewModel.items.length} items from one request.`
          : `${request.tref} produced ${viewModel.state}.`;
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
  displayForm.addEventListener("change", applyDisplaySettings);
  applyDisplaySettings();

  for (const preset of root.querySelectorAll<HTMLButtonElement>(
    "[data-demo-request]",
  )) {
    preset.addEventListener("click", () => {
      trefInput.value = preset.dataset.tref ?? "";
      primaryTitleInput.value = preset.dataset.primaryVersionTitle ?? "";
      translationTitleInput.value =
        preset.dataset.translationVersionTitle ?? "";
      form.requestSubmit();
    });
  }

  return { loadCurrentRequest };
}

function createDefaultLoader(): SourceCardLoader {
  const client: SefariaClient = createSefariaClient();
  return async (request, signal) =>
    await loadSourceCardViewModel(request, client, signal);
}

function createRequest(
  tref: string,
  primaryVersionTitle: string,
  translationVersionTitle: string,
): SourceCardRequest {
  const primary = primaryVersionTitle.trim();
  const translation = translationVersionTitle.trim();
  return {
    tref: tref.trim(),
    ...(primary.length === 0 ? {} : { primary: { versionTitle: primary } }),
    ...(translation.length === 0
      ? {}
      : { translation: { versionTitle: translation } }),
  };
}

function readContentLanguage(
  value: FormDataEntryValue | null,
): SefariaSourceCard["contentLanguage"] {
  return value === "primary" || value === "translation" ? value : "both";
}

function readLayout(
  value: FormDataEntryValue | null,
): SefariaSourceCard["layout"] {
  return value === "stacked" || value === "side-by-side" ? value : "auto";
}

function readSideOrder(
  value: FormDataEntryValue | null,
): SefariaSourceCard["sideOrder"] {
  return value === "translation-first" ? value : "primary-first";
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
