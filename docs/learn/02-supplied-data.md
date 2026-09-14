> Created/edited by GitHub Copilot; pending human review.

# 2. Set up and render supplied data

## Objective

Run the private toolkit from this workspace or locally packed tarballs, validate a supplied `Micah 6:8` payload, project it with the pure source-card factory, and render it with zero requests.

## Prerequisites

- Complete [Web Components and ownership](01-web-components.md).
- Node.js 22.12 or later, pnpm 11.22.0, and Chromium.
- Repository access. The packages are private and unpublished; there is no npm or CDN installation command.

## Try it

For the workspace path:

```powershell
corepack enable
pnpm install
pnpm build
pnpm dev:vanilla
```

The maintained vanilla example validates its imported JSON fixture before projection. The essential browser module is:

```ts
import { zCoreV3TextsResponse } from "@sefaria/client";
import "@sefaria/web-components";
import type { SefariaSourceCard } from "@sefaria/web-components";
import { createSourceCardViewModel } from "@sefaria/web-components/source-card";

import payload from "./micah-6-8.json";

const card = document.querySelector<SefariaSourceCard>("sefaria-source-card");
if (!card) throw new Error("The source-card element is missing.");

const validated = zCoreV3TextsResponse.parse(payload);
card.viewModel = createSourceCardViewModel(validated, {
  tref: "Micah 6:8",
});
```

For an external local-tarball consumer, first build and pack all three private packages:

```powershell
pnpm build
New-Item -ItemType Directory -Force .artifacts\local-packages
pnpm --filter @sefaria/client pack --pack-destination .artifacts\local-packages
pnpm --filter @sefaria/text-transform pack --pack-destination .artifacts\local-packages
pnpm --filter @sefaria/web-components pack --pack-destination .artifacts\local-packages
```

Copy the three tarballs into an external Vite project. Its `package.json` must point both top-level dependencies and pnpm overrides at those local files so internal private dependencies do not resolve through a registry:

```json
{
  "private": true,
  "type": "module",
  "dependencies": {
    "@sefaria/client": "file:./sefaria-client-0.0.0.tgz",
    "@sefaria/text-transform": "file:./sefaria-text-transform-0.0.0.tgz",
    "@sefaria/web-components": "file:./sefaria-web-components-0.0.0.tgz"
  },
  "pnpm": {
    "overrides": {
      "@sefaria/client": "file:./sefaria-client-0.0.0.tgz",
      "@sefaria/text-transform": "file:./sefaria-text-transform-0.0.0.tgz",
      "@sefaria/web-components": "file:./sefaria-web-components-0.0.0.tgz"
    }
  }
}
```

Use the actual tarball filenames printed by `pnpm pack`. `pnpm package:smoke` performs the repository's stricter external-consumer qualification in a unique directory outside the checkout and verifies that no workspace source or registry fallback is used.

## Expected result

The card displays the supplied Micah 6:8 text and attribution. The browser performs zero Sefaria requests because the host uses validated captured data and the pure factory.

<iframe class="example-frame" title="Vanilla supplied-data example" src="/examples/vanilla/index.html"></iframe>

## Who owns what

The fixture is unknown JSON until `zCoreV3TextsResponse` validates it. `createSourceCardViewModel` owns projection and text preparation. The element owns presentation. No client exists on this path, so a request would be a boundary violation rather than an optimization detail.

## Exercise

Add a request counter around `globalThis.fetch` before the example module loads and assert that it remains zero. Then change the card's `layout` property and confirm the same view-model object is still rendered.

## Source and run links

- Run: `pnpm dev:vanilla`
- Source: [`examples/vanilla-vite/src/main.ts`](https://github.com/Arithmomaniac/sefaria-web-components/blob/feature/avilevin/frontend-toolkit-alpha/examples/vanilla-vite/src/main.ts)
- Fixture transport and tests: [`examples/vanilla-vite`](https://github.com/Arithmomaniac/sefaria-web-components/tree/feature/avilevin/frontend-toolkit-alpha/examples/vanilla-vite)
- Package artifact qualification: [`scripts/test-tarball-consumer.mjs`](https://github.com/Arithmomaniac/sefaria-web-components/blob/feature/avilevin/frontend-toolkit-alpha/scripts/test-tarball-consumer.mjs)

## Next step

Continue to [Load live data and handle interaction](03-live-data.md), or take the parallel [React path](react.md).
