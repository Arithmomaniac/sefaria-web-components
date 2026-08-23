# Sefaria Web Components

> **Experimental.** This Microsoft Global Hackathon 2026 project has no support
> or stability guarantee. It is not an official Sefaria product.

## Purpose

[Sefaria](https://www.sefaria.org) provides an open library of Jewish texts. Its
public API gives access to sources, translations, commentary, and links.

Correct rendering needs more than an API response. A client must preserve text
direction, vocalization, footnotes, bilingual alignment, and attribution.
Clients often implement these rules again.

This project puts the shared rules in portable libraries and Web Components. The
lower layers also work without the component library.

## Why Web Components

The Sefaria web reader and mobile app implement similar reading surfaces. React
Native and the DOM cannot share interface components.

The Sefaria web reader and Web Components both use the DOM. A Web Component can
therefore serve Sefaria, third-party sites, and embedded tools. The headless
packages can also serve non-DOM clients.

<table>
<tr>
<td width="50%" align="center">
<img src="docs/images/mcp-app.svg" alt="Sefaria components inside an AI chat client" width="100%">
<br><em>Components inside an AI chat client</em>
</td>
<td width="50%" align="center">
<img src="docs/images/linker.svg" alt="A Sefaria Linker popup with dark mode and keyboard support" width="100%">
<br><em>The Linker popup on the same components</em>
</td>
</tr>
</table>

## Read the documentation

| Goal                                                         | Document                                            |
| ------------------------------------------------------------ | --------------------------------------------------- |
| Understand the architecture, scope, and repository structure | [Design](docs/design.md)                            |
| Implement the headless libraries                             | [Headless API and data](docs/specs/headless.md)     |
| Implement the Web Components                                 | [Web Components](docs/specs/components.md)          |
| Implement the MCP App or Linker                              | [Services and integrations](docs/specs/services.md) |
| Install tools and run the repository                         | [Development](docs/development.md)                  |
| Read the source observations                                 | [Evidence](docs/evidence.md)                        |

The three specification documents are normative. GitHub issues and the GitHub
Project track delivery status.

## Repository map

| Path                      | Purpose                                   |
| ------------------------- | ----------------------------------------- |
| `packages/ref`            | Sefaria reference operations              |
| `packages/client`         | Public API client                         |
| `packages/model`          | Normalized data contracts                 |
| `packages/text-transform` | Vocalization, sanitization, and footnotes |
| `packages/components`     | Lit Web Components                        |
| `tests/compatibility`     | Differential compatibility tests          |
| `demos/component-lab`     | Browser development surface               |
| `demos/mcp`               | MCP App and FastMCP fixture               |
| `demos/linker-userscript` | Linker userscript demonstration           |

The [design](docs/design.md) gives the package dependencies and the complete
scope map.

## Start development

The repository requires Node.js 22, pnpm 11.22.0, and uv 0.11.23.

```powershell
corepack enable
pnpm install
pnpm install:python
pnpm exec playwright install chromium
pnpm check
pnpm dev
```

If Corepack is not available, use `npx --yes pnpm@11.22.0` instead of `pnpm`.
The [development guide](docs/development.md) gives all commands.

## Run the demonstrations

| Demonstration                  | Command           |
| ------------------------------ | ----------------- |
| Component lab                  | `pnpm dev`        |
| MCP App with a FastMCP fixture | `pnpm dev:mcp`    |
| Linker userscript              | `pnpm dev:linker` |

These demonstrations prove the integration boundaries. The specifications define
the required product behavior.

## License and ownership

This repository uses the [GPL-3.0 license](LICENSE). The license follows the
Sefaria codebases that informed this work.

This project uses the Microsoft Hack for Good agreement. Sefaria owns the
resulting work, and Microsoft receives a license back. Ownership does not mean
that Sefaria endorses or supports the project. Sefaria has no obligation to
accept the result.
