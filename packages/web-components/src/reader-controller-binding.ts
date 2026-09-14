import type { ReaderPane } from "./reader.js";
import type {
  ReaderController,
  ReaderControllerSnapshot,
} from "./reader-controller.js";
import type { SefariaReader } from "./reader-element.js";

/** Binds one stateful reader controller to one persistent request-free element. */
export function bindReaderController(
  element: SefariaReader,
  controller: ReaderController,
): () => void {
  let activePane: ReaderPane = "source";
  let currentEntryId: string | undefined;
  const render = (snapshot: ReaderControllerSnapshot): void => {
    if (
      currentEntryId !== undefined &&
      currentEntryId !== snapshot.reader.currentEntryId
    ) {
      activePane = "source";
    }
    currentEntryId = snapshot.reader.currentEntryId;
    element.viewModel = snapshot.reader;
    element.activePane = activePane;
  };
  const onBack = (event: Event): void => {
    controller.back(readerDetail(event));
  };
  const onHistory = (event: Event): void => {
    controller.activateHistory(
      readerDetail<{ readonly entryId: string }>(event),
    );
  };
  const onPane = (event: Event): void => {
    const detail = readerDetail<{ readonly pane: ReaderPane }>(event);
    activePane = detail.pane;
    element.activePane = activePane;
  };
  const onSource = (event: Event): void => {
    observe(
      controller.selectSource(
        readerDetail<{
          readonly position: readonly number[];
          readonly ref: string;
        }>(event),
      ),
    );
  };
  const onCategory = (event: Event): void => {
    controller.setConnectionsCategory(
      readerDetail<{ readonly category: string | null }>(event),
    );
  };
  const onPage = (event: Event): void => {
    controller.setConnectionsPage(
      readerDetail<{ readonly page: number }>(event),
    );
  };
  const onConnection = (event: Event): void => {
    observe(
      controller.openConnection(
        readerDetail<{ readonly targetRef: string }>(event),
      ),
    );
  };
  const onPreviews = (event: Event): void => {
    observe(controller.requestConnectionPreviews(readerDetail(event)));
  };
  const listeners = [
    ["sefaria-reader-back", onBack],
    ["sefaria-reader-history-activate", onHistory],
    ["sefaria-reader-pane-change", onPane],
    ["sefaria-reader-source-select", onSource],
    ["sefaria-reader-connections-category-change", onCategory],
    ["sefaria-reader-connections-page-change", onPage],
    ["sefaria-reader-connection-select", onConnection],
    ["sefaria-reader-connections-preview-request", onPreviews],
  ] as const;
  for (const [name, listener] of listeners) {
    element.addEventListener(name, listener);
  }
  const unsubscribe = controller.subscribe(render);
  return () => {
    unsubscribe();
    for (const [name, listener] of listeners) {
      element.removeEventListener(name, listener);
    }
  };
}

function readerDetail<T extends object = object>(
  event: Event,
): T & { readonly originEntryId: string } {
  return (event as CustomEvent<T & { readonly originEntryId: string }>).detail;
}

function observe(operation: Promise<void>): void {
  operation.catch((error: unknown) => {
    if (typeof globalThis.reportError === "function") {
      globalThis.reportError(error);
      return;
    }
    console.error(error);
  });
}
