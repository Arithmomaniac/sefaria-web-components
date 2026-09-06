> Created/edited by GitHub Copilot with human review/feedback by avilevin.

# Linker demonstration

The Linker demonstration turns citations in an ordinary article into Sefaria links and opens a request-free `<sefaria-popup>` when a reader activates one. The integration uses Sefaria's asynchronous find-refs service; it does not parse citations locally.

## Build the artifacts

Configure the public HTTPS location that will host the script, then build:

```powershell
$env:SEFARIA_LINKER_ARTIFACT_URL = "https://example.org/assets/sefaria-linker.js"
pnpm --filter @sefaria-demo/linker build
```

The build writes `sefaria-linker.js`, `bookmarklet.txt`, `index.html`, and `bookmarklet-demo.html` under `demos/linker/dist`.

For local-only testing, omit the environment variable. The generated bookmarklet then loads `http://localhost:4173/sefaria-linker.js`.

## Embed the script

Load the classic script and call the public API after it is ready:

```html
<script src="https://example.org/assets/sefaria-linker.js"></script>
<script>
  SefariaLinker.link();
</script>
```

The authored `index.html` demonstration uses an equivalent ready-event loader. A scan submits the readable article title and body once, polls the returned task, and wraps only validated unambiguous matches. Calling `SefariaLinker.link()` again removes owned wrappers and performs a fresh scan.

Use `SefariaLinker.destroy()` to abort active work, close the popup, remove integration UI, and unwrap only links created by this script.

## Use the bookmarklet

Serve the built directory, open `bookmarklet-demo.html`, and create a browser bookmark whose URL is the full contents of `bookmarklet.txt`. Invoking it loads `sefaria-linker.js`; invoking it again reuses the loaded API and starts a new scan.

## Configuration

```js
await SefariaLinker.link({
  baseUrl: "https://www.sefaria.org",
  contentSelector: "article",
  includeSelectors: [".article-notes"],
  excludeSelectors: [".sponsor-message"],
});
```

`contentSelector` selects the primary host subtree. Additional selectors are included once unless already inside the primary subtree. Exclusions supplement the built-in exclusions for anchors, controls, scripts, styles, editable or hidden content, tables, superscripts, and Linker-owned UI.

## Theming

The current popup defaults to a Sefaria-inspired parchment, berry, serif, and dark-mode palette. It inherits the embedding document's `color-scheme`, and hosts can override `--sefaria-surface`, `--sefaria-surface-muted`, `--sefaria-fg`, `--sefaria-fg-muted`, `--sefaria-border`, `--sefaria-border-strong`, `--sefaria-accent`, `--sefaria-accent-soft`, `--sefaria-danger`, `--sefaria-link`, `--sefaria-shadow`, `--sefaria-font-english`, and `--sefaria-font-hebrew` on any ancestor.

The Linker marks generated citation anchors with `data-sefaria-linker-owned` and applies a visible accent, dotted underline, and keyboard focus treatment without changing existing host links.

The current safety bounds are 50,000 document elements, 20,000 eligible text nodes, and 250,000 UTF-16 code units. Pages above any bound fail visibly instead of being partially scanned.

## Host requirements and limitations

- The host must allow the script URL through `script-src` and `https://www.sefaria.org` through `connect-src`.
- An HTTPS page cannot load an HTTP artifact because browsers block mixed content.
- CORS, Trusted Types, browser internal pages, extension stores, and strict site policies may prevent loading or requests.
- If policy blocks the bookmarklet before any code runs, the script cannot display an in-page error.
- The integration deliberately does not send tracking metadata, fetch remote site-specific selectors, register page backlinks, or submit debug reports.
- The script preserves existing links and excluded elements. Matches that are failed, ambiguous, overlapping, stale, or not exactly mappable remain unchanged.
