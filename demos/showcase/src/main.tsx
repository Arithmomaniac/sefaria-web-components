import {
  createSefariaClient,
  getV3Texts,
  type CoreV3TextsResponse,
} from "@sefaria/client";
import "@sefaria/components";
import type {
  SefariaTextSegment,
  TextSegmentRequest,
  TextSegmentViewModel,
} from "@sefaria/components";
import { createTextSegmentViewModel } from "@sefaria/components/text-segment";
import Reveal from "reveal.js";
import Notes from "reveal.js/plugin/notes/notes.esm.js";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import { createRoot } from "react-dom/client";
import Prism from "prismjs";
import "prismjs/components/prism-json.js";
import "prismjs/components/prism-typescript.js";
import "prismjs/components/prism-jsx.js";
import "prismjs/components/prism-tsx.js";
import "prismjs/components/prism-markup.js";

import {
  manualReaderExampleSource,
  pipelineExampleSource,
  readerExampleSource,
  textSegmentElementSource,
  textExampleSource,
} from "./example-source.js";
import { useElementProperty } from "./element-property.js";
import { installPresentationNavigation } from "./presentation-navigation.js";
import { installViewportGuard } from "./viewport-guard.js";
import "./styles.css";

type ShowcaseTheme = "system" | "light" | "dark";
type DemoKind = "text" | "reader" | "manual-reader" | "linker";
type WorkbenchMode = "preview" | "code" | "split";
type PipelineStage = "client" | "view-model" | "element" | "component-source";
type RenderPipelineStage = Exclude<PipelineStage, "component-source">;

const pipelineStages = [
  {
    id: "client",
    label: "Typed client",
    title: "First, a typed client gives us trustworthy data",
    description:
      "Generated operations and runtime validation protect the transport boundary before Sefaria data reaches a component.",
  },
  {
    id: "view-model",
    label: "View-model factory",
    title: "Then, a pure factory prepares one component’s data",
    description:
      "It resolves language, direction, sanitized body parts, footnotes, and component-specific states without creating a general domain model.",
  },
  {
    id: "element",
    label: "Host setup",
    title: "The host registers, configures, and mounts the element",
    description:
      "The host owns loading. It gives the request-free element a prepared view model and decides where the element belongs.",
  },
  {
    id: "component-source",
    label: "Web Component",
    title: "Finally, the Web Component renders accessible DOM",
    description:
      "The Lit element maps prepared data into language-aware, directional Shadow DOM. Adopters use this element; they do not reproduce its implementation.",
  },
] as const satisfies ReadonlyArray<{
  readonly id: PipelineStage;
  readonly label: string;
  readonly title: string;
  readonly description: string;
}>;

const client = createSefariaClient({ cache: false });
const pipelineRequest: TextSegmentRequest = {
  tref: "Micah 6:8",
  version: { language: "english" },
};

function emitSlide(id: string): void {
  window.dispatchEvent(new CustomEvent("showcase-slide", { detail: { id } }));
}

function currentSlideId(): string {
  return document.querySelector(".slides section.present")?.id ?? "title";
}

function useActiveSlide(): string {
  const [slide, setSlide] = useState(currentSlideId);
  useEffect(() => {
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<{ readonly id: string }>).detail;
      setSlide(detail.id);
    };
    window.addEventListener("showcase-slide", listener);
    return () => window.removeEventListener("showcase-slide", listener);
  }, []);
  return slide;
}

function useTheme(): ShowcaseTheme {
  const [theme, setTheme] = useState<ShowcaseTheme>(
    (document.documentElement.dataset.theme as ShowcaseTheme | undefined) ??
      "system",
  );
  useEffect(() => {
    const listener = (event: Event) => {
      setTheme(
        (event as CustomEvent<{ readonly theme: ShowcaseTheme }>).detail.theme,
      );
    };
    window.addEventListener("showcase-theme", listener);
    return () => window.removeEventListener("showcase-theme", listener);
  }, []);
  return theme;
}

