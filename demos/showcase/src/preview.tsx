import { createSefariaClient } from "@sefaria/client";
import "@sefaria/components";
import type {
  SefariaReader,
  SefariaTextSegment,
  TextSegmentRequest,
  TextSegmentViewModel,
} from "@sefaria/components";
import { bindReaderController } from "@sefaria/components";
import {
  loadReaderController,
  type ReaderController,
  type ReaderControllerSnapshot,
} from "@sefaria/components/reader-controller";
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
      <form
        className="demo-controls text-demo-controls"
        aria-label="Host application controls"
        onSubmit={submit}
      >
        <fieldset>
          <legend>Load new data</legend>
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
          <button type="submit">Load through host</button>
        </fieldset>
        <fieldset>
          <legend>Presentation only · no new request</legend>
          <label>
            English font
            <select
              value={englishFont}
              disabled={request.version.language !== "english"}
              onChange={(event) => setEnglishFont(event.target.value)}
            >
              <option value="Georgia">Georgia</option>
              <option value="Arial">Arial</option>
              <option value="Segoe UI">Segoe UI</option>
            </select>
          </label>
          <label>
            Hebrew font
            <select
              value={hebrewFont}
              disabled={request.version.language !== "hebrew"}
              onChange={(event) => setHebrewFont(event.target.value)}
            >
              <option value="Noto Serif Hebrew">Noto Serif Hebrew</option>
              <option value="Arial">Arial</option>
              <option value="Times New Roman">Times New Roman</option>
            </select>
          </label>
        </fieldset>
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
        <p className="demo-surface-label">
          Library component: <code>&lt;sefaria-text-segment&gt;</code>
        </p>
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
        aria-label="Host application controls"
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
        <button type="submit">Load through supplied controller</button>
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
        <p className="demo-surface-label">
          Library component: <code>&lt;sefaria-reader&gt;</code>
        </p>
        <sefaria-reader ref={elementRef} />
      </section>
    </main>
  );
}

const query = new URLSearchParams(location.search);
const demo = query.get("demo");
if (demo === "manual-reader") {
  query.delete("demo");
  const target = new URL("./workspace-preview.html", location.href);
  target.search = query.toString();
  target.hash = location.hash;
  location.replace(target);
} else {
  const root = createRoot(document.querySelector("#preview-root")!);
  root.render(demo === "reader" ? <ReaderDemo /> : <TextDemo />);
}
