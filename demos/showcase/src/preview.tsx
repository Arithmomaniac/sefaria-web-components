import {
  createSefariaClient,
  getLinks,
  getV3Texts,
  type CoreLinkResponse,
  type CoreV3TextsResponse,
  type SefariaClient,
} from "@sefaria/client";
import "@sefaria/components";
import type {
  ConnectionsProjection,
  ConnectionsRequest,
  SefariaReader,
  SefariaSourceCard,
  SefariaTextSegment,
  SourceCardRequest,
  SourceCardViewModel,
  TextSegmentRequest,
  TextSegmentViewModel,
} from "@sefaria/components";
import {
  createReaderConnectionsContent,
  createReaderSession,
  createReaderSourceContent,
  type ReaderSession,
} from "@sefaria/components/reader-session";
import { createReaderViewModel } from "@sefaria/components/reader";
import { loadSourceCardViewModel } from "@sefaria/components/source-card";
import { loadTextSegmentViewModel } from "@sefaria/components/text-segment";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { createRoot } from "react-dom/client";

import { useElementProperty } from "./element-property.js";
import { useFactoryViewModel } from "./factory-binding.js";
import "./styles.css";

const client = createSefariaClient();

function TextDemo() {
  const [request, setRequest] = useState<TextSegmentRequest>({
    tref: "Micah 6:8",
    version: { language: "english" },
  });
  const [draft, setDraft] = useState(request.tref);
  const [language, setLanguage] = useState(request.version.language);
  const [englishFont, setEnglishFont] = useState("Georgia");
  const [hebrewFont, setHebrewFont] = useState("Noto Serif Hebrew");
  const loading = useMemo<TextSegmentViewModel>(
    () => ({ state: "loading", message: `Loading ${request.tref}.` }),
    [request.tref],
  );
  const result = useFactoryViewModel(
    request,
    loading,
    loadTextSegmentViewModel,
    client,
  );
  const elementRef = useRef<SefariaTextSegment>(null);
  useElementProperty(elementRef, "viewModel", result.viewModel);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next = { tref: draft.trim(), version: { language } };
    if (
      next.tref === request.tref &&
      next.version.language === request.version.language
    ) {
      result.reload();
    } else setRequest(next);
  };

  return (
    <main className="demo-page">
      <form className="demo-controls" onSubmit={submit}>
        <label>
          Reference
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
        </label>
        <label>
          Language family
          <select
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
          >
            <option value="english">English</option>
            <option value="hebrew">Hebrew</option>
          </select>
        </label>
        <label>
          English font
          <input
            value={englishFont}
            onChange={(event) => setEnglishFont(event.target.value)}
          />
        </label>
        <label>
          Hebrew font
          <input
            value={hebrewFont}
            onChange={(event) => setHebrewFont(event.target.value)}
          />
        </label>
        <button type="submit">Load</button>
      </form>
      {result.error === undefined ? null : (
        <p className="demo-error" role="alert">
          {result.error}
        </p>
      )}
      <section
        className="demo-result"
        style={
          {
            "--sample-font-english": englishFont,
            "--sample-font-hebrew": hebrewFont,
          } as never
        }
      >
        <sefaria-text-segment ref={elementRef} />
      </section>
    </main>
  );
}

