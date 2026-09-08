> Created/edited by GitHub Copilot with human review/feedback by avilevin.

# `@sefaria/components`

`@sefaria/components` provides pure view-model factories and request-free Lit elements for Sefaria reading surfaces. Elements receive component-specific rendering data through JavaScript properties; they do not accept references, clients, raw API payloads, or `fetch`.

This is a private source workspace package, not a published npm installation.

## Choose an entry point

| Goal | Recommended entry point |
| --- | --- |
| Register all current custom elements | `@sefaria/components` |
| Render a passage or range | `@sefaria/components/source-card` |
| Render one primary/translation pair | `@sefaria/components/bilingual-segment` |
| Render one selected edition | `@sefaria/components/text-segment` |
| Render a reference label | `@sefaria/components/ref-label` |
| Render and page contextual links | `@sefaria/components/connections-panel` |
| Use the supported stateful Reader | `@sefaria/components/reader-controller` and `@sefaria/components/reader` |
| Build custom host navigation | `@sefaria/components/reader-session` |

## Prebuilt Reader

```ts
import "@sefaria/components";
import { createSefariaClient } from "@sefaria/client";
import {
  bindReaderController,
  loadReaderController,
} from "@sefaria/components/reader-controller";

const reader = document.createElement("sefaria-reader");
document.body.append(reader);

const controller = await loadReaderController(
  { tref: "Micah 6:8" },
  createSefariaClient(),
);
const unbind = bindReaderController(reader, controller);

// During host teardown:
unbind();
controller.dispose();
```

Use a component's pure factory when corrected API-shaped JSON has already crossed a validated server, MCP, fixture, stored-data, or user-input boundary. Use its async factory for browser client mode. A successful async result is the same projection as the pure factory over its captured payload.

See [Render text](../../docs/guides/render-text.md) for smaller components, [Reader navigation](../../docs/guides/reader-navigation.md) for packaged versus custom composition, and the [component specification](../../docs/specs/components.md) for exact contracts.