function formatJson(value: unknown): string {
  const json = JSON.stringify(value, null, 2);
  const maximum = 9_000;
  return json.length <= maximum
    ? json
    : `${json.slice(0, maximum)}\n\n… display shortened; the full value is used.`;
}

type CodeLanguage = "json" | "markup" | "tsx" | "typescript";

function renderCodeToken(token: string | Prism.Token, key: string): ReactNode {
  if (typeof token === "string") return token;
  const aliases =
    token.alias === undefined
      ? []
      : Array.isArray(token.alias)
        ? token.alias
        : [token.alias];
  const content = Array.isArray(token.content)
    ? token.content.map((child, index) =>
        renderCodeToken(child, `${key}-${index}`),
      )
    : renderCodeToken(token.content, `${key}-content`);
  return (
    <span key={key} className={["token", token.type, ...aliases].join(" ")}>
      {content}
    </span>
  );
}

function SyntaxCode({
  source,
  language,
  className = "code-pane",
  hidden = false,
}: {
  readonly source: string;
  readonly language: CodeLanguage;
  readonly className?: string;
  readonly hidden?: boolean;
}) {
  const tokens = useMemo(() => {
    const grammar = Prism.languages[language];
    if (grammar === undefined) {
      throw new Error(`Syntax grammar is not registered: ${language}`);
    }
    return Prism.tokenize(source, grammar);
  }, [language, source]);
  return (
    <pre className={className} hidden={hidden}>
      <code className={`language-${language}`}>
        {tokens.map((token, index) => renderCodeToken(token, String(index)))}
      </code>
    </pre>
  );
}

function ComponentSource() {
  return (
    <div className="component-source-panel">
      <header>
        <p>packages/components/src/text-segment-element.ts</p>
        <strong>Selected delivered Lit implementation</strong>
      </header>
      <SyntaxCode source={textSegmentElementSource} language="typescript" />
    </div>
  );
}

