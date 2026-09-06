import { createSefariaClient, type SefariaClient } from "@sefaria/client";
import "@sefaria/components";
import type { PopupLoadingViewModel, SefariaPopup } from "@sefaria/components";
import { loadPopupViewModel } from "@sefaria/components/popup";

import type { CitationTarget } from "./types.js";

export class PopupController {
  readonly #client: SefariaClient;
  readonly #popup: SefariaPopup;
  #request: AbortController | undefined;
  #operation = 0;

  constructor(client = createSefariaClient()) {
    this.#client = client;
    this.#popup = document.createElement("sefaria-popup");
    this.#popup.id = "sefaria-linker-popup";
    this.#popup.addEventListener("sefaria-popup-close", () => this.close());
    document.body.append(this.#popup);
  }

  async open(anchor: HTMLAnchorElement, target: CitationTarget): Promise<void> {
    this.#request?.abort();
    const request = new AbortController();
    this.#request = request;
    const operation = ++this.#operation;
    const loading: PopupLoadingViewModel = {
      state: "loading",
      message: `Loading ${target.tref}.`,
    };
    this.#popup.anchor = anchor;
    this.#popup.viewModel = loading;
    this.#popup.open = true;
    try {
      const viewModel = await loadPopupViewModel(
        { tref: target.tref },
        this.#client,
        request.signal,
      );
      if (operation === this.#operation && !request.signal.aborted) {
        this.#popup.viewModel = viewModel;
      }
    } catch (error) {
      if (
        operation === this.#operation &&
        !request.signal.aborted &&
        error instanceof Error
      ) {
        this.#popup.viewModel = {
          state: "error",
          errorKind: "projection",
          message: error.message,
        };
      }
    }
  }

  close(): void {
    this.#request?.abort();
    this.#request = undefined;
    this.#operation += 1;
    this.#popup.open = false;
  }

  destroy(): void {
    this.close();
    this.#popup.remove();
  }
}
