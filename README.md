> Created/edited by GitHub Copilot; pending human review.

# Sefaria Web Components

> **Experimental.** This Microsoft Global Hackathon 2026 project has no support or stability guarantee. It is not an official Sefaria product.

## Purpose

[Sefaria](https://www.sefaria.org) provides an open library of Jewish texts and a public API for texts, versions, references, indexes, shapes, and links.

This repository separates transport contracts, pure text processing, component data projection, DOM rendering, and external integrations. The planned architecture uses corrected generated API contracts directly. It does not define a generalized Sefaria domain-model package.

The Web Components render component-specific view models. They never accept references, clients, hosts, fetch functions, or raw API payloads.

## Implementation status

The client, text-transform package, text-segment component, and reference-label component are implemented. The remaining documents define the planned architecture. The [development guide](docs/development.md) distinguishes current behavior from remaining work.

## Documentation

| Goal | Document |
| --- | --- |
| Understand ownership and dependency boundaries | [Design](docs/design.md) |
| Implement the OpenAPI supply chain and thin client | [Client specification](docs/specs/client.md) |
| Implement sanitization, vocalization, and footnotes | [Text-processing specification](docs/specs/text-processing.md) |
| Implement component factories and elements | [Component specification](docs/specs/components.md) |
| Replay the text-segment demonstration | [Text segment demonstration](docs/text-segment-demo.md) |
| Replay the reference-label demonstration | [Reference label demonstration](docs/ref-label-demo.md) |
| Implement the MCP App or Linker demonstration | [Integration specification](docs/specs/integrations.md) |
| Install tools and run the repository | [Development guide](docs/development.md) |
| Review generated contracts and request boundaries | [Review guide](docs/review.md) |
| Read observations and source provenance | [Evidence](docs/evidence.md) |

The specifications are normative. `docs/evidence.md` records observations and source provenance. GitHub issues track delivery status and do not define architecture.

## Repository map

| Path | Responsibility |
| --- | --- |
| `packages/client` | Pinned OpenAPI input, guarded overlay, generated contracts, Zod schemas, validators, and thin generated client |
| `packages/text-transform` | Pure sanitization, vocalization, and footnote operations |
| `packages/components` | Non-DOM component factories and request-free Lit elements |
| `tests/compatibility` | Focused compatibility evidence for retained pure behavior |
| `demos/component-lab` | Browser states for component view models and interactions |
| `demos/ref-label-live-demo` | Interactive live Sefaria request page for the reference-label component |
| `demos/text-segment-live-demo` | Interactive live Sefaria request page for the text-segment component |
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

| Demonstration                    | Command                 |
| -------------------------------- | ----------------------- |
| Component lab                    | `pnpm dev`              |
| Interactive reference-label page | `pnpm dev:ref-label`    |
| Interactive text-segment page    | `pnpm dev:text-segment` |
| MCP App with a FastMCP fixture   | `pnpm dev:mcp`          |
| Linker userscript                | `pnpm dev:linker`       |

The [integration specification](docs/specs/integrations.md) defines the planned contracts for these demonstrations.

## License and ownership

This repository uses the [GPL-3.0 license](LICENSE). The license follows the Sefaria codebases that informed this work.

This project uses the Microsoft Hack for Good agreement. Sefaria owns the resulting work, and Microsoft receives a license back. Ownership does not mean that Sefaria endorses or supports the project.
