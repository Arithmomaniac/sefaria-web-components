> Created/edited by GitHub Copilot; pending human review.

# Sefaria Frontend Toolkit

[Sefaria](https://www.sefaria.org/) is a free digital library of Jewish texts and translations. This frontend toolkit helps developers build reading and learning experiences with that data without rebuilding bilingual text, footnotes, attribution, connection navigation, and accessible Reader behavior from scratch.

Start with the complete Reader, use individual browser-standard Web Components from vanilla JavaScript or React, or use the client, factories, and text transforms without rendering components. The current components focus on reading surfaces, but the project boundary is a reusable frontend/UI toolkit rather than a replacement for Sefaria's website.

> **Experimental and unpublished.** This public source repository is a development project with no support or stability guarantee. It is not an official Sefaria product, and its private packages are not available from a public registry or CDN.

## First run

Start from a checkout of `feature/avilevin/frontend-toolkit-alpha`, or a work branch based on it. With Node.js 22.12 or later, pnpm 11.22.0, and Chromium:

```powershell
corepack enable
pnpm install
pnpm dev:site
```

The command builds the maintained private examples and opens the local documentation source in development mode. It does not deploy anything or contact Sefaria until you explicitly use a live example action.

If you want the shortest component proof instead of the documentation site:

```powershell
pnpm build
pnpm dev:vanilla
```

That example validates a supplied `Micah 6:8` payload, projects it through the public pure factory, and renders it with zero requests. Its explicit button then exercises the public client and async factory with one injected offline response. [Local tarball setup](docs/learn/02-supplied-data.md#try-it) covers an external consumer that cannot resolve workspace source.

## Choose a path

| Goal | Start here |
| --- | --- |
| Learn step by step | [Web Components and ownership](docs/learn/01-web-components.md) |
| Use the prebuilt Reader | [Controlled Reader or custom composition](docs/learn/04-reader.md) |
| Explore components and states | [Example catalog](examples/README.md) |
| Customize display or build a host | [Customization and headless APIs](docs/learn/05-customization.md) |
| Use React | [React integration path](docs/learn/react.md) and [`examples/react-vite`](examples/react-vite/README.md) |
| Enhance an authored article | [Linked article guide](docs/linked-article.md) |
| Integrate through MCP | [MCP App guide](docs/mcp-app-demo.md) |
| Contribute or run all checks | [Development](docs/development.md) |

The [documentation home](docs/README.md) is the repository-native index for guides, specifications, generated reference, evidence, and review guidance. The local VitePress site presents the same maintained Markdown and embeds isolated builds of the existing examples; it is not a separate wiki or documentation source.

## Architecture in one minute

1. `@sefaria/client` calls reviewed API operations and validates every JSON response.
2. `@sefaria/text-transform` performs pure sanitization, vocalization, and footnote work.
3. non-DOM `@sefaria/web-components/*` factories project validated payloads into component-specific view models.
4. browser elements render those view models and emit events; they never receive clients, references, raw payloads, or `fetch`.
5. supplied controllers coordinate supported behavior such as Reader navigation; the application binds them to elements and chooses the permitted data source and lifecycle.

In short: an **element** displays data and emits events, a supplied **factory or controller** provides reusable library behavior, and the **application host** chooses how data is obtained and when the UI is created or disposed. The controlled Reader uses the provided controller; developers do not implement its navigation from scratch.

Read [How the pieces fit together](docs/guides/data-flow.md) for the complete boundary and failure model.

## Current examples

- `examples/vanilla-vite`: zero-request supplied-data render plus an explicit injected-client action.
- `examples/react-vite`: typed property assignment, real event binding, explicit live loading, stable element identity, cancellation, and StrictMode cleanup.
- `examples/explorer`: authored zero-request states plus explicit live component pages.
- `examples/reader`: supported controlled Reader and a distinct lower-level spatial composition.
- `examples/linked-article`: progressively enhanced native citation links.
- `examples/mcp-app`: compiled Node transports, AppBridge reference host, request-free first render, and a deterministic static fixture preview.

Run `pnpm build:site` and `pnpm preview:site` to inspect the clean production documentation artifact under `dist/site`. The existing website deployed from `main` is a historical independent showcase and is not replaced or redeployed by this branch.

## License and attribution

This repository uses the [GPL-3.0 license](LICENSE). It builds on public Sefaria APIs and source evidence documented in [`docs/evidence.md`](docs/evidence.md). Repository work, license inheritance, or historical collaboration context does not imply official Sefaria ownership, maintenance, endorsement, or support.
