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

The maintained vanilla example validates its imported JSON fixture before projection. This is its initial render path:

```ts
import {
  type CoreV3TextsResponse,
  zCoreV3TextsResponse,
} from "@sefaria/client";
import "@sefaria/web-components";
import type { SefariaSourceCard } from "@sefaria/web-components";
import { createSourceCardViewModel } from "@sefaria/web-components/source-card";

import payload from "./micah-6-8.json";

const card = document.querySelector<SefariaSourceCard>("sefaria-source-card");
if (!card) throw new Error("The source-card element is missing.");

const validated = zCoreV3TextsResponse.parse(payload) as CoreV3TextsResponse;
card.viewModel = createSourceCardViewModel(validated, {
  tref: "Micah 6:8",
});
card.selectable = true;
```

The same maintained page also has **Load through the public client**. That explicit action calls `loadSourceCardViewModel` with one injected deterministic response, preserving the public-client and async-factory consumer proof without changing the initial zero-request path.

For an external local-tarball consumer, first build and pack all three private packages:

```powershell
pnpm build
$repository = (Resolve-Path .).Path
$destination = Join-Path $repository ".artifacts\local-packages"
New-Item -ItemType Directory -Force $destination
pnpm --filter @sefaria/client pack --pack-destination $destination
pnpm --filter @sefaria/text-transform pack --pack-destination $destination
pnpm --filter @sefaria/web-components pack --pack-destination $destination
Get-ChildItem $destination -Filter *.tgz
```

`pnpm --filter ... pack` runs from each package directory, so the absolute destination is intentional. Copy the three emitted tarballs into an external Vite project. Its `package.json` points the top-level dependencies at those local files:

```json
{
  "private": true,
  "type": "module",
  "dependencies": {
    "@sefaria/client": "file:./sefaria-client-0.0.0.tgz",
    "@sefaria/text-transform": "file:./sefaria-text-transform-0.0.0.tgz",
    "@sefaria/web-components": "file:./sefaria-web-components-0.0.0.tgz"
  }
}
```

Put the matching transitive overrides in `pnpm-workspace.yaml`, which is the pnpm 11 configuration surface:

```yaml
overrides:
  "@sefaria/client": "file:./sefaria-client-0.0.0.tgz"
  "@sefaria/text-transform": "file:./sefaria-text-transform-0.0.0.tgz"
  "@sefaria/web-components": "file:./sefaria-web-components-0.0.0.tgz"

allowBuilds:
  esbuild: true
```

Use the actual tarball filenames emitted by `pnpm pack`. `pnpm package:smoke` executes this topology in a unique directory outside the checkout: it packs to an absolute destination, discovers and inspects the emitted archives, installs external consumers with exact `file:` dependencies and workspace overrides, and verifies that no workspace source or registry fallback is used.

## Expected result

The card initially displays the supplied Micah 6:8 text and attribution with host request count zero. The browser's global `fetch` also remains unused. Selecting **Load through the public client** increments the host counter to one while the injected fixture transport keeps the example offline.

<iframe class="example-frame" title="Vanilla supplied-data example" src="/examples/vanilla/index.html"></iframe>

## Who owns what

The fixture is unknown JSON until `zCoreV3TextsResponse` validates it. `createSourceCardViewModel` owns projection and text preparation. The element owns presentation. The initial path does not call the client. The explicit second path lets the host call the public async factory with an injected deterministic transport.

## Exercise

Inspect `data-request-count` before and after the explicit client action. Then add a counter around `globalThis.fetch` before the module loads and confirm it stays zero because the example's admitted client action uses its injected fixture transport.

## Source and run links

- Run: `pnpm dev:vanilla`
- Source: [`examples/vanilla-vite/src/main.ts`](https://github.com/Arithmomaniac/sefaria-web-components/blob/feature/avilevin/frontend-toolkit-alpha/examples/vanilla-vite/src/main.ts)
- Fixture transport and tests: [`examples/vanilla-vite`](https://github.com/Arithmomaniac/sefaria-web-components/tree/feature/avilevin/frontend-toolkit-alpha/examples/vanilla-vite)
- Package artifact qualification: [`scripts/test-tarball-consumer.mjs`](https://github.com/Arithmomaniac/sefaria-web-components/blob/feature/avilevin/frontend-toolkit-alpha/scripts/test-tarball-consumer.mjs)

## Next step

Continue to [Load live data and handle interaction](03-live-data.md), or take the parallel [React path](react.md).