function SourceCardDemo() {
  const [request, setRequest] = useState<SourceCardRequest>({
    tref: "Micah 6:6-8",
  });
  const [draft, setDraft] = useState(request.tref);
  const [contentLanguage, setContentLanguage] =
    useState<SefariaSourceCard["contentLanguage"]>("both");
  const [layout, setLayout] = useState<SefariaSourceCard["layout"]>("auto");
  const [englishFont, setEnglishFont] = useState("Georgia");
  const [hebrewFont, setHebrewFont] = useState("Noto Serif Hebrew");
  const loading = useMemo<SourceCardViewModel>(
    () => ({ state: "loading", message: `Loading ${request.tref}.` }),
    [request.tref],
  );
  const result = useFactoryViewModel(
    request,
    loading,
    loadSourceCardViewModel,
    client,
  );
  const elementRef = useRef<SefariaSourceCard>(null);
  useElementProperty(elementRef, "viewModel", result.viewModel);
  useElementProperty(elementRef, "contentLanguage", contentLanguage);
  useElementProperty(elementRef, "layout", layout);

  return (
    <main className="demo-page">
      <form
        className="demo-controls"
        onSubmit={(event) => {
          event.preventDefault();
          const tref = draft.trim();
          if (tref === request.tref) result.reload();
          else setRequest({ tref });
        }}
      >
        <label>
          Reference or range
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
        </label>
        <label>
          Visible text
          <select
            value={contentLanguage}
            onChange={(event) =>
              setContentLanguage(
                event.target.value as SefariaSourceCard["contentLanguage"],
              )
            }
          >
            <option value="both">Both</option>
            <option value="primary">Primary</option>
            <option value="translation">Translation</option>
          </select>
        </label>
        <label>
          Layout
          <select
            value={layout}
            onChange={(event) =>
              setLayout(event.target.value as SefariaSourceCard["layout"])
            }
          >
            <option value="auto">Responsive</option>
            <option value="stacked">Stacked</option>
            <option value="side-by-side">Side by side</option>
          </select>
        </label>
        <label>
          English font
          <input
            value={englishFont}
            onChange={(event) => setEnglishFont(event.target.value)}
          />
        </label>
        <label>
          Hebrew font
          <input
            value={hebrewFont}
            onChange={(event) => setHebrewFont(event.target.value)}
          />
        </label>
        <button type="submit">Load</button>
      </form>
      {result.error === undefined ? null : (
        <p className="demo-error" role="alert">
          {result.error}
        </p>
      )}
      <section
        className="demo-result"
        style={
          {
            "--sample-font-english": englishFont,
            "--sample-font-hebrew": hebrewFont,
          } as never
        }
      >
        <sefaria-source-card ref={elementRef} />
      </section>
    </main>
  );
}

interface ReaderPayloadResult {
  readonly payload: CoreV3TextsResponse;
  readonly request: SourceCardRequest;
}

async function requestSource(
  request: SourceCardRequest,
  activeClient: SefariaClient,
  signal: AbortSignal,
): Promise<ReaderPayloadResult> {
  const result = await getV3Texts({
    client: activeClient,
    path: { tref: request.tref },
    query: {
      version: ["primary", "translation"],
      return_format: "default",
    },
    signal,
  });
  if (result.data === undefined) {
    throw new Error(
      result.error?.error ?? "The text request returned no data.",
    );
  }
  return { payload: result.data, request };
}

