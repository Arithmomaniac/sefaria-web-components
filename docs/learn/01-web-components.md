> Created/edited by GitHub Copilot; pending human review.

# 1. Understand Web Components and toolkit ownership

## Objective

Understand what the browser registers, why complex values use JavaScript properties rather than HTML attributes, how component events return interaction to the host, and where requests and rendering belong.

## Prerequisites

- Node.js 22.12 or later and pnpm 11.22.0.
- A browser with Chromium-compatible Web Components support. Chromium is the browser qualified by this repository.
- No knowledge of Lit is required to consume the elements.

## Try it

Register the browser elements, create one source card, and assign a render-ready object to its `viewModel` property:

```ts
import "@sefaria/web-components";
import type { SefariaSourceCard } from "@sefaria/web-components";
import type { SourceCardViewModel } from "@sefaria/web-components/source-card";

const card = document.createElement("sefaria-source-card") as SefariaSourceCard;

const model: SourceCardViewModel = {
  state: "loading",
  message: "Waiting for the host.",
};

card.viewModel = model;
card.addEventListener("sefaria-source-select", (event) => {
  console.log((event as CustomEvent).detail);
});
document.body.append(card);
```

The `import "@sefaria/web-components"` statement registers the custom elements in the browser. The non-DOM subpaths, such as `@sefaria/web-components/source-card`, export request types, view models, and factories without registering elements.

An HTML attribute contains text. A component view model is a typed object, so the host assigns it as a property:

```html
<!-- This creates an element, but it does not load or render a passage. -->
<sefaria-source-card></sefaria-source-card>
```

Do not add a `tref`, client, URL, payload, or `fetch` property to an element. When an interaction needs different data, the element emits an event and the host decides whether to load anything.

## Expected result

The element renders its loading state inside Shadow DOM. No network request occurs. The host can listen for the composed selection event without reaching into the component's internal markup.

<iframe class="example-frame" title="Authored request-free component states" src="/examples/explorer/authored.html?component=source-card&amp;scenario=one-item&amp;diagnostics=1"></iframe>

## Who owns what

| Layer | Owns | Does not own |
| --- | --- | --- |
| `@sefaria/client` | Corrected transport calls, response validation, and the bounded per-client response cache | Component state or rendering |
| Pure/async component factories | Projection from validated payloads to one component's view model | DOM layout or host interaction state |
| Web Component | Shadow DOM, accessibility, theme, layout, and event emission | References, requests, clients, or raw payloads |
| Host application | Inputs, loading, cancellation, stale-result rejection, and assigning view models | Reimplementing factory projection |

The complete flow is `client -> pure/async factory -> component-specific view model -> request-free element`. Read [How the pieces fit together](../guides/data-flow.md) for the detailed failure and composition rules.

## Exercise

Open the authored workbench, switch among loading, data, empty, and error source-card scenarios, then change theme and width. Confirm that the diagnostics request count remains zero.

## Source and run links

- Run: `pnpm dev`, then open the authored workbench.
- Source: [`development-status.ts`](https://github.com/Arithmomaniac/sefaria-web-components/blob/feature/avilevin/frontend-toolkit-alpha/examples/explorer/src/authored/development-status.ts)
- Component contract: [`docs/specs/components.md`](../specs/components.md)
- Generated element metadata: [Custom elements](../reference/custom-elements.md)

## Next step

Continue to [Render supplied data with zero requests](02-supplied-data.md).
