> Created/edited by GitHub Copilot; pending human review.

# 5. Customize presentation and use headless APIs

## Objective

Change theme, width, visible sides, side order, and layout without refetching, then identify the non-DOM client, factory, Reader, and text-transform entry points available to a custom host.

## Prerequisites

- Complete [Use the Reader](04-reader.md).
- Keep data changes separate from presentation changes.

## Try it

Presentation properties operate on the current view model:

```ts
import type { SefariaSourceCard } from "@sefaria/web-components";

export function customizeCard(card: SefariaSourceCard): void {
  card.contentLanguage = "both";
  card.layout = "side-by-side";
  card.sideOrder = "translation-first";
  card.style.setProperty("--sefaria-surface", "#fffaf2");
  card.style.setProperty("--sefaria-accent", "#6f3f20");
  card.style.maxWidth = "48rem";
}
```

Changing these values must not call a factory or client. Changing the reference or exact edition selector is a data operation and belongs in the host's async lifecycle.

For a headless path, import only the layers you need:

```ts
import { createSefariaClient } from "@sefaria/client";
import { extractFootnotes, sanitizeSefariaHtml } from "@sefaria/text-transform";
import { loadSourceCardViewModel } from "@sefaria/web-components/source-card";

const client = createSefariaClient({ cache: false });
const viewModel = await loadSourceCardViewModel({ tref: "Micah 6:8" }, client);

const safeHtml = sanitizeSefariaHtml("<b>Justice</b>");
const footnotes = extractFootnotes(safeHtml);
console.log(viewModel.state, footnotes);
```

The non-DOM component subpaths are safe to use without registering custom elements. They return rendering data, not server-rendered HTML and not a generalized domain model.

## Expected result

Theme, container width, side visibility, side order, and layout update the current component immediately while the host request counter is unchanged. Headless imports can validate, transform, or project data without accessing `window`, `document`, or custom-element registration.

<iframe class="example-frame" title="Authored customization workbench" src="/examples/explorer/authored.html?component=source-card&amp;scenario=many-items&amp;diagnostics=1&amp;width=720"></iframe>

## Who owns what

The element owns supported visual properties and CSS custom properties. The host owns the containing layout and decides when a changed input requires new data. `@sefaria/text-transform` owns pure markup handling; component factories own component-specific projection; the client owns transport and validation.

## Exercise

Open the authored workbench, record its request count, then change theme, width, layout, side order, and displayed language. Confirm the count does not change. Next, inspect the generated export inventory and choose the smallest non-DOM subpath for a host that never renders an element.

## Source and run links

- Run: `pnpm dev`
- Authored controls: [`examples/explorer/src/authored/development-status.ts`](https://github.com/Arithmomaniac/sefaria-web-components/blob/feature/avilevin/frontend-toolkit-alpha/examples/explorer/src/authored/development-status.ts)
- Client README: [`packages/client/README.md`](https://github.com/Arithmomaniac/sefaria-web-components/blob/feature/avilevin/frontend-toolkit-alpha/packages/client/README.md)
- Text-transform README: [`packages/text-transform/README.md`](https://github.com/Arithmomaniac/sefaria-web-components/blob/feature/avilevin/frontend-toolkit-alpha/packages/text-transform/README.md)
- Web-components README: [`packages/web-components/README.md`](https://github.com/Arithmomaniac/sefaria-web-components/blob/feature/avilevin/frontend-toolkit-alpha/packages/web-components/README.md)
- Generated exports: [Public package exports](../reference/public-exports.md)

## Next step

Continue to [Integrate an authored article or MCP host](06-host-integration.md).
