> Created/edited by GitHub Copilot; pending human review.

# 3. Load data and handle interaction

## Objective

Use the public client and async factory after an explicit user action, show loading and failures, handle a real component event, cancel obsolete work, and prevent a stale result from replacing the latest selection.

## Prerequisites

- Complete [Render supplied data](02-supplied-data.md).
- Use a bounded ordinary reference such as `Micah 6:8`.
- Understand that documented HTTP results can become component error view models, while network failures and aborts reject.

## Try it

This host keeps one element mounted and gives each operation an identity:

```ts
import { createSefariaClient } from "@sefaria/client";
import "@sefaria/web-components";
import type { SefariaSourceCard } from "@sefaria/web-components";
import {
  loadSourceCardViewModel,
  type SourceCardViewModel,
} from "@sefaria/web-components/source-card";

const client = createSefariaClient({ cache: false });
const card = document.querySelector<SefariaSourceCard>("sefaria-source-card");
const cardContainer = document.querySelector<HTMLElement>(
  "[data-source-card-content]",
);
const status = document.querySelector<HTMLElement>("[role=status]");
if (!card || !cardContainer || !status) {
  throw new Error("The example host is incomplete.");
}
card.selectable = true;

let controller: AbortController | undefined;
let operation = 0;
let committedViewModel: SourceCardViewModel | undefined;

async function load(tref: string): Promise<void> {
  controller?.abort();
  controller = new AbortController();
  const current = ++operation;
  cardContainer.hidden = false;
  card.viewModel = { state: "loading", message: `Loading ${tref}.` };
  status.textContent = `Loading ${tref}.`;

  try {
    const next = await loadSourceCardViewModel(
      { tref },
      client,
      controller.signal,
    );
    if (!controller.signal.aborted && current === operation) {
      card.viewModel = next;
      committedViewModel = next;
      status.textContent = `Loaded ${tref}.`;
    }
  } catch (error) {
    if (!controller.signal.aborted && current === operation) {
      if (committedViewModel === undefined) {
        cardContainer.hidden = true;
      } else {
        card.viewModel = committedViewModel;
      }
      status.textContent =
        error instanceof Error ? error.message : String(error);
    }
  }
}

card.addEventListener("sefaria-source-select", (event) => {
  status.textContent = `Selected ${(event as CustomEvent).detail.ref}.`;
});
```

Place the element inside `<div data-source-card-content>`. Call `load("Micah 6:8")` only from an explicit form submission or button. This version tracks only settled view models, so overlapping requests cannot preserve another operation's loading placeholder. After a rejected transport request it restores committed content, or hides the light-DOM container when no settled content exists, and reports the failure separately. A documented HTTP 400 or 404 still resolves to the factory's typed error view model; neither path becomes an empty success.

## Expected result

The live explorer starts its current bounded reference when you explicitly open the live page, displays loading or failure visibly, and rejects late completion when another selection supersedes it. Selecting a rendered source emits `sefaria-source-select`; the host receives the detail and decides what happens next.

**Explicit live action:** after starting `pnpm dev:site`, <a href="../../examples/explorer/source-card.html" target="_self">open the source-card explorer</a>. The repository-relative link also opens the maintained source page on GitHub. The local route leaves the lesson and loads data from Sefaria; opening the lesson itself makes no live request.

## Who owns what

The host owns the input, `AbortController`, operation identity, visible transport failure, and event response. The async factory owns the one endpoint request and successful projection. The element remains request-free and does not know why the host selected a reference.

The client cache is disabled here so request-count demonstrations measure the action directly. That is a host choice, not a new client policy.

## Exercise

Start one load, immediately change the reference, and start another. Confirm that the first operation cannot replace the second result. Then trigger a source selection and display the event's `ref` and `position` without querying Shadow DOM.

## Source and run links

- Run: `pnpm dev:source-card`
- Source: [`examples/explorer/src/source-card/app.ts`](https://github.com/Arithmomaniac/sefaria-web-components/blob/feature/avilevin/frontend-toolkit-alpha/examples/explorer/src/source-card/app.ts)
- Connections interaction: [`examples/explorer/src/connections/app.ts`](https://github.com/Arithmomaniac/sefaria-web-components/blob/feature/avilevin/frontend-toolkit-alpha/examples/explorer/src/connections/app.ts)
- Failure semantics: [Data-flow guide](../guides/data-flow.md#failures-stay-at-the-right-boundary)

## Next step

Continue to [Use the controlled Reader or compose a custom host](04-reader.md). React users should also read [Use the elements from React](react.md).
