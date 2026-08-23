# Services and integrations

This specification defines the MCP App, the Linker userscript, and reader state.
These surfaces consume the headless and component contracts.

## MCP App

### Purpose

The MCP App shows Sefaria source material inside an MCP host. It keeps the
source text and attribution in the rendered response.

A chat pane is a demanding host. It is narrow, controls the theme, and sends
data through a tool result instead of a component request.

### Core

The Core App receives one tool result and renders one `<sefaria-source-card>`.

The card includes:

- a canonical reference
- source text
- approved translations selected by the service
- version attribution
- one segment or a bounded range

The first render uses the tool payload. It does not fetch the same source again.

### Stretch 1

Stretch 1 adds the narrow `<sefaria-connections-panel>`.

The user can:

- view selected connection categories
- open one commentary
- restore the complete prior state with Back

The App can hold one prior snapshot without `@sefaria/reader-state`.

### Stretch 2

Stretch 2 adds recursive connected reading.

Each opened source becomes active and loads its connections. A breadcrumb and
back stack use `@sefaria/reader-state`.

## MCP source-card contract

The tool result uses [`SourceCardData`](headless.md#source-card-data). The
language-neutral schema is `packages/model/contracts/source-card.schema.json`.

The tool puts the value in `structuredContent`. A text content item contains a
short source summary for hosts that do not render MCP Apps.

The TypeScript guard, browser fixture, Python fixture, and upstream adapter use
the same contract.

## MCP resource contract

| Item          | Value                                       |
| ------------- | ------------------------------------------- |
| Build command | `pnpm --filter @sefaria-demo/mcp-app build` |
| Built file    | `demos/mcp/app/dist/mcp-app.html`           |
| Resource URI  | `ui://sefaria/source-card.html`             |
| MIME type     | `text/html;profile=mcp-app`                 |

The HTML file is self-contained. It does not contain development-server URLs.

The App uses the host theme and supported host fonts. It also keeps the Sefaria
token defaults.

## MCP repository layout

```text
demos/mcp/
  app/
  contract/
  fixture-server/
  upstream/
```

`app` contains the TypeScript, Lit, and Vite project. It builds one HTML
resource.

The App renders the repository's `<sefaria-source-card>`. It does not contain a
second preview-only card.

Standalone fixture mode supports browser development. It uses the same example
payload as the Python fixture.

`contract` contains representative payloads. The canonical schema stays with
`@sefaria/model`.

`fixture-server` contains a small Python and FastMCP project. It proves the
language and package boundary.

The fixture contains:

- one fixture-backed UI tool
- one `ui://` resource
- artifact staging
- schema checks
- in-memory integration checks

The fixture does not contain copied API logic, metrics, OAuth routes, Docker
configuration, or unrelated tools.

`upstream` is reserved for a packaged artifact or stable proof metadata. Local
worktree paths and review status do not belong in the repository.

## FastMCP integration

FastMCP 3.2.4 supports the required MCP Apps API.

The Python integration:

1. Reads the staged HTML through `importlib.resources`.
2. Registers `ui://sefaria/source-card.html` with `@mcp.resource`.
3. Associates one tool through `AppConfig(resourceUri=...)`.
4. Returns structured data that matches the model schema.

A `ui://` resource is an MCP resource. It is not an HTTP route. The MCP
transport handles `resources/read`.

The installed wheel and Docker image must contain the staged file. The Python
server must not need the TypeScript checkout at runtime.

## Upstream MCP boundary

The production integration must stay small and additive.

It can:

1. Package the HTML resource.
2. Register the resource.
3. Associate a text tool.
4. Add a normalized result adapter.
5. Add focused checks.
6. Set a tested FastMCP minimum version.

If an existing tool satisfies the source-card contract, use it. Otherwise, add
one UI-focused tool.

A proof tool can accept only a single-segment reference. Its input name,
description, and error must state that limit.

Core range support must normalize API arrays into one `segments[]` item for each
segment. A single-segment proof does not satisfy that Core requirement.

The integration does not change SSE, OAuth, metrics, Docker behavior, or
unrelated tools.

Do not maintain a long-lived fork. A durable upstream commit or pull request is
evidence of the integration.

## `@sefaria/reader-state`

This package is Stretch 2.

```ts
interface ReaderSnapshot {
  ref: string;
  selectedSegmentRef?: string;
  versions: {
    he?: string;
    en?: string;
  };
  contentLang: "he" | "en" | "bilingual";
  layout: "auto" | "stacked" | "side-by-side";
  vocalization: "taamim_and_nikkud" | "nikkud" | "none";
  panel: {
    mode: "text" | "connections";
    category?: string;
  };
}

interface ReaderState extends ReaderSnapshot {
  history: ReaderSnapshot[];
}
```

Back removes one snapshot and restores every field. The breadcrumb comes from
the history.

Core and Stretch 1 do not depend on this package.

## MCP host acceptance

Core acceptance requires one named MCP Apps-compatible host.

Keep the Core interaction set narrow because host interaction support changes
quickly.

Record:

- the host name
- the tested version
- the launch configuration
- the supported Core interaction

Standalone browser rendering does not prove host compatibility. Results from
other hosts are supporting evidence until their interaction checks pass.

## MCP acceptance criteria

- The App builds as one HTML file.
- The fixture reads the packaged file through `resources/read`.
- The resource URI and MIME type match this specification.
- Tool metadata points to the same resource URI.
- Tool output satisfies the shared schema.
- The App renders the real `<sefaria-source-card>`.
- Standalone and fixture modes use the same example payload.
- One named host renders the card and supports Core interaction.
- The production patch stays small and additive.
- A wheel check reads the packaged HTML.

## Linker userscript

### Scope

The Linker userscript demonstration is Core.

It proves that `<sefaria-popup>` works on a third-party page. It is not a
migration program for the deployed Linker.

### Architecture

The userscript:

1. Runs on an explicit test-host list.
2. Uses existing Sefaria citation detection.
3. Requests text through the public API.
4. Creates one `<sefaria-popup>` for the active citation.
5. Passes normalized data into the popup.
6. Removes its listeners and elements during disable.

The build uses Vite and `vite-plugin-monkey`. It produces one installable
`.user.js` file.

The demonstration does not copy or submodule `Sefaria-Project`.

### Host safety

Development metadata must not use `<all_urls>`.

Default matches are limited to localhost and an explicit fixture host. A real
site requires a deliberate metadata change.

The userscript:

- adds no global CSS
- does not replace host keyboard handlers
- does not rewrite unrelated links
- sends host-page text only through the approved Sefaria detection path
- sanitizes Sefaria HTML before rendering
- removes obsolete popups after navigation changes

### Popup behavior

The popup uses the [`<sefaria-popup>` contract](components.md#sefaria-popup).

The demonstration preserves these correct deployed behaviors:

- dialog role
- focus entry
- focus restoration
- Escape closes the popup
- `aria-controls` connects the trigger

It corrects:

- global CSS leakage
- ignored `<style scoped>` isolation
- fixed light colors
- suppressed Tab navigation
- a non-button close control
- a missing accessible name
- missing `aria-modal`

### Citation flow

A detected citation becomes a keyboard-operable trigger.

Activation requests the referenced text and opens the popup. Repeated activation
reuses the active popup.

A response for an old activation must not replace a newer result.

An error identifies the failed citation. The host page stays usable.

### Deferred behavior

- Automatic migration of existing Linker sites.
- CDN hosting.
- Contact or measurement of current Linker users.
- Popup dragging.
- Search, topics, sheets, and authenticated data.
- Production monitoring.

### Linker acceptance criteria

- The built file installs in Tampermonkey or a compatible engine.
- The default build runs only on approved fixture hosts.
- A detected citation opens the real `<sefaria-popup>`.
- Host styles do not enter the popup.
- Popup styles do not enter the host page.
- Keyboard users can open, traverse, and close the popup.
- Closing the popup restores focus.
- Rapid citation changes do not show old data.
- API HTML is sanitized before it reaches the component.
- The userscript needs no deployed project-specific service.

## Integration failure rules

- Do not hide invalid input.
- Do not return success-shaped data after a failed request.
- Report a configuration error at the owning layer.
- Keep network, missing-data, and parse failures separate.
- If the expected build output is missing, fail staging.
- Do not package a development-server URL.
- Do not commit a generated artifact unless another repository packages it.

## Service completion

The completion requirements for a Core service or integration are:

- its public contract is implemented
- each named edge case has a check
- the complete artifact works from a clean checkout
- the named host or browser flow works from end to end
- known limitations are explicit in the public contract
