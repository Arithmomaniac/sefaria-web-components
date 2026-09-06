import { createSefariaClient } from "@sefaria/client";

import { detectReferences } from "./detection.js";
import { removeOwnedLinks, wrapDetectedReferences } from "./dom.js";
import { extractArticleSnapshot } from "./extract.js";
import { PopupController } from "./popup-controller.js";
import type { LinkerOptions, LinkerResult, SefariaLinkerApi } from "./types.js";

const VERSION = "0.1.0";
let activeScan: AbortController | undefined;
let popup: PopupController | undefined;
let operation = 0;

async function link(options: LinkerOptions = {}): Promise<LinkerResult> {
  activeScan?.abort();
  popup?.destroy();
  popup = undefined;
  activeScan = new AbortController();
  const current = ++operation;
  const signal =
    options.signal === undefined
      ? activeScan.signal
      : AbortSignal.any([options.signal, activeScan.signal]);
  removeOwnedLinks();
  const snapshot = extractArticleSnapshot(document, options);
  if (snapshot.body.trim().length === 0) {
    throw new Error("The page has no eligible article text.");
  }
  const client =
    options.client ??
    createSefariaClient({
      ...(options.baseUrl === undefined ? {} : { baseUrl: options.baseUrl }),
    });
  const result = await detectReferences(
    { title: snapshot.title, body: snapshot.body },
    client,
    signal,
  );
  if (current !== operation || signal.aborted) {
    throw signal.reason ?? new DOMException("Scan superseded.", "AbortError");
  }
  const wrapped = wrapDetectedReferences(
    snapshot,
    result.body.results,
    result.body.refData,
  );
  popup = new PopupController(client);
  for (const citation of wrapped.citations) {
    for (const element of citation.elements) {
      element.addEventListener("click", (event) => {
        event.preventDefault();
        void popup?.open(element, citation.target);
      });
    }
  }
  window.dispatchEvent(
    new CustomEvent("sefaria-linker-complete", {
      detail: { linked: wrapped.citations.length, skipped: wrapped.skipped },
    }),
  );
  return {
    state: "complete",
    linked: wrapped.citations.length,
    skipped: wrapped.skipped,
  };
}

function destroy(): void {
  activeScan?.abort();
  activeScan = undefined;
  operation += 1;
  popup?.destroy();
  popup = undefined;
  removeOwnedLinks();
}

const api: SefariaLinkerApi = { version: VERSION, link, destroy };
const existing = window.SefariaLinker;
if (existing === undefined) {
  window.SefariaLinker = api;
  window.dispatchEvent(new CustomEvent("sefaria-linker-ready"));
} else if (existing.version === VERSION) {
  void existing.link().catch(reportInvocationError);
} else {
  throw new Error(
    `SefariaLinker ${existing.version} is already loaded; refusing to replace it with ${VERSION}.`,
  );
}

function reportInvocationError(error: unknown): void {
  if (error instanceof DOMException && error.name === "AbortError") {
    return;
  }
  const message = error instanceof Error ? error.message : String(error);
  window.alert(`Sefaria Linker: ${message}`);
}

declare global {
  interface Window {
    SefariaLinker?: SefariaLinkerApi;
  }
}

export type { LinkerOptions, LinkerResult, SefariaLinkerApi } from "./types.js";