function PipelineExperience() {
  const activeSlide = useActiveSlide();
  const [stage, setStage] = useState<PipelineStage>("client");
  const [attempt, setAttempt] = useState(0);
  const [payload, setPayload] = useState<CoreV3TextsResponse>();
  const [viewModel, setViewModel] = useState<TextSegmentViewModel>({
    state: "loading",
    message: `Loading ${pipelineRequest.tref}.`,
  });
  const [error, setError] = useState<string>();
  const started = useRef(false);
  const controller = useRef<AbortController | undefined>(undefined);

  useEffect(() => {
    if (started.current || activeSlide !== "pipeline") return;

    started.current = true;
    const requestController = new AbortController();
    controller.current = requestController;
    void getV3Texts({
      client,
      path: { tref: pipelineRequest.tref },
      query: { version: ["english"], return_format: "default" },
      signal: requestController.signal,
    }).then(
      (result) => {
        if (requestController.signal.aborted) return;
        if (result.data === undefined) {
          setError(
            result.error?.error ??
              "The v3 texts request returned no documented response.",
          );
          return;
        }
        setPayload(result.data);
        setViewModel(createTextSegmentViewModel(result.data, pipelineRequest));
      },
      (reason: unknown) => {
        if (!requestController.signal.aborted) {
          setError(reason instanceof Error ? reason.message : String(reason));
        }
      },
    );
  }, [activeSlide, attempt]);
  useEffect(() => () => controller.current?.abort(), []);

  const retry = () => {
    controller.current?.abort();
    started.current = false;
    setPayload(undefined);
    setError(undefined);
    setViewModel({
      state: "loading",
      message: `Loading ${pipelineRequest.tref}.`,
    });
    setAttempt((current) => current + 1);
  };

  const slot = document.querySelector<HTMLElement>(
    "[data-pipeline-experience]",
  );
  if (slot === null) return null;
  const stageIndex = pipelineStages.findIndex((item) => item.id === stage);
  const stageDefinition = pipelineStages[stageIndex] ?? pipelineStages[0];
  return createPortal(
    <div className="pipeline-experience">
      <header className="pipeline-series-header">
        <p>
          <strong>Four parts inside one delivered path</strong>
          <span>Select a tab to inspect each responsibility.</span>
        </p>
        <nav role="tablist" aria-label="Component delivery path">
          {pipelineStages.map((item, index) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={stage === item.id}
              aria-current={stage === item.id ? "step" : undefined}
              onClick={() => setStage(item.id)}
            >
              <strong>{index + 1}</strong>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </header>
      <div className="slide-grid">
        <div className="slide-copy">
          <p className="composition-example">
            Part {stageIndex + 1}: {stageDefinition.label}
          </p>
          <h2>{stageDefinition.title}</h2>
          <p className="lead">{stageDefinition.description}</p>
        </div>
        <div className="pipeline-slot">
          {stage === "component-source" ? (
            <ComponentSource />
          ) : (
            <PipelinePanel
              stage={stage}
              viewModel={viewModel}
              {...(payload === undefined ? {} : { payload })}
              {...(error === undefined ? {} : { error })}
              onRetry={retry}
            />
          )}
        </div>
      </div>
    </div>,
    slot,
  );
}

function PipelinePanel({
  stage,
  payload,
  viewModel,
  error,
  onRetry,
}: {
  readonly stage: RenderPipelineStage;
  readonly payload?: CoreV3TextsResponse;
  readonly viewModel: TextSegmentViewModel;
  readonly error?: string;
  readonly onRetry: () => void;
}) {
  const [mode, setMode] = useState<WorkbenchMode>("split");
  const elementRef = useRef<SefariaTextSegment>(null);
  useElementProperty(elementRef, "viewModel", viewModel);
  const title =
    stage === "client"
      ? "Validated API response"
      : stage === "view-model"
        ? "Component view model"
        : "Complete host-side element setup";

  let output;
  if (error !== undefined) {
    output = (
      <div className="pipeline-error-panel" role="alert">
        <p className="pipeline-error">{error}</p>
        <button type="button" onClick={onRetry}>
          Try again
        </button>
      </div>
    );
  } else if (stage === "client") {
    output = (
      <SyntaxCode
        source={payload === undefined ? "Loading…" : formatJson(payload)}
        language="json"
      />
    );
  } else if (stage === "view-model") {
    output = <SyntaxCode source={formatJson(viewModel)} language="json" />;
  } else {
    output = (
      <div className="pipeline-render">
        <sefaria-text-segment ref={elementRef} />
      </div>
    );
  }

  return (
    <div className="pipeline-panel workbench">
      <header className="workbench-bar">
        <div
          className="workbench-tabs"
          role="tablist"
          aria-label={`${title} view`}
        >
          {(["code", "preview", "split"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={mode === tab}
              onClick={() => setMode(tab)}
            >
              {tab === "code"
                ? "Code"
                : tab === "preview"
                  ? stage === "element"
                    ? "Rendered"
                    : "Output"
                  : "Split"}
            </button>
          ))}
        </div>
        <p>
          {title}
          {stage === "element" ? "" : " · scrollable"}
        </p>
        <code>{pipelineRequest.tref}</code>
      </header>
      <div className="pipeline-body" data-mode={mode}>
        <SyntaxCode
          source={pipelineExampleSource[stage]}
          language={stage === "element" ? "tsx" : "typescript"}
          hidden={mode === "preview"}
        />
        <div className="pipeline-output" hidden={mode === "code"}>
          {output}
        </div>
      </div>
    </div>
  );
}

function demoCode(kind: DemoKind): {
  readonly source: string;
  readonly language: CodeLanguage;
  readonly label: string;
} {
  if (kind === "reader") {
    return {
      source: readerExampleSource,
      language: "typescript",
      label: "TypeScript",
    };
  }
  if (kind === "manual-reader") {
    return {
      source: manualReaderExampleSource,
      language: "typescript",
      label: "TypeScript",
    };
  }
  if (kind === "linker") {
    return {
      source: `<!-- Minimal embed; the preview also reports status and aborts scans. -->
<script src="https://…/sefaria-linker.js"></script>
<script>
  addEventListener("sefaria-linker-ready", () => SefariaLinker.link());
</script>`,
      language: "markup",
      label: "HTML",
    };
  }
  return {
    source: textExampleSource,
    language: "typescript",
    label: "TypeScript",
  };
}

function demoUrl(kind: DemoKind): string {
  return kind === "manual-reader"
    ? "./workspace-preview.html"
    : kind === "linker"
      ? "./linker-preview.html"
      : `./preview.html?demo=${kind}`;
}

function DemoWorkbench({
  kind,
  title,
  host,
}: {
  readonly kind: DemoKind;
  readonly title: string;
  readonly host: HTMLElement;
}) {
  const activeSlide = useActiveSlide();
  const theme = useTheme();
  const slideId = host.closest("section")?.id ?? "";
  const [visited, setVisited] = useState(activeSlide === slideId);
  const [mode, setMode] = useState<WorkbenchMode>("preview");
  const [width, setWidth] = useState<number>();
  const stageRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const sendActivity = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: "sefaria-showcase-active", active: activeSlide === slideId },
      location.origin,
    );
  }, [activeSlide, slideId]);

  useEffect(() => {
    if (activeSlide === slideId) setVisited(true);
  }, [activeSlide, slideId]);

  useEffect(() => {
    const frameDocument = iframeRef.current?.contentDocument;
    if (frameDocument === null || frameDocument === undefined) return;
    if (theme === "system") delete frameDocument.documentElement.dataset.theme;
    else frameDocument.documentElement.dataset.theme = theme;
  }, [theme, visited]);

  useEffect(() => {
    sendActivity();
  }, [sendActivity, visited]);

  useEffect(() => {
    const onMessage = (event: MessageEvent<unknown>) => {
      if (
        event.origin !== location.origin ||
        event.source !== iframeRef.current?.contentWindow
      ) {
        return;
      }
      const message = event.data as { readonly type?: string };
      if (message.type === "sefaria-showcase-ready") sendActivity();
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [sendActivity]);

  const resizeStart = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const stage = stageRef.current;
    if (stage === null) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const startX = event.clientX;
    const startWidth =
      width ??
      stage.querySelector<HTMLElement>(".preview-viewport")?.offsetWidth;
    if (startWidth === undefined) return;
    const move = (moveEvent: PointerEvent) => {
      const maximum = stage.clientWidth - 22;
      setWidth(
        Math.max(
          320,
          Math.min(maximum, startWidth + moveEvent.clientX - startX),
        ),
      );
    };
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop, { once: true });
  };

  const keyResize = (key: string) => {
    const maximum = (stageRef.current?.clientWidth ?? 640) - 22;
    const current = width ?? maximum;
    if (key === "ArrowLeft") setWidth(Math.max(320, current - 40));
    if (key === "ArrowRight") setWidth(Math.min(maximum, current + 40));
    if (key === "Home") setWidth(320);
    if (key === "End") setWidth(undefined);
  };

  const showPreview = mode !== "code";
  const showCode = mode !== "preview";
  const code = demoCode(kind);
  return (
    <div className="workbench">
      <div className="workbench-bar">
        <div
          className="workbench-tabs"
          role="tablist"
          aria-label={`${title} view`}
        >
          {(["preview", "code", "split"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={mode === tab}
              onClick={() => setMode(tab)}
            >
              {tab === "preview"
                ? "Preview"
                : tab === "code"
                  ? code.label
                  : "Split"}
            </button>
          ))}
        </div>
        <span>
          {width === undefined ? "Full width" : `${Math.round(width)} px`}
        </span>
      </div>
      <div className="workbench-body" data-mode={mode}>
        {visited || showPreview ? (
          <div className="preview-stage" ref={stageRef} hidden={!showPreview}>
            <div
              className="preview-viewport"
              style={width === undefined ? undefined : { width }}
            >
              {visited ? (
                <iframe
                  ref={iframeRef}
                  src={demoUrl(kind)}
                  title={`${title} live preview`}
                  onLoad={() => {
                    const frameDocument = iframeRef.current?.contentDocument;
                    if (frameDocument === null || frameDocument === undefined)
                      return;
                    if (theme === "system") {
                      delete frameDocument.documentElement.dataset.theme;
                    } else {
                      frameDocument.documentElement.dataset.theme = theme;
                    }
                    sendActivity();
                  }}
                />
              ) : null}
              <button
                className="resize-handle"
                type="button"
                role="separator"
                aria-label={`Resize ${title} preview`}
                aria-orientation="vertical"
                aria-valuemin={320}
                aria-valuenow={Math.round(width ?? 960)}
                onPointerDown={resizeStart}
                onKeyDown={(event) => {
                  if (
                    ["ArrowLeft", "ArrowRight", "Home", "End"].includes(
                      event.key,
                    )
                  ) {
                    event.preventDefault();
                    event.stopPropagation();
                    keyResize(event.key);
                  }
                }}
              />
            </div>
          </div>
        ) : null}
        {showCode ? (
          <SyntaxCode source={code.source} language={code.language} />
        ) : null}
      </div>
    </div>
  );
}

