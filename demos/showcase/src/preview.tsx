import { createSefariaClient } from "@sefaria/client";
import "@sefaria/components";
import type {
  ConnectionsProjection,
  ConnectionsRequest,
  ConnectionsViewModel,
  SefariaConnectionsPanel,
  SefariaReader,
  SefariaSourceCard,
  SefariaTextSegment,
  SourceCardViewModel,
  TextSegmentRequest,
  TextSegmentViewModel,
} from "@sefaria/components";
import { bindReaderController } from "@sefaria/components";
import {
  createSefariaReaderDataSource,
  loadReaderController,
  type ReaderController,
  type ReaderControllerSnapshot,
} from "@sefaria/components/reader-controller";
import {
  createReaderSession,
  type ReaderSourceContent,
  type ReaderSession,
  type ReaderTransition,
} from "@sefaria/components/reader-session";
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
const readerDataSource = createSefariaReaderDataSource(client);

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

function ReaderDemo() {
  const elementRef = useRef<SefariaReader>(null);
  const [draft, setDraft] = useState("Micah 6:8");
  const [status, setStatus] = useState("Waiting for the first request.");
  const [error, setError] = useState<string>();
  const controller = useRef<ReaderController | undefined>(undefined);
  const unbind = useRef<(() => void) | undefined>(undefined);
  const unsubscribe = useRef<(() => void) | undefined>(undefined);
  const initialization = useRef<AbortController | undefined>(undefined);
  const generation = useRef(0);

  const releaseController = useCallback(() => {
    unsubscribe.current?.();
    unsubscribe.current = undefined;
    unbind.current?.();
    unbind.current = undefined;
    controller.current?.dispose();
    controller.current = undefined;
  }, []);

  const renderStatus = useCallback((snapshot: ReaderControllerSnapshot) => {
    switch (snapshot.task.state) {
      case "idle":
        setStatus(`Showing ${snapshot.reader.label}.`);
        setError(undefined);
        break;
      case "loading-source":
        setStatus(`Opening ${snapshot.task.targetRef}.`);
        break;
      case "loading-connections":
        setStatus(`Loading connections for ${snapshot.task.request.tref}.`);
        break;
      case "error":
        setStatus(`${snapshot.reader.label} remains open.`);
        setError(snapshot.task.message);
        break;
    }
  }, []);

  const navigate = useCallback(
    async (targetRef: string) => {
      initialization.current?.abort();
      const currentInitialization = new AbortController();
      initialization.current = currentInitialization;
      const currentGeneration = ++generation.current;
      releaseController();
      if (elementRef.current !== null) elementRef.current.viewModel = undefined;
      const normalized = targetRef.trim();
      setStatus(`Opening ${normalized}.`);
      setError(undefined);
      try {
        const next = await loadReaderController({ tref: normalized }, client, {
          signal: currentInitialization.signal,
        });
        if (
          currentInitialization.signal.aborted ||
          currentGeneration !== generation.current
        ) {
          next.dispose();
          return;
        }
        const element = elementRef.current;
        if (element === null) {
          next.dispose();
          throw new Error("The reader element is unavailable.");
        }
        controller.current = next;
        unbind.current = bindReaderController(element, next);
        unsubscribe.current = next.subscribe(renderStatus);
        initialization.current = undefined;
      } catch (reason) {
        if (
          !currentInitialization.signal.aborted &&
          currentGeneration === generation.current
        ) {
          setStatus(`${normalized} could not be opened.`);
          setError(reason instanceof Error ? reason.message : String(reason));
        }
      }
    },
    [releaseController, renderStatus],
  );

  useEffect(() => {
    void navigate("Micah 6:8");
    return () => {
      initialization.current?.abort();
      generation.current += 1;
      releaseController();
    };
  }, [navigate, releaseController]);

  useEffect(() => {
    const onMessage = (event: MessageEvent<unknown>) => {
      if (event.origin !== location.origin) return;
      const message = event.data as {
        readonly type?: string;
        readonly active?: boolean;
      };
      if (
        message.type !== "sefaria-showcase-active" ||
        message.active !== false
      ) {
        return;
      }
      const task = controller.current?.snapshot.task.state;
      const hasPendingWork =
        initialization.current !== undefined ||
        (task !== undefined && task !== "idle" && task !== "error");
      if (!hasPendingWork) return;
      initialization.current?.abort();
      generation.current += 1;
      releaseController();
      setStatus("Reader loading was interrupted.");
      setError(
        "Reader loading was interrupted when the preview left the active slide.",
      );
    };
    window.addEventListener("message", onMessage);
    window.parent.postMessage(
      { type: "sefaria-showcase-ready" },
      location.origin,
    );
    return () => window.removeEventListener("message", onMessage);
  }, [releaseController]);

  return (
    <main className="demo-page reader-demo-page">
      <form
        className="demo-controls"
        onSubmit={(event) => {
          event.preventDefault();
          void navigate(draft);
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
      <div className="demo-feedback">
        <p className="demo-status" role="status">
          {status}
        </p>
        {error === undefined ? null : (
          <p className="demo-error" role="alert">
            {error}
          </p>
        )}
      </div>
      <section className="demo-result demo-reader-result">
        <sefaria-reader ref={elementRef} />
      </section>
    </main>
  );
}

interface ReaderPayloadResult {
  readonly content: ReaderSourceContent;
}

async function requestSource(
  tref: string,
  signal: AbortSignal,
): Promise<ReaderPayloadResult> {
  return {
    content: await readerDataSource.loadSource({ tref }, signal),
  };
}

function ManualReaderDemo() {
  const sourceRef = useRef<SefariaSourceCard>(null);
  const connectionsRef = useRef<SefariaConnectionsPanel>(null);
  const [draft, setDraft] = useState("Micah 6:8");
  const [session, setSession] = useState<ReaderSession>();
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
  const entry = session?.view.current;
  const connections = entry?.connections;
  const sourceViewModel: SourceCardViewModel = entry?.source?.viewModel ?? {
    state: "loading",
    message: "Loading source.",
  };
  const connectionsViewModel: ConnectionsViewModel =
    connections?.state === "view" || connections?.state === "loading"
      ? connections.viewModel
      : { state: "loading", message: "Select a source to load connections." };
  useElementProperty(sourceRef, "viewModel", sourceViewModel);
  useElementProperty(sourceRef, "selectedPosition", entry?.selectedPosition);
  useElementProperty(
    sourceRef,
    "contentLanguage",
    entry?.presentation.contentLanguage ?? "both",
  );
  useElementProperty(sourceRef, "layout", entry?.presentation.layout ?? "auto");
  useElementProperty(
    sourceRef,
    "sideOrder",
    entry?.presentation.sideOrder ?? "primary-first",
  );
  useElementProperty(
    sourceRef,
    "selectable",
    entry?.source?.viewModel.state === "data",
  );
  useElementProperty(connectionsRef, "viewModel", connectionsViewModel);
  useElementProperty(
    connectionsRef,
    "showPreviews",
    entry?.presentation.showConnectionPreviews ?? true,
  );

  const loadSource = useCallback(
    async (tref: string, replace = false) => {
      if (replace) initialSelectionPhase.current = 0;
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
        const result = await requestSource(tref, currentController.signal);
        if (expected !== operation.current) return;
        sourcePending.current = false;
        if (replace || navigationSession === undefined) {
          assignSession(createReaderSession({ source: result.content }));
          return;
        }
        const begun = navigationSession.beginSourceNavigation(
          navigationSession.view.currentEntryId,
          result.content.request,
        );
        if (begun.state !== "applied") throw new Error(begun.reason);
        const completed = begun.session.completeSourceNavigation(
          begun.value.operationId,
          { source: result.content },
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
        const content = await readerDataSource.loadConnections(
          request,
          {},
          currentController.signal,
        );
        if (
          currentController.signal.aborted ||
          expected !== linksOperation.current
        ) {
          return;
        }
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
    void loadSource("Micah 6:8", true);
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

  const onSourceEvent = useCallback(
    (event: Event) => {
      if (session === undefined) return;
      const custom = event as CustomEvent<Record<string, unknown>>;
      const position = custom.detail.position;
      const ref = custom.detail.ref;
      if (!Array.isArray(position) || typeof ref !== "string") return;
      const selected = session.selectSourcePosition(
        session.view.currentEntryId,
        position as number[],
      );
      if (selected.state !== "applied") return;
      assignSession(selected.session);
      void loadConnections(
        selected.session.view.currentEntryId,
        ref,
        selected.session,
      );
    },
    [assignSession, loadConnections, session],
  );

  const onConnectionsEvent = useCallback(
    (event: Event) => {
      if (session === undefined) return;
      const custom = event as CustomEvent<Record<string, unknown>>;
      const entryId = session.view.currentEntryId;
      if (event.type === "sefaria-connection-select") {
        const targetRef = custom.detail.targetRef;
        if (typeof targetRef === "string") void loadSource(targetRef);
      } else if (event.type === "sefaria-connections-category-change") {
        const category = custom.detail.category;
        const next = session.projectConnections(entryId, {
          ...(typeof category === "string" ? { category } : {}),
          page: 0,
        });
        if (next.state === "applied") assignSession(next.session);
      } else if (event.type === "sefaria-connections-page-change") {
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
      }
    },
    [assignSession, loadSource, session],
  );

  const supersedeManualReaderWork = useCallback(
    (current: ReaderSession): ReaderSession => {
      controller.current?.abort();
      linksController.current?.abort();
      operation.current += 1;
      linksOperation.current += 1;
      sourcePending.current = false;
      const pendingConnections = connectionsPending.current;
      connectionsPending.current = undefined;
      if (pendingConnections === undefined) return current;
      const cancelled = current.cancelOperation(
        pendingConnections.operationId,
        "Connections loading was superseded by reader history.",
      );
      return cancelled.state === "applied" ? cancelled.session : current;
    },
    [],
  );

  const restoreHistory = useCallback(
    (transition: (current: ReaderSession) => ReaderTransition) => {
      if (session === undefined) return;
      const current = supersedeManualReaderWork(session);
      const next = transition(current);
      if (next.state === "applied") assignSession(next.session);
    },
    [assignSession, session, supersedeManualReaderWork],
  );

  useEffect(() => {
    const element = sourceRef.current;
    if (element === null) return;
    element.addEventListener("sefaria-source-select", onSourceEvent);
    return () => {
      element.removeEventListener("sefaria-source-select", onSourceEvent);
    };
  }, [onSourceEvent, session]);

  useEffect(() => {
    const element = connectionsRef.current;
    if (element === null) return;
    const events = [
      "sefaria-connection-select",
      "sefaria-connections-category-change",
      "sefaria-connections-page-change",
    ];
    for (const name of events) {
      element.addEventListener(name, onConnectionsEvent);
    }
    return () => {
      for (const name of events) {
        element.removeEventListener(name, onConnectionsEvent);
      }
    };
  }, [onConnectionsEvent, session]);

  return (
    <main className="demo-page">
      <form
        className="demo-controls"
        onSubmit={(event) => {
          event.preventDefault();
          void loadSource(draft.trim(), true);
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
      <section className="demo-result manual-reader">
        {session === undefined ? (
          <p>Select Open reader to begin.</p>
        ) : (
          <>
            <nav className="manual-reader-history" aria-label="Reader history">
              <button
                type="button"
                disabled={session.view.entries.length < 2}
                onClick={() => restoreHistory((current) => current.back())}
              >
                Back
              </button>
              {session.view.breadcrumbs.map((breadcrumb) => (
                <button
                  key={breadcrumb.entryId}
                  type="button"
                  aria-current={breadcrumb.current ? "page" : undefined}
                  onClick={() =>
                    restoreHistory((current) =>
                      current.activate(breadcrumb.entryId),
                    )
                  }
                >
                  {breadcrumb.label}
                </button>
              ))}
            </nav>
            <div className="manual-reader-columns">
              <section className="manual-reader-column" aria-label="Source">
                <h2>Source</h2>
                <sefaria-source-card ref={sourceRef} />
              </section>
              <section
                className="manual-reader-column"
                aria-label="Connections"
              >
                <h2>Connections</h2>
                {connections?.state === "unavailable" ? (
                  <p
                    role={connections.reason === "failed" ? "alert" : "status"}
                  >
                    {connections.message}
                  </p>
                ) : (
                  <sefaria-connections-panel ref={connectionsRef} />
                )}
              </section>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

const query = new URLSearchParams(location.search);
const demo = query.get("demo");
const root = createRoot(document.querySelector("#preview-root")!);
if (demo === "reader") root.render(<ReaderDemo />);
else if (demo === "manual-reader") root.render(<ManualReaderDemo />);
else root.render(<TextDemo />);
