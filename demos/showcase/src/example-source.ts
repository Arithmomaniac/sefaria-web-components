export const pipelineExampleSource = {
  client: `const result = await getV3Texts({
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
  element: `useElementProperty(
  elementRef,
  "viewModel",
  viewModel,
);

return <sefaria-text-segment ref={elementRef} />;`,
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

export const textExampleSource = `const result = useFactoryViewModel(
  request,
  { state: "loading", message: \`Loading \${request.tref}.\` },
  loadTextSegmentViewModel,
  client,
);

useElementProperty(elementRef, "viewModel", result.viewModel);

return <>
  {result.error && <p role="alert">{result.error}</p>}
  <section style={{
    "--sample-font-english": englishFont,
    "--sample-font-hebrew": hebrewFont,
  }}>
    <sefaria-text-segment ref={elementRef} />
  </section>
</>;`;

export const readerExampleSource = `const controller = await loadReaderController(
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

export const manualReaderExampleSource = `const readerSite =
  document.querySelector<HTMLElement>("#reader-site");

if (!readerSite) throw new Error("Reader site is required.");

readerSite.style.setProperty("--sefaria-panel-radius", "0");
readerSite.style.setProperty("--sefaria-control-radius", "0");

const workspace = startReaderWorkspace(document);

await workspace.navigate("Micah 6:8", false);

// The host owns ordered pane placement and descendant pruning.
// Components remain request-free; the workspace coordinates factories.
workspace.activatePane(workspace.view.panes.at(-1).id);

// On teardown:
workspace.dispose();`;