function initializeWorkbenches(): void {
  for (const host of document.querySelectorAll<HTMLElement>(
    ".demo-workbench",
  )) {
    const kind = host.dataset.demo as DemoKind;
    const title = host.dataset.title ?? "Demo";
    createRoot(host).render(
      <DemoWorkbench kind={kind} title={title} host={host} />,
    );
  }
}

function initializeTheme(): void {
  const select = document.querySelector<HTMLSelectElement>("[data-deck-theme]");
  if (select === null) return;
  const apply = () => {
    const theme = select.value as ShowcaseTheme;
    if (theme === "system") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
    window.dispatchEvent(
      new CustomEvent("showcase-theme", { detail: { theme } }),
    );
  };
  select.addEventListener("change", apply);
  apply();
}

function initializeMcpVideo(): void {
  const video = document.querySelector<HTMLVideoElement>("[data-mcp-video]");
  if (video === null)
    throw new Error("The MCP demonstration video is missing.");
  window.addEventListener("showcase-slide", (event) => {
    const { id } = (event as CustomEvent<{ readonly id: string }>).detail;
    if (id !== "mcp") {
      video.pause();
      return;
    }
    video.currentTime = 0;
    void video.play().catch((reason: unknown) => {
      video.dataset.autoplayBlocked = "true";
      console.warn("MCP video autoplay was blocked; use its controls.", reason);
    });
  });
}

const deck = new Reveal({
  hash: true,
  controls: true,
  progress: true,
  slideNumber: true,
  center: false,
  disableLayout: true,
  mouseWheel: false,
  transition: "fade",
  plugins: [Notes],
});

initializeTheme();
initializeWorkbenches();
initializeMcpVideo();
createRoot(document.querySelector("#pipeline-root")!).render(
  <PipelineExperience />,
);

const viewportGuard = installViewportGuard({
  root: document.querySelector(".reveal")!,
  toolbar: document.querySelector(".deck-toolbar")!,
  warning: document.querySelector("#viewport-warning")!,
  current: document.querySelector("[data-current-viewport]")!,
  onBlockedChange: (blocked) => {
    deck.configure({ keyboard: !blocked, touch: !blocked });
  },
});

void deck.initialize().then(() => {
  installPresentationNavigation({
    deck,
    isBlocked: () => viewportGuard.blocked,
  });
  emitSlide(deck.getCurrentSlide()?.id ?? "title");
  deck.on("slidechanged", () => {
    emitSlide(deck.getCurrentSlide()?.id ?? "title");
  });
});
