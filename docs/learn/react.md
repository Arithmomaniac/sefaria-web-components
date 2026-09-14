> Created/edited by GitHub Copilot; pending human review.

# Use the Web Components from React

## Objective

Use React 19 as the host for the same browser registration, source-card factories, view model, and event used by the vanilla path. Keep one custom-element instance mounted, assign object properties without attribute serialization, render a real selection event into React state, and clean up listeners and requests under StrictMode.

This is an integration pattern, not a React wrapper package or toolkit runtime dependency.

## Prerequisites

- Complete [Render supplied data](02-supplied-data.md) and [Load data and handle interaction](03-live-data.md).
- Include `examples/react-vite/src/custom-elements.d.ts` in the consumer's TypeScript project so JSX recognizes the element:

```tsx
import type { SefariaSourceCard } from "@sefaria/web-components";
import type { DetailedHTMLProps, HTMLAttributes, Ref } from "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "sefaria-source-card": DetailedHTMLProps<
        HTMLAttributes<SefariaSourceCard>,
        SefariaSourceCard
      > & { ref?: Ref<SefariaSourceCard> };
    }
  }
}
```

## Try it

Run the maintained app:

```powershell
pnpm dev:react
```

The app imports `@sefaria/web-components` once in its browser entry. Its reusable property helper assigns DOM properties during layout rather than serializing attributes:

```tsx
function useElementProperty<
  TElement extends HTMLElement,
  TKey extends keyof TElement,
>(ref: RefObject<TElement | null>, key: TKey, value: TElement[TKey]): void {
  useLayoutEffect(() => {
    const element = ref.current;
    if (element !== null) element[key] = value;
  }, [key, ref, value]);
}
```

The maintained component keeps the element stable, enables selection for rendered data, attaches the native event once per element, and displays the event through React state:

```tsx
const [selected, setSelected] = useState<SourceSelection>();
const cardRef = useRef<SefariaSourceCard>(null);

useElementProperty(cardRef, "viewModel", viewModel);
useElementProperty(cardRef, "selectable", viewModel.state === "data");
useElementProperty(cardRef, "selectedPosition", selected?.position);

const setCardRef = useCallback((card: SefariaSourceCard | null): void => {
  const previous = cardRef.current;
  if (previous !== null) {
    previous.removeEventListener("sefaria-source-select", onSourceSelection);
  }
  cardRef.current = card;
  if (card !== null) {
    card.addEventListener("sefaria-source-select", onSourceSelection);
  }
}, []);

function onSourceSelection(event: Event): void {
  const detail = (event as CustomEvent<SourceSelection>).detail;
  setSelected({ position: [...detail.position], ref: detail.ref });
}

return (
  <>
    <sefaria-source-card ref={setCardRef} />
    <p aria-live="polite">
      {selected
        ? `React received selection: ${selected.ref}.`
        : "Select the rendered segment to send its event to React."}
    </p>
  </>
);
```

The host also owns request identity and cleanup. These are the load/unmount guards used by the maintained app:

```tsx
const controller = useRef<AbortController | undefined>(undefined);
const operation = useRef(0);
const mounted = useRef(true);

useEffect(() => {
  mounted.current = true;
  return () => {
    mounted.current = false;
    operation.current += 1;
    controller.current?.abort();
  };
}, []);

controller.current?.abort();
const currentController = new AbortController();
controller.current = currentController;
const currentOperation = ++operation.current;

const next = await loadSourceCardViewModel(
  { tref: normalized },
  client,
  currentController.signal,
);
if (
  mounted.current &&
  !currentController.signal.aborted &&
  currentOperation === operation.current
) {
  setViewModel(next);
}
```

## Expected result

The initial card comes from validated supplied data and reports zero requests. **Load from Sefaria** is the only action that calls the public async factory. Selecting the rendered Micah 6:8 row emits `sefaria-source-select`, and the visible React status changes to `React received selection: Micah 6:8.` Theme, width, and displayed-side controls preserve the same element and do not refetch.

React development StrictMode may repeat setup and cleanup. The maintained code removes the listener from the previous element, makes no mount-time request, aborts unmounted work, and rejects stale completion without adding request coalescing or a hidden singleton.

<iframe class="example-frame react" title="React custom-element integration" src="/examples/react/index.html"></iframe>

## Who owns what

React owns state, the typed ref, property assignment, event listener lifecycle, input, loading/error UI, cancellation, stale-result rejection, and element placement. The async factory owns one admitted request and projection. The custom element remains request-free and owns rendering and event emission.

## Exercise

Select the Micah 6:8 segment and confirm the visible React event status changes without inspecting Shadow DOM. Then start two loads quickly and confirm the first signal aborts and cannot replace the second result. Finally unmount during a pending load and verify the signal aborts and listener additions equal removals.

## Source and run links

- [`app.tsx`](https://github.com/Arithmomaniac/sefaria-web-components/blob/feature/avilevin/frontend-toolkit-alpha/examples/react-vite/src/app.tsx)
- [`custom-elements.d.ts`](https://github.com/Arithmomaniac/sefaria-web-components/blob/feature/avilevin/frontend-toolkit-alpha/examples/react-vite/src/custom-elements.d.ts)
- [`use-element-property.ts`](https://github.com/Arithmomaniac/sefaria-web-components/blob/feature/avilevin/frontend-toolkit-alpha/examples/react-vite/src/use-element-property.ts)
- [`app.browser.test.tsx`](https://github.com/Arithmomaniac/sefaria-web-components/blob/feature/avilevin/frontend-toolkit-alpha/examples/react-vite/src/app.browser.test.tsx)
- [React example README](https://github.com/Arithmomaniac/sefaria-web-components/blob/feature/avilevin/frontend-toolkit-alpha/examples/react-vite/README.md)

## Next step

Continue with [Use the controlled Reader or compose a custom host](04-reader.md).
