> Created/edited by GitHub Copilot with human review/feedback by avilevin.

# MCP App demonstration

## Status

The stateful MCP reader is implemented and has completed an automated host walkthrough in authenticated, isolated VS Code `1.137.0` with bundled Copilot Chat `0.65.0`. One initial `get_text` result creates the reader; the same App then loads connections, follows two connection hops, retains a three-level breadcrumb hierarchy, restores middle and root ancestors locally, and exports the deepest selected reference to chat.

![Captured source card in isolated VS Code Copilot Chat](images/mcp-app-vscode.png)

## Try the reader in VS Code

The launch-only command opens the repository minimized in the same isolated VS Code profile used by the accepted walkthrough. It does not enable the smoke-test driver or a debugging port, attach CDP, drive the UI, type or submit a prompt, or call a tool.

Install the workspace:

```powershell
pnpm install
```

Prepare the isolated profile the first time:

```powershell
pnpm setup:mcp:vscode
```

If prompted, sign in to GitHub Copilot in the window that opens and approve the `sefaria-components-demo` server, then close that window. The isolated profile retains the authentication for later demo sessions.

Open the isolated workspace without automation:

```powershell
pnpm launch:mcp:vscode
```

Restore the minimized window from the taskbar, open Copilot Chat, enable the `sefaria-components-demo` tools, and enter your own request or use `/sefaria-mcp-reader` when you want to load and run the Micah 6:8 request from `.github/prompts/sefaria-mcp-reader.prompt.md`. Until then, no chat request or MCP tool call is made. After the reader appears, use its Connections, paging, source navigation, breadcrumbs, and Send to chat controls to explore the integration yourself.

Run the automated assertions without publishing screenshots with `pnpm walkthrough:mcp:vscode`. Run the same complete walkthrough and publish the three maintained captures only after success with `pnpm capture:mcp:vscode`.

## Reader interaction

The model calls `get_text` once. The Node server fetches one corrected Sefaria v3 texts payload and returns plain text for every host plus `structuredContent` and the App resource for MCP Apps hosts. The App validates the result, admits reader source content, creates one reader controller with zero initial requests, and binds one persistent request-free `<sefaria-reader>`.

![Authored happy-path source card specification](images/mcp-app-source-card.svg)

The controller then calls bare `get_links_between_texts` through the host's `serverTools` capability. Source and connections remain in the same App frame. Category switching and paging reproject retained links locally. Selecting a connection performs bounded source qualification through bare `get_text`, loads that target's connections, and appends one reader history entry.

![Captured three-level reader hierarchy](images/mcp-app-vscode-reader-hierarchy.png)

Breadcrumb activation is local retained-history projection. The walkthrough restores the middle entry and then the Micah 6:8 root without creating another chat turn.

## Chat export

Send to chat is an explicit action separate from reader data transport. It sends one fixed `ui/message` request containing the exact current selected reference. The App rejects stale exports, suppresses concurrent sends, and does not retry unconfirmed delivery.

![Deep reader reference exported to chat](images/mcp-app-vscode-chat-export.png)

The verified walkthrough result is [machine-readable](images/mcp-app-vscode-walkthrough.json). The maintained captures are the [initial reader](images/mcp-app-vscode.png), [retained hierarchy](images/mcp-app-vscode-reader-hierarchy.png), and [explicit chat export](images/mcp-app-vscode-chat-export.png). Intermediate category, paging, connection, and breadcrumb stages remain asserted in the result without additional maintained screenshots.

## Invalid payload

Invalid corrected API-shaped JSON stops before component projection. The integration-owned error state lists structured JSON paths and does not make a fallback request.

![Structured validation error](images/mcp-app-validation-error.svg)

## Documented HTTP error

A validated documented 400 or 404 payload becomes `SourceCardHttpErrorViewModel`. It is not mislabeled as an unknown-boundary validation failure.

![Documented HTTP 404](images/mcp-app-http-error.svg)

## Host theme

The App applies MCP host theme variables and maps them to the public `--sefaria-*` tokens consumed by the request-free reader and its child elements. The host's secondary background maps to `--sefaria-surface-muted` without changing the primary surface.

![Source card using a dark host theme](images/mcp-app-dark.svg)
