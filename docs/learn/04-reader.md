> Created/edited by GitHub Copilot; pending human review.

# 4. Use the Reader or compose a custom host

## Objective

Choose the supported controlled Reader when its navigation model fits, and understand the additional responsibilities you accept when composing spatial source and connections panes yourself.

The controlled Reader is the shortest complete path. The toolkit supplies its controller, factories, and element; the host provides the starting reference and data access, binds the controller, and cleans up. You do not implement source selection, connection navigation, cancellation, Back, or breadcrumbs from scratch.

## Prerequisites

- Complete [Load data and handle interaction](03-live-data.md).
- Decide whether your host needs a complete stateful Reader or custom pane placement.

## Try it

The supported path creates the browser client, loads a controller once, binds it to one persistent element, and disposes both:

```ts
import { createSefariaClient } from "@sefaria/client";
import "@sefaria/web-components";
import {
  bindReaderController,
  type SefariaReader,
} from "@sefaria/web-components";
import { loadReaderController } from "@sefaria/web-components/reader-controller";

const element = document.querySelector<SefariaReader>("sefaria-reader");
if (!element) throw new Error("The Reader element is missing.");

const controller = await loadReaderController(
  { tref: "Micah 6:8" },
  createSefariaClient({ cache: false }),
);
const unbind = bindReaderController(element, controller);

window.addEventListener(
  "pagehide",
  () => {
    unbind();
    controller.dispose();
  },
  { once: true },
);
```

Run both maintained website choices:

```powershell
pnpm dev:reader
```

- `controlled.html?tref=Micah%206%3A8` uses the supported controller-backed `<sefaria-reader>`.
- `index.html?tref=Micah%206%3A8` is a lower-level spatial composition.

## Expected result

The controlled Reader owns bounded semantic history, source-to-connections transitions, cancellation, and component event handling while the host owns creation and disposal. The spatial example can keep several panes visible, but its host also owns pane identity, placement, activation, pruning, compact layout, pins, and operation timing.

The same Reader presentation can run with different data paths. A regular website controller can use `@sefaria/client`; an MCP App controller uses host-mediated tools because the sandbox cannot make the same direct requests. In both cases the element receives rendering data and emits events rather than fetching.

**Explicit live actions:** after starting `pnpm dev:site`, <a href="../../examples/reader/controlled.html?tref=Micah%206%3A8" target="_self">open the controlled Reader</a> or <a href="../../examples/reader/index.html?tref=Micah%206%3A8" target="_self">open the spatial Reader</a>. The repository-relative links also open the maintained source pages on GitHub. The local routes load data from Sefaria; opening the lesson itself makes no live request.

## Who owns what

| Choice | Toolkit owns | Host additionally owns |
| --- | --- | --- |
| Controlled Reader | Controller state, navigation, captures, cancellation, binding to the request-free Reader element | Starting reference, client, lifecycle, and placement |
| Spatial composition | Reusable reader session, data source, factories, view models, and elements | Ordered panes, parent/child placement, compact active pane, pruning, pins, cancellation, and visible limits |

The spatial example is a distinct option, not a second supported all-purpose Reader API. Do not copy its private pane coordinator into the component package.

## Exercise

In the controlled Reader, open connections, follow one connection, and use Back. In the spatial Reader, perform the same navigation and identify which behavior belongs to the custom host rather than the shared reader session.

## Source and run links

- Run: `pnpm dev:reader`
- Controlled source: [`examples/reader/src/controlled-app.ts`](https://github.com/Arithmomaniac/sefaria-web-components/blob/feature/avilevin/frontend-toolkit-alpha/examples/reader/src/controlled-app.ts)
- Spatial source: [`examples/reader/src/app.ts`](https://github.com/Arithmomaniac/sefaria-web-components/blob/feature/avilevin/frontend-toolkit-alpha/examples/reader/src/app.ts)
- Illustrated ownership guide: [Reader navigation](../guides/reader-navigation.md)

## Next step

Continue to [Customize presentation and use headless APIs](05-customization.md).
