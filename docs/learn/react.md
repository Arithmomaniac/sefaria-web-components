> Created/edited by GitHub Copilot; pending human review.

# Use the Web Components from React

This is a branch from the supplied-data and interaction lessons. It uses React 19 as a host for the same browser registration, source-card factory, view model, and event used by the vanilla example. It is not a React wrapper package, and React is not a toolkit runtime dependency.

## Assign typed properties and events

Keep the custom element stable, assign complex values through its typed DOM property, and attach the real event listener to the element:

```tsx
import "@sefaria/web-components";
import type { SefariaSourceCard } from "@sefaria/web-components";
import type { SourceCardViewModel } from "@sefaria/web-components/source-card";
import { useCallback, useEffect, useRef } from "react";

function SourceCard({ viewModel }: { viewModel: SourceCardViewModel }) {
  const cardRef = useRef<SefariaSourceCard>(null);

  useEffect(() => {
    if (cardRef.current) cardRef.current.viewModel = viewModel;
  }, [viewModel]);

  const setCardRef = useCallback((card: SefariaSourceCard | null) => {
    const previous = cardRef.current;
    previous?.removeEventListener("sefaria-source-select", onSelect);
    cardRef.current = card;
    card?.addEventListener("sefaria-source-select", onSelect);
  }, []);

  function onSelect(event: Event): void {
    const detail = (event as CustomEvent<{ ref: string }>).detail;
    console.log(detail.ref);
  }

  return <sefaria-source-card ref={setCardRef} />;
}
```

Do not write `view-model={viewModel}` in JSX: React would serialize an attribute instead of assigning the component's object property. The maintained example uses a small typed `useElementProperty` hook for repeated property assignments, not a general binding framework.

## Load and clean up

The React host creates the client once, starts requests only from an explicit submit action, and owns an `AbortController` plus an operation counter. Its effect cleanup marks the component unmounted, invalidates pending operations, and aborts the current request.

React development StrictMode intentionally exercises setup and cleanup more than once. Correct code removes the listener from the previous element and does not issue a mount-time request, so StrictMode does not require request coalescing or a hidden singleton.

## Try it

```powershell
pnpm dev:react
```

The initial card uses supplied validated data and reports zero requests. **Load from Sefaria** uses the public async factory with `cache: false`. Selecting the rendered Micah 6:8 row sends a real `sefaria-source-select` event back to React state. Theme, width, and displayed-side controls keep the same element instance and do not refetch.

<iframe class="example-frame" title="React custom-element integration" src="/examples/react/index.html"></iframe>

## Source and tests

- [`app.tsx`](https://github.com/Arithmomaniac/sefaria-web-components/blob/feature/avilevin/frontend-toolkit-alpha/examples/react-vite/src/app.tsx)
- [`use-element-property.ts`](https://github.com/Arithmomaniac/sefaria-web-components/blob/feature/avilevin/frontend-toolkit-alpha/examples/react-vite/src/use-element-property.ts)
- [`app.browser.test.tsx`](https://github.com/Arithmomaniac/sefaria-web-components/blob/feature/avilevin/frontend-toolkit-alpha/examples/react-vite/src/app.browser.test.tsx)
- [React example README](https://github.com/Arithmomaniac/sefaria-web-components/blob/feature/avilevin/frontend-toolkit-alpha/examples/react-vite/README.md)

Continue with [Use the controlled Reader or compose a custom host](04-reader.md).
