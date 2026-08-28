# Sefaria Web Components

> **Experimental.** This Microsoft Global Hackathon 2026 project has no support or stability guarantee. It is not an official Sefaria product.

## Purpose

[Sefaria](https://www.sefaria.org) provides an open library of Jewish texts and a public API for texts, versions, references, indexes, shapes, and links.

This repository separates transport contracts, pure text processing, component data projection, DOM rendering, and external integrations. The planned architecture uses corrected generated API contracts directly. It does not define a generalized Sefaria domain-model package.

The Web Components render component-specific view models. They never accept references, clients, hosts, fetch functions, or raw API payloads.

## Implementation status

The documents define the planned architecture. The [development guide](docs/development.md) describes the current implementation and migration work.

## Documentation

| Goal | Document |
| --- | --- |
| Understand ownership and dependency boundaries | [Design](docs/design.md) |
| Implement the OpenAPI supply chain and thin client | [Client specification](docs/specs/client.md) |
| Implement sanitization, vocalization, and footnotes | [Text-processing specification](docs/specs/text-processing.md) |
| Implement component factories and elements | [Component specification](docs/specs/components.md) |
| Implement the MCP App or Linker demonstration | [Integration specification](docs/specs/integrations.md) |
| Install tools and run the repository | [Development guide](docs/development.md) |
| Review generated contracts and request boundaries | [Review guide](docs/review.md) |
| Read observations and source provenance | [Evidence](docs/evidence.md) |

The specifications are normative. `docs/evidence.md` records observations and source provenance. GitHub issues track delivery status and do not define architecture.

## Repository map

| Path | Responsibility |
| --- | --- |
| `packages/client` | OpenAPI artifacts, generated contracts, public schemas, validators, and thin `openapi-fetch` client |
| `packages/text-transform` | Pure sanitization, vocalization, and footnote operations |
| `packages/components` | Non-DOM component factories and request-free Lit elements |
| `tests/compatibility` | Focused compatibility evidence for retained pure behavior |
| `demos/component-lab` | Browser states for component view models and interactions |
| `demos/mcp` | MCP corrected-payload boundary and self-contained App |
| `demos/linker-userscript` | Third-party integration through an async component factory |

## Start development

The repository requires Node.js 22, pnpm 11.22.0, uv 0.11.23, and Chromium through Playwright.

```powershell
corepack enable
pnpm install
pnpm install:python
pnpm exec playwright install chromium
pnpm check
pnpm dev
```

If Corepack is unavailable, use `npx --yes pnpm@11.22.0` instead of `pnpm`. The [development guide](docs/development.md) lists the current and planned workflows.

## Demonstrations

| Demonstration                  | Command           |
| ------------------------------ | ----------------- |
| Component lab                  | `pnpm dev`        |
| MCP App with a FastMCP fixture | `pnpm dev:mcp`    |
| Linker userscript              | `pnpm dev:linker` |

The [integration specification](docs/specs/integrations.md) defines the planned contracts for these demonstrations.

## License and ownership

This repository uses the [GPL-3.0 license](LICENSE). The license follows the Sefaria codebases that informed this work.

This project uses the Microsoft Hack for Good agreement. Sefaria owns the resulting work, and Microsoft receives a license back. Ownership does not mean that Sefaria endorses or supports the project.
