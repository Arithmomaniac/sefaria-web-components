> Created/edited by GitHub Copilot with human review/feedback by avilevin.

# Reader examples

Run both Reader destinations from the repository root:

```powershell
pnpm --filter @sefaria-example/reader dev
```

## Supported controlled Reader

[Open `controlled.html`](controlled.html?tref=Micah%206%3A8) for the shortest supported path. The page creates an `@sefaria/client` instance, calls `loadReaderController` from `@sefaria/web-components/reader-controller`, binds it to `<sefaria-reader>`, reports controller task state, and disposes requests, subscriptions, and bindings.

The element remains request-free. Source selection, connection navigation, history, and errors flow through the controller owned by the host.

## Website-owned spatial workspace

[Open `index.html`](index.html?tref=Micah%206%3A8) when studying custom composition. This host owns multiple source/connections panes, activation, close/prune policy, session pins, contextual requests, cancellation, and compact responsive selection. It reuses `@sefaria/web-components/reader-session`, the public factories, and the same component events, but the spatial pane policy is example code rather than supported Reader API policy.

Both pages accept a URL-encoded `?tref=` initial reference and retain `Micah 6:8` as the bounded fallback.
