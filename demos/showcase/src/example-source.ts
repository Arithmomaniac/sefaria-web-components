export const pipelineExampleSource = {
  client: `const request: TextSegmentRequest = {
  tref: "Micah 6:8",
  version: { language: "english" },
};

const result = await getV3Texts({
  client,
  path: { tref: request.tref },
  query: {
    version: ["english"],
    return_format: "default",
  },
  signal,
});

if (!result.data) {
  throw new Error(result.error?.error ?? "No text response.");
}

const payload = result.data;`,
  "view-model": `const viewModel = createTextSegmentViewModel(
  payload,
  request,
);`,
  element: `import "@sefaria/components";

// The package import registers <sefaria-text-segment>.
const element = document.createElement("sefaria-text-segment");

// viewModel was produced by the factory in step 2.
element.viewModel = viewModel;

const mount = document.querySelector("#app");
if (!mount) throw new Error("App mount is required.");

mount.replaceChildren(element);`,
} as const;

export const textSegmentElementDeclarationSource = [
  "export class SefariaTextSegment extends SefariaElement {",
  "  /** Lit property metadata for the host-supplied view model. */",
  "  static override properties = {",
  "    viewModel: { attribute: false },",
  "  };",
].join("\n");

export const textSegmentElementRenderSource = [
  "  #renderData(viewModel: TextSegmentDataViewModel) {",
  "    const hasFootnoteBodies = viewModel.notes.some(",
  "      (note) => note.content !== null,",
  "    );",
  "",
  "    return html`",
  "      <article lang=${viewModel.actualLanguage} dir=${viewModel.direction}>",
  '        <div class="body">',
  "          ${viewModel.body.map((part) =>",
  '            part.kind === "html"',
  '              ? html`<span class="body-part">${unsafeHTML(part.html)}</span>`',
  '              : html`<sup class="footnote-marker"',
  "                  data-note-index=${part.noteIndex}",
  "                  >${part.markerText}</sup",
  "                >`,",
  "          )}",
  "        </div>",
  "        ${",
  "          hasFootnoteBodies",
  '            ? html`<ol class="footnotes">',
  "                ${viewModel.notes.map((note) =>",
  "                  note.content === null",
  "                    ? nothing",
  "                    : html`<li data-note-index=${note.index}>",
  '                        <span class="footnote-label">${note.markerText}</span>',
  "                        ${unsafeHTML(note.content)}",
  "                      </li>`,",
  "                )}",
  "              </ol>`",
  "            : nothing",
  "        }",
  "      </article>",
  "    `;",
  "  }",
].join("\n");

export const textSegmentElementSource = `${textSegmentElementDeclarationSource}

  #renderData(viewModel: TextSegmentDataViewModel) {
    return html\`
      <article lang=\${viewModel.actualLanguage} dir=\${viewModel.direction}>
        <div class="body">
          \${viewModel.body.map((part) =>
            part.kind === "html"
              ? html\`<span class="body-part">\${unsafeHTML(part.html)}</span>\`
              : html\`<sup class="footnote-marker"
                  data-note-index=\${part.noteIndex}
                  >\${part.markerText}</sup
                >\`,
          )}
        </div>
        <!-- Conditional wrapper omitted. -->
        \${viewModel.notes.map((note) =>
          note.content === null
            ? nothing
            : html\`<li data-note-index=\${note.index}>
                <span class="footnote-label">\${note.markerText}</span>
                \${unsafeHTML(note.content)}
              </li>\`,
        )}
      </article>
    \`;
  }
}`;

export const textExampleSource = `import { createSefariaClient } from "@sefaria/client";
import "@sefaria/components";
import { loadTextSegmentViewModel } from "@sefaria/components/text-segment";

const client = createSefariaClient();
const request = {
  tref: "Micah 6:8",
  version: { language: "english" },
} as const;

const viewModel = await loadTextSegmentViewModel(request, client);
const element = document.createElement("sefaria-text-segment");
element.viewModel = viewModel;

const mount = document.querySelector("#app");
if (!mount) throw new Error("App mount is required.");

mount.replaceChildren(element);`;

export const readerExampleSource = `const readerElement =
  document.querySelector<SefariaReader>("sefaria-reader");

if (!readerElement) throw new Error("Reader element is required.");

const controller = await loadReaderController(
  { tref: "Micah 6:8" },
  client,
  { signal },
);

const unbind = bindReaderController(readerElement, controller);
const unsubscribe = controller.subscribe(({ task, reader }) => {
  setStatus(task.state === "idle"
    ? \`Showing \${reader.label}.\`
    : "Reader request in progress.");
});

// On teardown:
unsubscribe();
unbind();
controller.dispose();`;

export const manualReaderExampleSource = `import "../../reader-workspace/src/style.css";
import {
  startReaderWorkspace,
  type ReaderWorkspace,
} from "../../reader-workspace/src/app.js";

let workspace: ReaderWorkspace | undefined;

function start(): void {
  workspace ??= startReaderWorkspace(document);
  if (workspace.view.panes.length === 0) {
    void workspace.navigate("Micah 6:8", false);
  }
}

addEventListener("message", (event: MessageEvent<unknown>) => {
  if (event.origin !== location.origin) return;
  const message = event.data as {
    readonly type?: string;
    readonly active?: boolean;
  };
  if (message.type !== "sefaria-showcase-active") return;
  if (message.active === true) start();
  else if (message.active === false) workspace?.cancelPending();
});

addEventListener("pagehide", (event) => {
  if (event.persisted) return;
  workspace?.dispose();
  workspace = undefined;
});

start();`;
