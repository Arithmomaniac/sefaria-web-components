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
