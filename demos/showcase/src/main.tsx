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

import {
  pipelineExampleSource,
  readerExampleSource,
  sourceCardExampleSource,
  textExampleSource,
} from "./example-source.js";
import { useElementProperty } from "./element-property.js";
import "./styles.css";

type ShowcaseTheme = "system" | "light" | "dark";
type DemoKind = "text" | "source" | "reader" | "linker";
type WorkbenchMode = "preview" | "code" | "split";
type PipelineStage = "client" | "view-model" | "element";

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

type CodeLanguage = "json" | "tsx" | "typescript";

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

function PipelineExperience() {
  const activeSlide = useActiveSlide();
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
    if (
      started.current ||
      !["client", "view-model", "element"].includes(activeSlide)
    ) {
      return;
    }
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

  const slots = Array.from(
    document.querySelectorAll<HTMLElement>("[data-pipeline-stage]"),
  );
  return (
    <>
      {slots.map((slot) => {
        const stage = slot.dataset.pipelineStage as PipelineStage;
        return createPortal(
          <PipelinePanel
            key={stage}
            stage={stage}
            viewModel={viewModel}
            {...(payload === undefined ? {} : { payload })}
            {...(error === undefined ? {} : { error })}
            onRetry={retry}
          />,
          slot,
        );
      })}
    </>
  );
}

function PipelinePanel({
  stage,
  payload,
  viewModel,
  error,
  onRetry,
}: {
  readonly stage: PipelineStage;
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
        : "Request-free rendering";

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

function demoSource(kind: DemoKind): string {
  if (kind === "source") return sourceCardExampleSource;
  if (kind === "reader") return readerExampleSource;
  if (kind === "linker") {
    return `<!-- Minimal embed; the preview also reports status and aborts scans. -->
<script src="https://…/sefaria-linker.js"></script>
<script>
  addEventListener("sefaria-linker-ready", () => SefariaLinker.link());
</script>`;
  }
  return textExampleSource;
}

function demoUrl(kind: DemoKind): string {
  return kind === "linker"
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
                  ? "React / TSX"
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
          <SyntaxCode source={demoSource(kind)} language="tsx" />
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

function initializeGallery(): void {
  const image = document.querySelector<HTMLImageElement>(
    "[data-gallery-image]",
  );
  const caption = document.querySelector<HTMLElement>("[data-gallery-caption]");
  const position = document.querySelector<HTMLElement>(
    "[data-gallery-position]",
  );
  if (image === null || caption === null || position === null) return;
  const items = [
    {
      src: "./media/mcp-source-card.png",
      alt: "Sefaria source card rendered in VS Code Copilot Chat",
      caption: "Bilingual source card in Copilot Chat",
    },
    {
      src: "./media/mcp-connections.png",
      alt: "Sefaria connections panel rendered in VS Code Copilot Chat",
      caption: "Connections projected from one validated tool result",
    },
    {
      src: "./media/mcp-category.png",
      alt: "The Sefaria connections App after selecting another connection category",
      caption: "Selecting Targum reprojects the same connections payload",
    },
  ];
  let current = 0;
  const render = () => {
    const item = items[current];
    if (item === undefined) return;
    image.src = item.src;
    image.alt = item.alt;
    caption.textContent = item.caption;
    position.textContent = `${current + 1} of ${items.length}`;
  };
  document
    .querySelector("[data-gallery-previous]")
    ?.addEventListener("click", () => {
      current = (current - 1 + items.length) % items.length;
      render();
    });
  document
    .querySelector("[data-gallery-next]")
    ?.addEventListener("click", () => {
      current = (current + 1) % items.length;
      render();
    });
}

const deck = new Reveal({
  hash: true,
  controls: true,
  progress: true,
  slideNumber: true,
  center: false,
  disableLayout: true,
  transition: "fade",
  plugins: [Notes],
});

initializeTheme();
initializeWorkbenches();
initializeGallery();
createRoot(document.querySelector("#pipeline-root")!).render(
  <PipelineExperience />,
);

void deck.initialize().then(() => {
  emitSlide(deck.getCurrentSlide()?.id ?? "title");
  deck.on("slidechanged", () => {
    emitSlide(deck.getCurrentSlide()?.id ?? "title");
  });
});