function ReaderDemo() {
  const elementRef = useRef<SefariaReader>(null);
  const [draft, setDraft] = useState("Micah 6:8");
  const [session, setSession] = useState<ReaderSession>();
  const [activePane, setActivePane] =
    useState<SefariaReader["activePane"]>("source");
  const [error, setError] = useState<string>();
  const controller = useRef<AbortController | undefined>(undefined);
  const linksController = useRef<AbortController | undefined>(undefined);
  const operation = useRef(0);
  const linksOperation = useRef(0);
  const initialSourceStarted = useRef(false);
  const initialSelectionPhase = useRef(0);
  const sourcePending = useRef(false);
  const connectionsPending = useRef<
    | {
        readonly session: ReaderSession;
        readonly operationId: string;
      }
    | undefined
  >(undefined);
  const interrupted = useRef(false);

  const assignSession = useCallback((next: ReaderSession) => {
    setSession(next);
  }, []);
  const readerViewModel = useMemo(
    () =>
      session === undefined ? undefined : createReaderViewModel(session.view),
    [session],
  );
  useElementProperty(elementRef, "viewModel", readerViewModel);
  useElementProperty(elementRef, "activePane", activePane);

  const loadSource = useCallback(
    async (request: SourceCardRequest, replace = false) => {
      controller.current?.abort();
      linksController.current?.abort();
      linksOperation.current += 1;
      let navigationSession = session;
      const pendingConnections = connectionsPending.current;
      connectionsPending.current = undefined;
      if (pendingConnections !== undefined) {
        const cancelled = pendingConnections.session.cancelOperation(
          pendingConnections.operationId,
          "Connections loading was superseded by a source request.",
        );
        if (cancelled.state === "applied") {
          navigationSession = cancelled.session;
          assignSession(cancelled.session);
        }
      }
      const currentController = new AbortController();
      controller.current = currentController;
      const expected = ++operation.current;
      sourcePending.current = true;
      setError(undefined);
      try {
        const result = await requestSource(
          request,
          client,
          currentController.signal,
        );
        if (expected !== operation.current) return;
        sourcePending.current = false;
        const content = createReaderSourceContent(
          result.payload,
          result.request,
        );
        if (replace || navigationSession === undefined) {
          assignSession(createReaderSession({ source: content }));
          return;
        }
        const begun = navigationSession.beginSourceNavigation(
          navigationSession.view.currentEntryId,
          request,
        );
        if (begun.state !== "applied") throw new Error(begun.reason);
        const completed = begun.session.completeSourceNavigation(
          begun.value.operationId,
          { source: content },
        );
        if (completed.state !== "applied") throw new Error(completed.reason);
        assignSession(completed.session);
      } catch (reason) {
        if (
          !currentController.signal.aborted &&
          expected === operation.current
        ) {
          sourcePending.current = false;
          setError(reason instanceof Error ? reason.message : String(reason));
        }
      }
    },
    [assignSession, session],
  );

  const loadConnections = useCallback(
    async (
      entryId: string,
      tref: string,
      initialSession: ReaderSession | undefined = session,
    ) => {
      if (initialSession === undefined) return;
      linksController.current?.abort();
      let connectionsSession = initialSession;
      const pendingConnections = connectionsPending.current;
      connectionsPending.current = undefined;
      if (pendingConnections !== undefined) {
        const cancelled = pendingConnections.session.cancelOperation(
          pendingConnections.operationId,
          "Connections loading was superseded by another selection.",
        );
        if (cancelled.state !== "applied") {
          setError(cancelled.reason);
          return;
        }
        connectionsSession = cancelled.session;
        assignSession(cancelled.session);
      }
      const currentController = new AbortController();
      linksController.current = currentController;
      const expected = ++linksOperation.current;
      const request: ConnectionsRequest = { tref, withText: true };
      const begun = connectionsSession.beginConnections(entryId, request);
      if (begun.state !== "applied") {
        setError(begun.reason);
        return;
      }
      assignSession(begun.session);
      connectionsPending.current = {
        session: begun.session,
        operationId: begun.value.operationId,
      };
      try {
        const result = await getLinks({
          client,
          path: { tref },
          query: { with_text: "1", with_sheet_links: "0" },
          signal: currentController.signal,
        });
        if (
          currentController.signal.aborted ||
          expected !== linksOperation.current
        ) {
          return;
        }
        const payload: CoreLinkResponse | undefined =
          result.data ?? result.error;
        if (payload === undefined) throw new Error("No links response.");
        const content = createReaderConnectionsContent(
          payload,
          request,
          {},
          result.response.status === 400 ? 400 : 200,
        );
        const completed = begun.session.completeConnections(
          begun.value.operationId,
          content,
        );
        if (completed.state !== "applied") throw new Error(completed.reason);
        connectionsPending.current = undefined;
        assignSession(completed.session);
      } catch (reason) {
        if (expected !== linksOperation.current) return;
        connectionsPending.current = undefined;
        const message =
          reason instanceof Error ? reason.message : String(reason);
        const terminal = currentController.signal.aborted
          ? begun.session.cancelOperation(begun.value.operationId, message)
          : begun.session.failConnections(begun.value.operationId, message);
        if (terminal.state === "applied") assignSession(terminal.session);
        if (!currentController.signal.aborted) setError(message);
      }
    },
    [assignSession, session],
  );

  useEffect(() => {
    if (initialSourceStarted.current) return;
    initialSourceStarted.current = true;
    void loadSource({ tref: "Micah 6:8" }, true);
  }, [loadSource]);

  useEffect(() => {
    if (session === undefined) return;
    const source = session.view.current.source;
    if (source?.viewModel.state !== "data") return;
    const firstItem = source.viewModel.items[0];
    if (firstItem === undefined || firstItem.ref === undefined) return;
    if (initialSelectionPhase.current === 0) {
      const selected = session.selectSourcePosition(
        session.view.currentEntryId,
        firstItem.position,
      );
      if (selected.state !== "applied") return;
      initialSelectionPhase.current = 1;
      assignSession(selected.session);
      return;
    }
    if (initialSelectionPhase.current === 1) {
      initialSelectionPhase.current = 2;
      void loadConnections(session.view.currentEntryId, firstItem.ref);
    }
  }, [assignSession, loadConnections, session]);

  useEffect(() => {
    const onMessage = (event: MessageEvent<unknown>) => {
      if (event.origin !== location.origin) return;
      const message = event.data as {
        readonly type?: string;
        readonly active?: boolean;
      };
      if (message.type !== "sefaria-showcase-active") return;
      if (message.active === true) {
        interrupted.current = false;
        return;
      }
      if (message.active !== false) return;
      const pendingConnections = connectionsPending.current;
      const hadPending =
        sourcePending.current || pendingConnections !== undefined;
      if (!hadPending) return;
      controller.current?.abort();
      linksController.current?.abort();
      operation.current += 1;
      linksOperation.current += 1;
      sourcePending.current = false;
      connectionsPending.current = undefined;
      if (pendingConnections !== undefined) {
        const cancelled = pendingConnections.session.cancelOperation(
          pendingConnections.operationId,
          "Reader loading was interrupted when the preview left the active slide.",
        );
        if (cancelled.state === "applied") assignSession(cancelled.session);
      }
      interrupted.current = true;
      setError(
        "Reader loading was interrupted when the preview left the active slide.",
      );
    };
    window.addEventListener("message", onMessage);
    window.parent.postMessage(
      { type: "sefaria-showcase-ready" },
      location.origin,
    );
    return () => {
      window.removeEventListener("message", onMessage);
      controller.current?.abort();
      linksController.current?.abort();
    };
  }, [assignSession]);

  const onReaderEvent = useCallback(
    (event: Event) => {
      if (session === undefined) return;
      const custom = event as CustomEvent<Record<string, unknown>>;
      const entryId = String(custom.detail.originEntryId);
      if (event.type === "sefaria-reader-source-select") {
        const position = custom.detail.position;
        const ref = custom.detail.ref;
        if (!Array.isArray(position) || typeof ref !== "string") return;
        const selected = session.selectSourcePosition(
          entryId,
          position as number[],
        );
        if (selected.state !== "applied") return;
        assignSession(selected.session);
        void loadConnections(
          selected.session.view.currentEntryId,
          ref,
          selected.session,
        );
      } else if (event.type === "sefaria-reader-connection-select") {
        const targetRef = custom.detail.targetRef;
        if (typeof targetRef === "string") void loadSource({ tref: targetRef });
      } else if (event.type === "sefaria-reader-back") {
        const next = session.back();
        if (next.state === "applied") assignSession(next.session);
      } else if (event.type === "sefaria-reader-history-activate") {
        const target = custom.detail.entryId;
        if (typeof target !== "string") return;
        const next = session.activate(target);
        if (next.state === "applied") assignSession(next.session);
      } else if (event.type === "sefaria-reader-connections-category-change") {
        const category = custom.detail.category;
        const next = session.projectConnections(entryId, {
          ...(typeof category === "string" ? { category } : {}),
          page: 0,
        });
        if (next.state === "applied") assignSession(next.session);
      } else if (event.type === "sefaria-reader-connections-page-change") {
        const page = custom.detail.page;
        if (typeof page !== "number") return;
        const current = session.view.current.connections;
        const projection: ConnectionsProjection =
          current?.state === "view" ? current.projection : {};
        const next = session.projectConnections(entryId, {
          ...projection,
          page,
        });
        if (next.state === "applied") assignSession(next.session);
      } else if (event.type === "sefaria-reader-pane-change") {
        const pane = custom.detail.pane;
        if (pane === "source" || pane === "connections") setActivePane(pane);
      }
    },
    [assignSession, loadConnections, loadSource, session],
  );

  useEffect(() => {
    const element = elementRef.current;
    if (element === null) return;
    const events = [
      "sefaria-reader-source-select",
      "sefaria-reader-connection-select",
      "sefaria-reader-back",
      "sefaria-reader-history-activate",
      "sefaria-reader-connections-category-change",
      "sefaria-reader-connections-page-change",
      "sefaria-reader-pane-change",
    ];
    for (const name of events) element.addEventListener(name, onReaderEvent);
    return () => {
      for (const name of events) {
        element.removeEventListener(name, onReaderEvent);
      }
    };
  }, [onReaderEvent, session]);

  return (
    <main className="demo-page">
      <form
        className="demo-controls"
        onSubmit={(event) => {
          event.preventDefault();
          void loadSource({ tref: draft.trim() }, true);
        }}
      >
        <label>
          Start with a source
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
        </label>
        <button type="submit">Open reader</button>
      </form>
      {error === undefined ? null : (
        <p className="demo-error" role="alert">
          {error}
        </p>
      )}
      <section className="demo-result">
        {session === undefined ? (
          <p>Select Open reader to begin.</p>
        ) : (
          <sefaria-reader ref={elementRef} />
        )}
      </section>
    </main>
  );
}

const query = new URLSearchParams(location.search);
const demo = query.get("demo");
const root = createRoot(document.querySelector("#preview-root")!);
if (demo === "source") root.render(<SourceCardDemo />);
else if (demo === "reader") root.render(<ReaderDemo />);
else root.render(<TextDemo />);
