> Created/edited by GitHub Copilot; pending human review.

# Vanilla Vite example

This private example first validates supplied `Micah 6:8` JSON, projects it with the pure source-card factory, and renders it without creating a request. **Load through the public client** then exercises the public async factory with one deterministic injected response. The injected `fetch` keeps the example and smoke test offline from Sefaria; it does not change the client or element request-ownership contracts.

From a fresh toolkit-branch checkout, build the private workspace packages before starting the Vite server:

```powershell
pnpm install --frozen-lockfile
pnpm build
pnpm --filter @sefaria-example/vanilla-vite dev
```

Use `pnpm --filter @sefaria-example/vanilla-vite build` for a later production bundle.
