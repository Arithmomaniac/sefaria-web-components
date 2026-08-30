# Evidence

This document records source observations that support the design and specifications. It does not define product behavior or delivery status.

## Source baseline

The research used:

- `Sefaria/Sefaria-Project` at `c33ee50`
- later web spot checks at `4c0ecc1`
- `Sefaria/Sefaria-Mobile` at `925420d`
- `Sefaria/sefaria-mcp` at `d409602`
- the live `sefaria.org` DOM and computed styles in August 2026
- the live `/api/texts`, `/api/v3/texts`, and `/api/powered-by` endpoints
- live probes of each relevant `return_format`
- [`Sefaria/Sefaria-Project` `docs/openAPI.json` at `1f7d0844ca6a9eddc8e48168962aacb09de75bd6`](https://github.com/Sefaria/Sefaria-Project/blob/1f7d0844ca6a9eddc8e48168962aacb09de75bd6/docs/openAPI.json)
- the deployed Linker on a third-party page
- `DaveDushi/bisl-torah` at `ea51f7b`
- `jleznek/torah-chat` at `1492fc5`

Evidence has these classes:

- **Observed:** Source code or a live result supplied the fact.
- **Inferred:** Public consumer behavior supplied the likely rule.
- **Proposed:** This project defines the behavior.

The specifications own proposed behavior. This document records observed and inferred evidence.

The Sefaria web and mobile repositories are the primary evidence for current rendering behavior. Live Sefaria surfaces supplement those repositories.

Consumer projects show integration needs and independent use. They do not define Sefaria behavior.

## Core endpoint implementation map

The Core API source audit uses Sefaria commit [`1f7d0844ca6a9eddc8e48168962aacb09de75bd6`](https://github.com/Sefaria/Sefaria-Project/tree/1f7d0844ca6a9eddc8e48168962aacb09de75bd6).

| Endpoint | Route | Handler and response builder | Upstream tests |
| --- | --- | --- | --- |
| `GET /api/v3/texts/{tref}` | [`sefaria/urls_shared.py:86`](https://github.com/Sefaria/Sefaria-Project/blob/1f7d0844ca6a9eddc8e48168962aacb09de75bd6/sefaria/urls_shared.py#L86) | [`api/views.py:28-88`](https://github.com/Sefaria/Sefaria-Project/blob/1f7d0844ca6a9eddc8e48168962aacb09de75bd6/api/views.py#L28-L88), [`sefaria/model/text_request_adapter.py:15-235`](https://github.com/Sefaria/Sefaria-Project/blob/1f7d0844ca6a9eddc8e48168962aacb09de75bd6/sefaria/model/text_request_adapter.py#L15-L235) | [`api/tests.py:13-227`](https://github.com/Sefaria/Sefaria-Project/blob/1f7d0844ca6a9eddc8e48168962aacb09de75bd6/api/tests.py#L13-L227) |
| `GET /api/texts/versions/{index}` | [`sefaria/urls_shared.py:74`](https://github.com/Sefaria/Sefaria-Project/blob/1f7d0844ca6a9eddc8e48168962aacb09de75bd6/sefaria/urls_shared.py#L74) | [`reader/views.py:2615-2622`](https://github.com/Sefaria/Sefaria-Project/blob/1f7d0844ca6a9eddc8e48168962aacb09de75bd6/reader/views.py#L2615-L2622), [`sefaria/model/text.py:4649-4671`](https://github.com/Sefaria/Sefaria-Project/blob/1f7d0844ca6a9eddc8e48168962aacb09de75bd6/sefaria/model/text.py#L4649-L4671) | [`api-tests/test_texts.py:52-56`](https://github.com/Sefaria/Sefaria-Project/blob/1f7d0844ca6a9eddc8e48168962aacb09de75bd6/api-tests/test_texts.py#L52-L56) |
| `GET /api/ref/{tref}` | [`sefaria/urls_shared.py:135`](https://github.com/Sefaria/Sefaria-Project/blob/1f7d0844ca6a9eddc8e48168962aacb09de75bd6/sefaria/urls_shared.py#L135) | [`api/views.py:91-176`](https://github.com/Sefaria/Sefaria-Project/blob/1f7d0844ca6a9eddc8e48168962aacb09de75bd6/api/views.py#L91-L176) | [`api/tests.py:230-380`](https://github.com/Sefaria/Sefaria-Project/blob/1f7d0844ca6a9eddc8e48168962aacb09de75bd6/api/tests.py#L230-L380) |
| `GET /api/v2/index/{title}` | [`sefaria/urls_shared.py:92`](https://github.com/Sefaria/Sefaria-Project/blob/1f7d0844ca6a9eddc8e48168962aacb09de75bd6/sefaria/urls_shared.py#L92) | [`reader/views.py:2061-2131`](https://github.com/Sefaria/Sefaria-Project/blob/1f7d0844ca6a9eddc8e48168962aacb09de75bd6/reader/views.py#L2061-L2131), [`sefaria/model/text.py:260-321`](https://github.com/Sefaria/Sefaria-Project/blob/1f7d0844ca6a9eddc8e48168962aacb09de75bd6/sefaria/model/text.py#L260-L321) | [`api-tests/test_endpoints.py:14-19`](https://github.com/Sefaria/Sefaria-Project/blob/1f7d0844ca6a9eddc8e48168962aacb09de75bd6/api-tests/test_endpoints.py#L14-L19) |
| `GET /api/shape/{title}` | [`sefaria/urls_shared.py:104`](https://github.com/Sefaria/Sefaria-Project/blob/1f7d0844ca6a9eddc8e48168962aacb09de75bd6/sefaria/urls_shared.py#L104) | [`reader/views.py:2204-2304`](https://github.com/Sefaria/Sefaria-Project/blob/1f7d0844ca6a9eddc8e48168962aacb09de75bd6/reader/views.py#L2204-L2304) | [`api-tests/test_endpoints.py:56-58`](https://github.com/Sefaria/Sefaria-Project/blob/1f7d0844ca6a9eddc8e48168962aacb09de75bd6/api-tests/test_endpoints.py#L56-L58) |
| `GET /api/links/{tref}` | [`sefaria/urls_shared.py:95`](https://github.com/Sefaria/Sefaria-Project/blob/1f7d0844ca6a9eddc8e48168962aacb09de75bd6/sefaria/urls_shared.py#L95) | [`reader/views.py:2344-2391`](https://github.com/Sefaria/Sefaria-Project/blob/1f7d0844ca6a9eddc8e48168962aacb09de75bd6/reader/views.py#L2344-L2391), [`sefaria/client/wrapper.py:164-327`](https://github.com/Sefaria/Sefaria-Project/blob/1f7d0844ca6a9eddc8e48168962aacb09de75bd6/sefaria/client/wrapper.py#L164-L327) | [`api-tests/test_endpoints.py:22-26`](https://github.com/Sefaria/Sefaria-Project/blob/1f7d0844ca6a9eddc8e48168962aacb09de75bd6/api-tests/test_endpoints.py#L22-L26) |

The source audit establishes these constraints before overlay work:

- The v3 text response builder starts with `versions`, `missings`, `available_langs`, and `available_versions`. The handler removes `missings` and `available_langs` and adds `warnings`.
- The v3 text handler reads every `version` query value with `request.GET.getlist("version")`, so the generated request contract must permit a repeated parameter.
- The v3 text handler returns 404 for an invalid or empty reference. It returns 400 for an invalid `return_format` or an adapter failure.
- V3 text success fields include unconditional reference fields and conditional spanning, index, node, source, and linker fields. Required lists must follow the handler branches.
- The versions route names its parameter `tref`, and the tests pass `Genesis 1:1`. The OpenAPI path calls the same parameter `index`.
- The versions endpoint calls `Ref.version_list()`. A successful response is a list of version metadata. Book-level requests can add `firstSectionRef`.
- Live versions probes on August 30, 2026 returned `versionSource: null` for one Rashi on Genesis version and `status: null` for one Sefer HaChinukh version.
- A live invalid versions reference on August 30, 2026 returned HTTP 200 with a JSON `error` object through `catch_error_as_json`.
- The ref endpoint returns HTTP 200 with `{ "is_ref": false }` for expected parse failures. Successful fields depend on the node type and reference depth.
- The index endpoint delegates to `Index.contents()`. Query parameters can add content counts and related topics.
- `index_api` uses `catch_error_as_json`; an invalid title therefore returns an HTTP 200 JSON error object. A live invalid-title probe confirmed this branch on August 30, 2026.
- The shape endpoint returns a list for a text, complex text, corpus, or category. Each shape record uses lower-case `section`, `length`, `chapters`, and `book`, plus `heTitle`, `title`, and `heBook`.
- The shape collapse branch omits `title` and `heTitle` from aggregate complex-book records. The handler parses `dependents` with `bool(int(...))` and reads but does not use the deprecated `depth` value. A live Talmud shape probe on August 30, 2026 returned five collapsed records.
- The links endpoint defaults to `with_text=1`. A successful response is a list. Text and version fields can be strings, arrays, or null because merged and missing versions use different branches.
- The repeatable `category` query is read with `request.GET.getlist("category")`.
- When `with_sheet_links=1`, `format_sheet_as_link()` adds `isSheet`, `index_title`, `category`, `collectiveTitle`, `sourceRef`, and `sourceHeRef` to sheet results before appending them to the same response list.
- Essay links expose `displayedText` as an object with required `en` and `he` strings. Live Genesis 1:1 links on August 30, 2026 contained this branch.
- A live invalid links reference on August 30, 2026 returned HTTP 200 with a JSON `error` object.

These source facts constrain the overlay. Deployed fixtures must still cover representative data-dependent branches.

## Linker HTML trust

`linker.v3/popup.js` builds its shell with `innerHTML` at `popup.js:238`. It writes API text through `innerHTML` at `popup.js:313-319`.

DOMPurify is present in the Linker. `main.js:15` uses it for text from the host page. It does not protect the path that writes Sefaria HTML.

This evidence does not prove that untrusted content reaches the path. It does show that a reusable component needs a clear trust boundary.

The [text-processing specification](specs/text-processing.md) requires sanitization before HTML enters a third-party page.

## Vocalization differences

The implementations disagree on U+05C0 PASEQ.

| Implementation | Behavior |
| --- | --- |
| Web, `TextRange.jsx:284-290` | Always removes PASEQ |
| Mobile, `sefaria.js:1286-1292` | Removes PASEQ only after whitespace and also removes that whitespace |
| Linker, `popup.js:314` | Always removes PASEQ and has no reader control |

The mobile behavior is careful about linguistic use. It also changes spacing.

## Loss in plain-text API results

Live probes showed that `return_format=text_only` removes footnote content. The format does not only remove tags.

The format also changes `G<small>OD</small>` to `GOD` in the JPS translation. The small capitals distinguish the Tetragrammaton from _Elohim_.

The resulting English looks plausible after the distinction disappears. This is the same failure class as an unnoticed Hebrew code-point change.

`bisl-torah` requests `text_only`. It also contains footnote parsing and a footnote user control. That request path cannot receive footnotes.

## Text response shape

Targeted live `/api/v3/texts` probes on August 27, 2026 showed that text content lives under each item in `versions`.

`Genesis 1:1` returned a string. `Genesis 1:1-3` returned an array. `Genesis 1:31-2:2` returned nested arrays for the spanning range.

## Current front-end cache

The current front-end text cache grows for the lifetime of the page. It has no eviction and no expiry.

The front end also combines concurrent requests for the same URL.

## Web and mobile footnote results

The web reader receives footnote bodies and markers. It hides a footnote body until the user activates its marker.

The mobile client sends `stripItags: true` on main-text requests at `Sefaria-Mobile/api.js:269`.

The server runs footnote, inline-commentator, and marker normalizers at `sefaria/model/text.py:1264`.

Footnote bodies and markers do not reach the mobile device. No mobile option restores them.

The evidence does not show whether this is a product rule or a format side effect.

## Bilingual layout

The measured Sefaria web layout uses neither flex nor grid.

The measured mechanism preserves alignment between unequal Hebrew and English text.

## Linker style isolation

The Linker emits `<style scoped>` at `popup.js:56`.

Current browsers ignore the removed `scoped` attribute. Popup rules and font imports therefore apply to the host page.

Generic selectors can change host elements. Each host also receives imports for Crimson Text, Frank Ruhl Libre, and Heebo.

A shadow root supplies the isolation that the existing markup assumes.

## Linker theme behavior

The popup stylesheet contains fixed foreground and background colors. It has no `prefers-color-scheme` behavior.

A dark host page receives a light popup by default.

Host CSS can override the popup only because the styles leak. This is not a stable theme contract.

## Linker keyboard behavior

The deployed popup:

- sets `role="dialog"`
- moves focus into the popup
- restores focus to the trigger
- closes on Escape
- connects the trigger with `aria-controls`

Its Tab handler calls `preventDefault()` without a new focus target. The handler suppresses Tab instead of cycling focus.

The close control is a `div`. It has no accessible name or keyboard handler.

## Web footnote keyboard behavior

The web reader's `sup.footnote-marker` has a delegated click handler at `TextRange.jsx:229`.

Its style has `:hover` at `s2.css:6551-6559`, but no `:focus`. The marker has no `tabindex`.

## Consumer implementations

Torah Chat teaches reference normalization and URL construction through prompt examples in `src/prompts.ts`.

Its concise-mode handler tells the model not to summarize returned source text in `src/chat-engine.ts`.

These patterns show consumer demand for reference handling and a rendered source surface.

`bisl-torah` has a two-state vowel control and three layout modes. Those choices support separate vocalization controls and an `auto` bilingual layout.

## MCP server observations

At `d409602`, `Sefaria/sefaria-mcp` is a Python and FastMCP service.

The server has approximately 14 tools. It also has SSE routes, OAuth metadata stubs, Prometheus metrics, Docker packaging, and an unpinned FastMCP dependency.

A server copy creates a large maintenance surface.

FastMCP 3.2.4 supports MCP Apps through:

- `@mcp.resource("ui://...")`
- `text/html;profile=mcp-app` resources
- `AppConfig(resourceUri="ui://...")` on tools

This API supports a small additive integration.

## MCP host interaction

A June experiment used LibreChat, a Copilot bridge, and VS Code.

Buttons in the MCP interface window did not work at the end of that experiment. The evidence does not show a component failure.

Host support changes quickly. The Core MCP flow therefore uses a narrow interaction set and names one tested host.

## Connection volume

One measured verse had 957 commentary links.

Rendering every result creates 957 commentary items for this example.
