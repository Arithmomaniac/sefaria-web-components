> Created/edited by GitHub Copilot; pending human review.

# Authored linked article

This private, unpublished example progressively enhances ordinary Sefaria citation links with the request-free `<sefaria-popup>` component. The article author supplies both the native `href` and the explicit `data-sefaria-ref`; the page does not detect citations, rewrite prose, install a global script, or use a bookmarklet.

## Run locally

From a clone of the repository:

```powershell
pnpm install --frozen-lockfile
pnpm build
pnpm dev:linked-article
```

Open the loopback URL printed by Vite. Activate the `Micah 6:8` link for a live Sefaria popup. Disable JavaScript or use modifier/context-menu navigation to confirm that the authored `https://www.sefaria.org/Micah.6.8` destination remains usable.

## Ownership

[`src/app.ts`](src/app.ts) owns client creation, popup loading, cancellation, stale-result suppression, integration failure reporting, and cleanup. It calls the public [`@sefaria/web-components/popup`](../../packages/web-components/src/popup.ts) async factory with the client cache disabled. Documented HTTP failures remain popup view models; rejected network, abort, or contract operations remain integration-owned rather than being relabeled as component success. `<sefaria-popup>` receives only a view model, anchor, and open state.

Deterministic tests inject a strict fixture transport that rejects unexpected methods, origins, paths, and query parameters. Unknown response JSON still crosses the real `@sefaria/client` validation boundary before the public popup factory projects it.

The retired automatic Linker, bookmarklet, detection, extraction, and polling implementation remains available in the immutable [`7bc2d258fac2959beb5252ebdbcbddbaccd0c7b7` archive](https://github.com/Arithmomaniac/sefaria-web-components/tree/7bc2d258fac2959beb5252ebdbcbddbaccd0c7b7/demos/linker).
