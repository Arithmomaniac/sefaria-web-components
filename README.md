> Created/edited by GitHub Copilot with human review/feedback by Avi Levin.

# Sefaria Web Components

Render Sefaria passages in your own application without bringing along the Sefaria reader. Use a typed client to obtain text, a factory to prepare it, and a Web Component to display it.

Explore the repository through the interactive [Sefaria Web Components showcase](https://arithmomaniac.github.io/sefaria-web-components/), including the supported stateful Reader, a manually composed side-by-side workflow, the Linker, and captured MCP Reader results.

> **Experimental.** This Microsoft Global Hackathon 2026 project has no support or stability guarantee. It is not an official Sefaria product. Packages are currently private workspace packages, not a published installation offering.

## Start here

| I want to... | Read |
| --- | --- |
| Try the components or display a passage | [Render text](docs/guides/render-text.md) |
| Understand the client, view models, and Web Components | [How the pieces fit together](docs/guides/data-flow.md) |
| Add citation links and popups to an article | [Linker demonstration](docs/linker-demo.md) |
| Run the MCP App in VS Code Copilot Chat | [MCP App demonstration](docs/mcp-app-demo.md) |
| Understand HTML tags inside Sefaria text | [Text markup, with examples](docs/guides/text-markup.md) |
| Know where this project deliberately differs from Sefaria | [Intentional differences](docs/guides/differences.md) |
| Contribute, understand changed plans, or see what remains | [Development](docs/development.md) |

The [documentation home](docs/README.md) also leads to specifications, upstream concepts, source evidence, and review guidance.

## Try a source card

With Node.js 22 or later and pnpm 11.22.0 installed, run these commands from the repository root:

```powershell
pnpm install
pnpm dev:source-card
```

Open the local URL printed by Vite. Select a passage preset to see the production client, factory, and element working together. This demo requests the deployed Sefaria API; the authored-state component lab (`pnpm dev`) does not.

The [development guide](docs/development.md) covers Corepack, the Python fixture, and the full contributor setup.

## What is available?

The client, text transforms, text segment, bilingual segment, reference label, selectable source card, connections panel, request-free popup, contextual connections reader, DOM-free reader session and controller, controlled reader surface, embeddable Linker demonstration, and Core MCP App are implemented on the [documented implementation baseline](docs/development.md#implemented-on-this-baseline). A source card handles both a single segment and a collection of text from one response.

Run `pnpm dev:reader-workspace` for the supported stateful reader and lower-level spatial website demonstrations, `pnpm dev:connections` for the contextual reader, or `pnpm dev:linker` for the embeddable citation demonstration. The MCP Reader has completed an authenticated, isolated VS Code Copilot Chat walkthrough covering same-App connections, nested navigation, retained breadcrumbs, and explicit chat export; the persistent profile requires one manual Copilot sign-in before its first automated run. Public hosting and broad live-site qualification for the Linker remain outside the delivered demonstration. [Development](docs/development.md) separates current behavior, superseded plans, and remaining work.

## License and ownership

This repository uses the [GPL-3.0 license](LICENSE). The license follows the Sefaria codebases that informed this work.

This project uses the Microsoft Hack for Good agreement. Sefaria owns the resulting work, and Microsoft receives a license back. Ownership does not mean that Sefaria endorses or supports the project.
