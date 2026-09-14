> Created/edited by GitHub Copilot; pending human review.

# React Vite example

This private standalone consumer uses React 19 with the existing `@sefaria/client` and `@sefaria/web-components` packages. It is an integration example, not a React wrapper package and not a toolkit runtime dependency.

Run it from the repository root:

```powershell
pnpm --filter @sefaria-example/react-vite dev
```

The initial source card is projected from validated supplied data and makes no request. Select **Load from Sefaria** to let React call the public client and `loadSourceCardViewModel`; React owns the input, loading status, cancellation, stale-result suppression, and visible transport failures. Theme, preview width, and displayed text sides are element properties and do not fetch.

Select the rendered Micah 6:8 segment to emit `sefaria-source-select`. A page-owned listener updates React state, while the same `<sefaria-source-card>` instance remains mounted across rerenders. The optional source, view-model, and event diagnostics show the public API and object-property flow used by the running page.

The example is currently available only from this unpublished workspace or from locally packed private tarballs. It does not imply an official React package, public registry release, server rendering, hydration, or Sefaria ownership.
