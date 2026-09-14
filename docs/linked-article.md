> Created/edited by GitHub Copilot with human review/feedback by avilevin.

# Authored linked article

The private linked-article example starts with ordinary authored Sefaria anchors and progressively enhances eligible activation with the request-free `<sefaria-popup>` component. It does not detect citations, extract article text, poll, rewrite host DOM, install a global script, or use a bookmarklet.

## Run the example

```powershell
pnpm install --frozen-lockfile
pnpm build
pnpm dev:linked-article
```

Open the loopback URL printed by Vite. The maintained article uses the bounded `Micah 6:8` reference.

## Author the native link

```html
<a href="https://www.sefaria.org/Micah.6.8" data-sefaria-ref="Micah 6:8">
  Micah 6:8
</a>
```

The `href` is the native authority. With JavaScript disabled, modifier navigation, an alternate target, a download link, or a non-primary pointer activation, the browser retains ordinary anchor behavior. The explicit `data-sefaria-ref` is input only to the page enhancement.

## Own the enhancement in the page

[`examples/linked-article/src/app.ts`](../examples/linked-article/src/app.ts) creates a cache-disabled `@sefaria/client`, calls `loadPopupViewModel`, supplies loading and terminal component view models to one `<sefaria-popup>`, aborts superseded work, rejects obsolete completions, reports rejected integration operations outside the element, and removes only its owned listeners, accessibility attributes, request, popup, and status state during cleanup.

The element receives only the popup view model, the authored anchor used for placement/focus restoration, and the open property. It receives no reference, payload, client, host, or fetch function.

## Deterministic qualification

The browser tests call the real public popup async factory through a strict fixture fetch. The transport accepts only one GET to the expected origin, decoded `Micah 6:8` path, and ordered primary/translation/default query. An unexpected method, origin, path, or query rejects instead of returning default success. The client validates the unknown JSON before the factory projects it.

Separate Playwright coverage starts the actual page on an assigned loopback port with JavaScript disabled and proves that activation navigates to the authored Sefaria URL.

## Theming

The current popup defaults to a Sefaria-inspired parchment, berry, serif, and dark-mode palette. It inherits the embedding document's `color-scheme`, and hosts can override `--sefaria-surface`, `--sefaria-surface-muted`, `--sefaria-fg`, `--sefaria-fg-muted`, `--sefaria-border`, `--sefaria-border-strong`, `--sefaria-accent`, `--sefaria-accent-soft`, `--sefaria-danger`, `--sefaria-link`, `--sefaria-shadow`, `--sefaria-font-english`, and `--sefaria-font-hebrew` on any ancestor.

The popup's shadow DOM prevents ordinary host selectors from styling its internal dialog. Popup rules do not style the authored anchor; the article owns its own link and focus presentation.

## Retired automatic Linker

The detection, extraction, polling, bookmarklet, and global-script distribution are intentionally retired from the maintained tree. Their immutable source is available at [`7bc2d258fac2959beb5252ebdbcbddbaccd0c7b7`](https://github.com/Arithmomaniac/sefaria-web-components/tree/7bc2d258fac2959beb5252ebdbcbddbaccd0c7b7/demos/linker).
