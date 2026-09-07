import { createSefariaClient, type SefariaClient } from "@sefaria/client";
import { bindReaderController, type SefariaReader } from "@sefaria/components";
import {
  loadReaderController,
  type ReaderController,
  type ReaderControllerSnapshot,
} from "@sefaria/components/reader-controller";

/** Browser controls exposed for qualification of the supported reader path. */
export interface ControlledReaderDemo {
  /** Opens a new root reference through the public controller async factory. */
  readonly navigate: (targetRef: string) => Promise<void>;
  /** Removes host listeners and disposes controller-owned work. */
  readonly dispose: () => void;
}

/** Starts the ordinary-website demonstration of the supported reader API. */
export function startControlledReader(
  root: Document,
  client: SefariaClient = createSefariaClient(),
): ControlledReaderDemo {
  const form = requireElement<HTMLFormElement>(root, "#reader-form");
  const tref = requireInput(form, "tref");
  const status = requireElement<HTMLElement>(root, "#status");
  const hostError = requireElement<HTMLElement>(root, "#host-error");
  const workspace = requireElement<HTMLElement>(root, "#workspace");
  const reader = document.createElement("sefaria-reader") as SefariaReader;
  workspace.dataset.surface = "reader";
  workspace.replaceChildren(reader);

  let controller: ReaderController | undefined;
  let unbind: (() => void) | undefined;
  let unsubscribeStatus: (() => void) | undefined;
  let initialization: AbortController | undefined;
  let generation = 0;

  const clearError = (): void => {
    hostError.hidden = true;
    hostError.textContent = "";
  };

  const showError = (error: unknown): void => {
    hostError.hidden = false;
    hostError.textContent =
      error instanceof Error ? error.message : String(error);
  };

  const renderStatus = (snapshot: ReaderControllerSnapshot): void => {
    switch (snapshot.task.state) {
      case "idle":
        status.textContent = `Showing ${snapshot.reader.label}.`;
        clearError();
        break;
      case "loading-source":
        status.textContent = `Opening ${snapshot.task.targetRef}.`;
        break;
      case "loading-connections":
        status.textContent = `Loading connections for ${snapshot.task.request.tref}.`;
        break;
      case "error":
        status.textContent = `${snapshot.reader.label} remains open.`;
        showError(snapshot.task.message);
        break;
    }
  };

  const releaseController = (): void => {
    unsubscribeStatus?.();
    unsubscribeStatus = undefined;
    unbind?.();
    unbind = undefined;
    controller?.dispose();
    controller = undefined;
  };

  const navigate = async (targetRef: string): Promise<void> => {
    initialization?.abort();
    initialization = new AbortController();
    const currentInitialization = initialization;
    const currentGeneration = ++generation;
    releaseController();
    reader.viewModel = undefined;
    clearError();
    const normalized = targetRef.trim();
    status.textContent = `Opening ${normalized}.`;
    try {
      const next = await loadReaderController({ tref: normalized }, client, {
        signal: currentInitialization.signal,
      });
      if (
        currentInitialization.signal.aborted ||
        currentGeneration !== generation
      ) {
        next.dispose();
        return;
      }
      controller = next;
      unbind = bindReaderController(reader, next);
      unsubscribeStatus = next.subscribe(renderStatus);
      tref.value = normalized;
    } catch (error) {
      if (
        !currentInitialization.signal.aborted &&
        currentGeneration === generation
      ) {
        status.textContent = `${normalized} could not be opened.`;
        showError(error);
      }
    }
  };

  const onSubmit = (event: SubmitEvent): void => {
    event.preventDefault();
    void navigate(tref.value);
  };
  form.addEventListener("submit", onSubmit);

  return {
    navigate,
    dispose: () => {
      initialization?.abort();
      generation += 1;
      releaseController();
      form.removeEventListener("submit", onSubmit);
      workspace.replaceChildren();
    },
  };
}

function requireInput(form: HTMLFormElement, name: string): HTMLInputElement {
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
  if (!element) throw new Error(`The controlled reader requires ${selector}.`);
  return element;
}
