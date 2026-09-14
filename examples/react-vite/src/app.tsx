import {
  createSefariaClient,
  type CoreV3TextsResponse,
  type SefariaClient,
  zCoreV3TextsResponse,
} from "@sefaria/client";
import "@sefaria/web-components";
import type { SefariaSourceCard } from "@sefaria/web-components";
import {
  createSourceCardViewModel,
  loadSourceCardViewModel,
  type SourceCardViewModel,
} from "@sefaria/web-components/source-card";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";

import payload from "./micah-6-8.json";
import { reactSourceCardSnippet } from "./source-snippet.js";
import { useElementProperty } from "./use-element-property.js";

const suppliedPayload = zCoreV3TextsResponse.parse(
  payload,
) as CoreV3TextsResponse;
const suppliedViewModel = createSourceCardViewModel(suppliedPayload, {
  tref: "Micah 6:8",
});
const loadingViewModel: SourceCardViewModel = {
  state: "loading",
  message: "Loading source text.",
};

interface SourceSelection {
  readonly position: readonly number[];
  readonly ref: string;
}

export interface ReactSourceCardExampleProps {
  readonly client?: SefariaClient;
  readonly initialTref?: string;
}

export function ReactSourceCardExample({
  client: suppliedClient,
  initialTref = "Micah 6:8",
}: ReactSourceCardExampleProps) {
  const [client] = useState(
    () => suppliedClient ?? createSefariaClient({ cache: false }),
  );
  const [tref, setTref] = useState(initialTref);
  const [viewModel, setViewModel] =
    useState<SourceCardViewModel>(suppliedViewModel);
  const [selected, setSelected] = useState<SourceSelection>();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [previewWidth, setPreviewWidth] = useState(720);
  const [contentLanguage, setContentLanguage] = useState<
    "both" | "primary" | "translation"
  >("both");
  const [requestCount, setRequestCount] = useState(0);
  const [requestStatus, setRequestStatus] = useState(
    "Supplied data rendered. No request has run.",
  );
  const [loadFailure, setLoadFailure] = useState<string>();
  const cardRef = useRef<SefariaSourceCard>(null);
  const controller = useRef<AbortController | undefined>(undefined);
  const operation = useRef(0);
  const mounted = useRef(true);

  useElementProperty(cardRef, "viewModel", viewModel);
  useElementProperty(cardRef, "contentLanguage", contentLanguage);
  useElementProperty(cardRef, "selectable", viewModel.state === "data");
  useElementProperty(cardRef, "selectedPosition", selected?.position);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      operation.current += 1;
      controller.current?.abort();
    };
  }, []);

  const setCardRef = useCallback((card: SefariaSourceCard | null): void => {
    const previous = cardRef.current;
    if (previous !== null) {
      previous.removeEventListener("sefaria-source-select", onSourceSelection);
    }
    cardRef.current = card;
    if (card !== null) {
      card.addEventListener("sefaria-source-select", onSourceSelection);
    }
  }, []);

  function onSourceSelection(event: Event): void {
    const detail = (event as CustomEvent<SourceSelection>).detail;
    setSelected({
      position: [...detail.position],
      ref: detail.ref,
    });
  }

  const loadLive = useCallback(async (): Promise<void> => {
    controller.current?.abort();
    const currentController = new AbortController();
    controller.current = currentController;
    const currentOperation = ++operation.current;
    const normalized = tref.trim();
    if (normalized.length === 0) {
      setLoadFailure("Enter a non-blank Sefaria reference.");
      setRequestStatus("No request was made.");
      return;
    }
    setRequestCount((count) => count + 1);
    setSelected(undefined);
    setLoadFailure(undefined);
    setViewModel(loadingViewModel);
    setRequestStatus(`Loading ${normalized} through the public factory.`);
    try {
      const next = await loadSourceCardViewModel(
        { tref: normalized },
        client,
        currentController.signal,
      );
      if (
        mounted.current &&
        !currentController.signal.aborted &&
        currentOperation === operation.current
      ) {
        setLoadFailure(undefined);
        setViewModel(next);
        setRequestStatus(`Loaded ${normalized}.`);
      }
    } catch (error) {
      if (
        mounted.current &&
        !currentController.signal.aborted &&
        currentOperation === operation.current
      ) {
        const message = error instanceof Error ? error.message : String(error);
        setLoadFailure(message);
        setRequestStatus(`Could not load ${normalized}.`);
      }
    }
  }, [client, tref]);

  const onSubmit = (event: FormEvent): void => {
    event.preventDefault();
    void loadLive();
  };

  return (
    <main className="react-example">
      <header className="intro">
        <p className="eyebrow">Standalone React consumer</p>
        <h1>Bind React state to a request-free Sefaria Web Component</h1>
        <p>
          The first card comes from validated supplied data. React owns every
          live request, cancellation, display property, and event listener.
        </p>
      </header>

      <section className="controls" aria-label="React host controls">
        <form onSubmit={onSubmit}>
          <label>
            Reference
            <input
              name="tref"
              value={tref}
              onChange={(event) => setTref(event.currentTarget.value)}
              required
            />
          </label>
          <button id="load-live" type="submit">
            Load from Sefaria
          </button>
        </form>
        <div className="display-controls">
          <button
            id="theme-toggle"
            type="button"
            onClick={() =>
              setTheme((value) => (value === "light" ? "dark" : "light"))
            }
          >
            Use {theme === "light" ? "dark" : "light"} theme
          </button>
          <label>
            Preview width
            <input
              id="preview-width"
              type="range"
              min="320"
              max="960"
              step="20"
              value={previewWidth}
              onChange={(event) =>
                setPreviewWidth(Number(event.currentTarget.value))
              }
            />
            <output>{previewWidth}px</output>
          </label>
          <label>
            Text sides
            <select
              value={contentLanguage}
              onChange={(event) =>
                setContentLanguage(
                  event.currentTarget.value as
                    "both" | "primary" | "translation",
                )
              }
            >
              <option value="both">Hebrew and translation</option>
              <option value="primary">Primary only</option>
              <option value="translation">Translation only</option>
            </select>
          </label>
        </div>
      </section>

      <p id="request-status" className="status" role="status">
        {requestStatus}
      </p>
      <p id="request-count" className="status">
        Host request count: {requestCount}
      </p>

      {loadFailure === undefined ? null : (
        <p id="load-error" className="failure" role="alert">
          {loadFailure}
        </p>
      )}

      <section
        id="preview"
        className="preview"
        data-theme={theme}
        style={{ maxWidth: `${previewWidth}px` }}
      >
        <sefaria-source-card
          ref={setCardRef}
          hidden={loadFailure !== undefined}
        />
      </section>

      <p id="selected-ref" className="event-state" aria-live="polite">
        {selected
          ? `React received selection: ${selected.ref}.`
          : "Select the rendered segment to send its component event to React."}
      </p>

      <section className="diagnostics" aria-label="Optional diagnostics">
        <details>
          <summary>Actual React binding source</summary>
          <pre>
            <code>{reactSourceCardSnippet}</code>
          </pre>
        </details>
        <details>
          <summary>Current view model</summary>
          <pre>
            <code>{JSON.stringify(viewModel, null, 2)}</code>
          </pre>
        </details>
        <details>
          <summary>Latest component event</summary>
          <pre>
            <code>{JSON.stringify(selected ?? null, null, 2)}</code>
          </pre>
        </details>
      </section>
    </main>
  );
}
