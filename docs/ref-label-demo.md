> Created/edited by GitHub Copilot; pending human review.

# Interactive Reference Label Demo

The browser app in `demos/ref-label-live-demo` contains ordinary HTML request and presentation controls plus one real `<sefaria-ref-label>` result element. The host calls `loadRefLabelViewModel`; the element receives only the resulting view model, `labelLanguage`, and `linked`.

Build the standalone Vite project:

```powershell
pnpm --filter @sefaria-demo/ref-label-live-demo build
```

Start the interactive page:

```powershell
pnpm dev:ref-label
```

Run the headless live exercise:

```powershell
pnpm exec tsx demos/ref-label-live-demo/scripts/capture-demo.ts
```

The September 3, 2026 exercise produced:

```text
segment|data|linked=true|url=https://www.sefaria.org/Genesis.1.1
range|data|linked=true|url=https://www.sefaria.org/Genesis.1.1-3
spanning|data|linked=true|url=https://www.sefaria.org/Genesis.1.31-2.2
commentary|data|linked=true|url=https://www.sefaria.org/Rashi_on_Genesis.1.1.1
empty|empty|linked=false|url=-
```

The preset exercise uses the deployed Sefaria API. It demonstrates current behavior but is not part of the offline repository check.
