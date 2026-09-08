> Created/edited by GitHub Copilot; pending human review.

# Render Sefaria text

[Documentation](../README.md) / Render text

Start with a source card if you want a passage, its primary text and translation when available, a heading, and edition attribution. Use the smaller components when your application already supplies the surrounding context.

These examples target the current private workspace packages. There is no published-package or CDN installation recipe yet.

## Try the existing demos

Install the workspace's JavaScript dependencies with Node.js 22.12 or later and pnpm 11.22.0:

```powershell
pnpm install
pnpm dev:source-card
```

Open the local Vite URL printed in the terminal and select a preset. The live demos use the deployed Sefaria API; their available text depends on that service. Python and an MCP host are not needed for these browser demos.

| Command | What to explore |
| --- | --- |
| `pnpm dev:source-card` | A single segment, ranges, nested text, one-sided results, and attribution once per selected edition |
| `pnpm dev:bilingual-segment` | Primary/translation roles and side visibility, order, and layout for one segment |
| `pnpm dev:text-segment` | One text version, direction, static footnotes, and empty or wrong-granularity outcomes |
| `pnpm dev:ref-label` | Canonical labels and links for segments, ranges, commentary, and unresolvable references |
| `pnpm dev` | Authored view-model states, without API requests |

[Development](../development.md) covers Corepack, full setup, and contributor commands. MCP and Linker setup and qualification commands are described there separately from these browser components.

## Choose a component

| Need | Element | Non-DOM factory subpath |
| --- | --- | --- |
| One selected text version of one segment | `<sefaria-text-segment>` | `@sefaria/components/text-segment` |
| One segment's primary and translation sides | `<sefaria-bilingual-segment>` | `@sefaria/components/bilingual-segment` |
| A canonical reference label, optionally linked | `<sefaria-ref-label>` | `@sefaria/components/ref-label` |
| A passage as a bounded collection, including a singleton | `<sefaria-source-card>` | `@sefaria/components/source-card` |

There is no separate text-range component: the source card covers that role. A bilingual segment is not a miniature source card; reference and edition attribution belong at the card boundary.

## Put a source card in a browser app

The following is a complete browser TypeScript module for a Vite-style app with access to this workspace's packages. It creates the element, sets a loading model, makes one request, and displays the result.

```ts
import "@sefaria/components";
import { createSefariaClient } from "@sefaria/client";
import { loadSourceCardViewModel } from "@sefaria/components/source-card";

const card = document.createElement("sefaria-source-card");
const hostError = document.createElement("p");
hostError.setAttribute("role", "alert");
document.body.append(card, hostError);

card.viewModel = { state: "loading", message: "Loading passage..." };
const client = createSefariaClient();

try {
  card.viewModel = await loadSourceCardViewModel({ tref: "Micah 6:8" }, client);
} catch (error) {
  card.remove();
  hostError.textContent =
    error instanceof Error ? error.message : String(error);
}
```

The catch displays a **host failure**, such as a network or contract-validation failure. It does not manufacture an empty or successful component result. Documented HTTP failures and projection failures are already represented by the factory's returned view model.

`viewModel` is a JavaScript property, not an HTML attribute. Setting `<sefaria-source-card tref="Micah 6:8">` will not fetch a passage. The [data-flow guide](data-flow.md) explains why the factory and element are separate.

The package import registers the current elements. The `document.createElement` call is typed through those registrations; no cast to a component class or to an API payload is needed.

## Select editions explicitly when you need them

Without exact edition selectors, the source-card factory requests the primary and translation roles. If you need a particular edition, use its exact `versionTitle`, not its position in an API array:

```ts
import type { SourceCardRequest } from "@sefaria/components/source-card";

export function requestForEditions(
  tref: string,
  primaryTitle: string,
  translationTitle: string,
): SourceCardRequest {
  return {
    tref,
    primary: { versionTitle: primaryTitle },
    translation: { versionTitle: translationTitle },
  };
}
```

Obtain the titles from version metadata or the live demo's edition controls. A title is not guaranteed to be available for every passage. Missing requested content remains visible as missing or partial data; the factory does not invent a replacement.

“Primary” and “translation” are roles, not synonyms for “Hebrew” and “English.” Direction comes from the selected version's data. Some upstream metadata has more than one `isPrimary` version, so exact selectors and the factory's role-resolution rules matter.

## Change presentation without refetching

After creating the `card` above, these are presentation-only assignments:

```ts
card.layout = "side-by-side";
card.sideOrder = "translation-first";
```

They reuse the current view model. `sideOrder` controls the side-by-side tracks; stacked layout keeps the primary side first. For responsive placement, the default automatic layout follows the card's available width. See the [bilingual and source-card contracts](../specs/components.md) for the current property values and role-based display controls.

Changing a reference or edition instead calls the async factory again. In an interactive host, pass an `AbortSignal` as its third argument, cancel obsolete work, and guard against a late result replacing the latest selection. The one-shot example above deliberately has no selection-changing controls.

## What to expect from incomplete text

| Input situation | Expected interpretation |
| --- | --- |
| A single segment | One source-card item |
| A range or nested response | Ordered items determined by the actual text structure, not just `isSpanning` |
| Text on only one requested side | Partial items retaining the available text |
| A position empty on both sides | No invented filler text |
| Scalar text on one side and an array at the same position on the other | A projection error, not guessed alignment |
| No renderable text | An empty card model |

The live source-card demo illustrates these cases. Its historical captures are preserved in the [documentation archive](../archive/README.md), but fixed capture counts are not a promise about a changing upstream corpus.

If you already have a payload from a server or fixture, use the [validated pure-factory path](data-flow.md#already-have-the-json) instead of fetching it again. To understand embedded annotations, continue with [Text markup](text-markup.md).
