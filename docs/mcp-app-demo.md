> Created/edited by GitHub Copilot with human review/feedback by avilevin.

# MCP App demonstration

## Status

The source-card MCP App is implemented and has completed an automated host acceptance run in authenticated, isolated VS Code `1.136.1` with bundled Copilot Chat `0.64.1`. The Playwright harness launched the dedicated profile minimized, invoked `get_text` through the workspace's only MCP server, and captured the rendered bilingual source card. The authored SVGs below remain the visual specifications for states not exercised by that acceptance run.

![Captured source card in isolated VS Code Copilot Chat](images/mcp-app-vscode.png)

## Core interaction

The model calls `get_text` once. The Python server fetches one corrected Sefaria v3 texts payload and returns plain text for every host plus `structuredContent` and the App resource for MCP Apps hosts. The App validates the result, calls `createSourceCardViewModel`, and gives only the resulting view model to `<sefaria-source-card>`. The App makes zero requests.

![Authored happy-path source card specification](images/mcp-app-source-card.svg)

## Invalid payload

Invalid corrected API-shaped JSON stops before component projection. The integration-owned error state lists structured JSON paths and does not make a fallback request.

![Structured validation error](images/mcp-app-validation-error.svg)

## Documented HTTP error

A validated documented 400 or 404 payload becomes `SourceCardHttpErrorViewModel`. It is not mislabeled as an unknown-boundary validation failure.

![Documented HTTP 404](images/mcp-app-http-error.svg)

## Host theme

The App applies MCP host theme variables and maps them to the public `--sefaria-*` tokens consumed by the request-free element. The host's secondary background maps to `--sefaria-surface-muted` for the source card's attribution panel without changing the card's primary surface or unrelated component behavior.

![Source card using a dark host theme](images/mcp-app-dark.svg)
