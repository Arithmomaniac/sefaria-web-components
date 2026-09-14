> Created/edited by GitHub Copilot; pending human review.

# Examples

These private examples form the visitor-facing toolbox for the unpublished Sefaria Frontend Toolkit. They consume public package entry points from the workspace; they are not published packages or evidence of official Sefaria ownership.

## Supplied-data component states

The [authored component workbench](explorer/authored.html) renders prepared view models and makes zero requests. Use its component, scenario, theme, width, and diagnostics controls, or open a stable deep link directly:

| Component | Public subpath | Retained scenarios | Example deep link |
| --- | --- | --- | --- |
| Reference label | `@sefaria/web-components/ref-label` | resolved, loading, unresolvable, HTTP error | [HTTP error](explorer/authored.html?component=ref-label&scenario=error) |
| Text segment | `@sefaria/web-components/text-segment` | populated, loading, empty, error, markup and footnotes | [Populated text](explorer/authored.html?component=text-segment&scenario=data) |
| Bilingual segment | `@sefaria/web-components/bilingual-segment` | populated, loading, partial, empty, error | [One-sided partial data](explorer/authored.html?component=bilingual-segment&scenario=partial) |
| Source card | `@sefaria/web-components/source-card` | one item, range, hidden addresses, one-sided, loading, empty, error, selection | [Range with diagnostics](explorer/authored.html?component=source-card&scenario=many-items&diagnostics=1) |
| Connections panel | `@sefaria/web-components/connections-panel` | summary, detail, metadata-only, loading, empty, error | [Detailed connections](explorer/authored.html?component=connections-panel&scenario=details) |
| Reader | `@sefaria/web-components/reader` | paired, source-only, connections-only, loading, unavailable, truncated history | [Truncated history](explorer/authored.html?component=reader&scenario=truncated-history&width=720) |

Runnable scenario definitions live in [`explorer/src/authored`](explorer/src/authored/). Selecting an authored scenario never starts a live operation.

## Live data and interaction

The [component explorer](explorer/README.md) keeps live actions separate from supplied-data selection. Each page owns its client and async factory call, shows loading or failure directly, and passes only a view model plus display properties to the element.

| Destination | What to try | Public package/subpath |
| --- | --- | --- |
| [Text segment](explorer/text-segment.html) | Hebrew, English with footnotes, retained markup, absent language, and wrong granularity | `@sefaria/web-components/text-segment` |
| [Bilingual segment](explorer/bilingual-segment.html) | Exact editions, missing translation, ranges, layout, side order, and displayed languages | `@sefaria/web-components/bilingual-segment` |
| [Reference label](explorer/ref-label.html) | Segment, range, spanning range, commentary, unresolvable references, link and language controls | `@sefaria/web-components/ref-label` |
| [Source card](explorer/source-card.html) | Bounded live source loading, ranges, side selection, layout, and order | `@sefaria/web-components/source-card` |
| [Connections reader](explorer/connections.html) | Source and connection selection, category/page projection, previews, cancellation, visible errors, and exact request counts | `@sefaria/web-components/source-card` and `@sefaria/web-components/connections-panel` |

## Supported Reader

Open the [controlled Reader](reader/controlled.html?tref=Micah%206%3A8) when the host wants the supported controller to own Reader transitions. The host creates the client, loads `@sefaria/web-components/reader-controller`, binds the controller to `<sefaria-reader>`, and disposes both.

## Custom composition

Open the [spatial Reader workspace](reader/index.html?tref=Micah%206%3A8) to see a website host assume additional responsibility for pane placement, activation, pruning, request cancellation, and session pins while reusing the same public factories and Reader semantics. It is intentionally distinct from the controlled Reader rather than a competing supported API.

The [React Vite example](react-vite/README.md) demonstrates custom host integration with a typed ref, object property assignment, a persistent element, explicit loading, stale suppression, StrictMode cleanup, theme/width controls, and a real `sefaria-source-select` event updating React state.

## Article and MCP host integration

The [authored linked article](linked-article/) progressively enhances ordinary Micah 6:8 Sefaria anchors with a request-free popup while preserving JavaScript-disabled and modifier-key navigation. The page owns its cache-disabled client and factory calls, cancellation, stale suppression, visible failures, and cleanup; its [README](linked-article/README.md) identifies the public subpaths and runnable source.

The private [MCP App guide](../docs/mcp-app-demo.md) packages the Reader as a self-contained MCP App served by compiled stdio or Streamable HTTP transports. Run `pnpm dev:mcp` for the real local reference host and sandbox; the maintained [App](mcp-app/src/app.ts), [host](mcp-app/src/host/), and [server](mcp-app/src/server/) sources keep tool requests host-mediated and transport logic separate from Reader state.

## Curation disposition

| Previous surface | Disposition |
| --- | --- |
| Authored explorer state arrays | Retained unchanged in the deep-linkable authored workbench. |
| Five live component pages and contextual connections reader | Retained as explicit live actions; no authored scenario silently triggers them. |
| Controlled and spatial Reader demos | Retained separately with responsibility guidance and `?tref=` deep links. |
| Linker detection and bookmarklet demos | Replaced by the maintained authored linked article; the historical Pages route remains available for existing links. |
| Showcase payload → view model → element explanation | Consolidated into maintained source/diagnostic panels and public-package descriptions without copying slide lifecycle code. |
| Showcase React property/factory bindings | Backfilled into `react-vite` with production-path browser tests, real events, and cleanup; no runtime import from the showcase remains. |
| Showcase theme and large-slide resize mechanics | The reusable theme/width teaching remains in the authored, Reader, and React examples. Reveal navigation, iframe activation messaging, booth-loop timing, QR generation, video handling, and presentation-only media were retired from active source. |

The removed presentation remains available at the immutable [`d7e2d59645ebf7427dcff2cbdd78073e2e7df58c`](https://github.com/Arithmomaniac/sefaria-web-components/tree/d7e2d59645ebf7427dcff2cbdd78073e2e7df58c/demos/showcase) revision. The current local documentation site assembles these maintained examples without cross-example runtime imports.
