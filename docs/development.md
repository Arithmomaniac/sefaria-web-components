> Created/edited by GitHub Copilot with human review/feedback by avilevin.

# Development

This contributor guide describes the current implementation as of September 6, 2026, combining `origin/main` commit `45fc260e8b3d7f7fe9dabc402b8389b4cd3c399e` with the current connections-panel feature work.

The sections below separate delivered baseline behavior, changes from older plans, and work that remains intended. A runnable command is not proof that the corresponding integration is finished.

## Contributor guides

For reader-oriented explanations, use the friendly guides rather than the archived demo transcripts:

- [How the pieces fit together](guides/data-flow.md)
- [Render text](guides/render-text.md)
- [Text markup](guides/text-markup.md)
- [Intentional differences from Sefaria](guides/differences.md)

## Implemented on this baseline

| Area | Baseline status |
| --- | --- |
| `packages/client` | Delivers eight named Core GET and POST SDK functions, committed corrected TypeScript contracts, Zod validators, and a status-aware fetch client. The corrected Core OpenAPI document is temporary generation output. |
| `packages/text-transform` | Delivers DOM-free sanitization, Hebrew vocalization modes, structured footnote extraction, and bounded connected-text previews. |
| `packages/components` | Delivers the current component-specific view models, pure and async factory subpaths, and request-free elements for the current text, bilingual, reference-label, selectable source-card, connections-panel, and popup surfaces. |
| `demos/component-lab` | Shows authored view models for current elements. It is a development surface, not a complete interaction catalog or compatibility oracle. |
| `demos/ref-label-live-demo` | Provides an interactive HTML form and presets that call the deployed reference endpoint and render `<sefaria-ref-label>`. |
| `demos/text-segment-live-demo` | Provides an interactive HTML form and presets that call the deployed Sefaria API and render `<sefaria-text-segment>`. |
| `demos/bilingual-segment-live-demo` | Provides an interactive HTML form, presets, and display controls that make one deployed Sefaria API request and render `<sefaria-bilingual-segment>`. |
| `demos/source-card-live-demo` | Makes one deployed v3 text request for segment, range, spanning, nested non-spanning, and one-sided presets, renders `<sefaria-source-card>`, and attributes each selected edition once at card level. |
| `demos/connections-panel-live-demo` | Synchronizes a selectable source card and connections panel, opens a target in its server-provided parent section, selects its first segment, and pages a captured links response without child requests. |
| `demos/mcp` | Exposes a live `get_text` tool, packages a single-file App, validates corrected 200/400/404 payloads, calls the source-card pure factory, renders the request-free element without an App-side request, and provides an authenticated isolated VS Code capture workflow. |
| `demos/linker` | Builds an embeddable classic script, bookmarklet loader, automatic and no-autostart article pages, asynchronous citation detection, safe DOM linking, and request-free popups. Public hosting and broad live-site qualification remain external. |
| `tests/compatibility` | Delivers focused pinned client and transform comparisons, a composed v3 validate-to-transform smoke case, and grouped qualification output without network access. The evidence is representative and non-exhaustive. |

## What changed from earlier plans

These are superseded decisions, not an uncompleted backlog:

- The generalized `@sefaria/model` foundation and broad offline reference parser are no longer the delivery architecture. The corrected OpenAPI contract and thin `@sefaria/client` own transport data; component factories own projections.
- The default cache, retries, and request coalescing proposed by an earlier client plan are not part of the thin-client baseline.
- A separate text-range request and view-model stack was replaced by a bounded source-card collection. A single segment is a one-item collection, while a range remains one outer request with card-level reference data.
- Attribution belongs once at the source-card level for each displayed edition, not inside every repeated text segment.
- The private `SourceCardData` MCP wire format is superseded. The current integration uses corrected API-shaped JSON, boundary validation, and the same source-card pure factory as client mode.

The [historical decision record](evidence.md#historical-decision-provenance) explains the sources and supersession behind these changes. Work on other branches is not included in this baseline. Use the [repository issues](https://github.com/Arithmomaniac/sefaria-web-components/issues) page for live delivery tracking, not as the definition of a component contract.

## Still intended

These are remaining intended capabilities, not removed plans. A scaffold, command, or specification does not make them delivered.

| Planned capability | Intended result | Contract |
| --- | --- | --- |
| Public Linker hosting and broader live-site qualification | Host the built artifact and prove the bounded integration against representative third-party sites and browser policies | [Linker demonstration](linker-demo.md), [Linker integration](specs/integrations.md#linker-script-purpose) |
| Reader history, beyond Core | Add Back/history behavior on explicit request/view-model state and host-owned task lifecycles | [Design scope](design.md#core-scope), [Interaction flow](specs/integrations.md#interaction-task-flow) |
| Broader compatibility coverage | Extend the small current suite with additional source-backed cases, without promising exhaustive corpus equivalence | [Compatibility evidence](evidence.md#current-focused-compatibility-qualification) |

The client, text-transform foundations, current components, connections panel, contextual reader, MCP App, named-host acceptance, and Linker demonstration are already delivered. New component slices still need concrete consumers; they do not justify restoring the superseded generalized model or hidden client policies.

## Technology

| Area                   | Technology                         |
| ---------------------- | ---------------------------------- |
| Workspace              | pnpm 11                            |
| Language               | TypeScript 6                       |
| Components             | Lit 3                              |
| Browser builds         | Vite 8                             |
| TypeScript tests       | Vitest 4 and Playwright            |
| Python MCP server      | Python 3.10 or later and FastMCP 3 |
| Python environment     | uv                                 |
| Python checks          | Ruff, mypy, and pytest             |
| Continuous integration | GitHub Actions                     |

TypeScript emits reusable ES modules. Vite builds the browser demonstrations and the single-file MCP App.

## Workspace

| Path | Responsibility (status described above) |
| --- | --- |
| `packages/client` | Pinned OpenAPI input, formal guarded overlay, generated contracts, Zod schemas, validators, and named SDK functions |
| `packages/text-transform` | Pure sanitization, vocalization, and footnotes |
| `packages/components` | Non-DOM component factories and request-free Lit elements |
| `tests/compatibility` | Pinned compatibility evidence for retained pure behavior |
| `demos/component-lab` | Browser development for view-model states and interactions |
| `demos/ref-label-live-demo` | Interactive live API page for the reference-label component |
| `demos/text-segment-live-demo` | Interactive live API page for the text-segment component |
| `demos/bilingual-segment-live-demo` | Interactive live API page for the bilingual-segment component |
| `demos/source-card-live-demo` | Interactive live API page for the source-card component |
| `demos/mcp` | Corrected-payload MCP boundary, live FastMCP server, self-contained App, and isolated VS Code acceptance tooling |
| `demos/linker` | Third-party citation detection, DOM linking, and popup integration |
| `demos/connections-panel-live-demo` | Interactive contextual source-card and connections-panel host |

Workspace dependencies use `workspace:*`. All workspace packages remain private during the hackathon.

## Required tools

Running the browser demos requires:

- Node.js 22 or later
- pnpm 11.22.0

Browser tests also require Chromium through Playwright.

Full `pnpm check` and MCP fixture checks also require:

- uv 0.11.23
- Python 3.10 or later
- The locked Python dependencies, including FastMCP 3, installed by `pnpm install:python`

An MCP Apps-compatible host is optional for local App development and required for host acceptance.

## Install the workspace

For browser-only TypeScript work, run these commands from the repository root:

```powershell
corepack enable
pnpm install
pnpm exec playwright install chromium
```

Before running the full check or Python/MCP fixture checks, also install the pinned Python fixture environment:

```powershell
pnpm install:python
```

If Corepack is unavailable, use the pinned fallback:

```powershell
npx --yes pnpm@11.22.0 install
npx --yes pnpm@11.22.0 exec playwright install chromium
```

For the full Python fixture setup with the fallback, run:

```powershell
npx --yes pnpm@11.22.0 install:python
```

## Current complete check

```powershell
pnpm check
```

The current command checks stale OpenAPI output, then runs Prettier, ESLint, TypeScript checks, tests, the offline focused compatibility qualification, builds, Python checks, MCP staging, and wheel package-data checks. The qualification prints grouped pass, failure, unavailable-source, and intentional-difference results. It does not refresh network fixtures.

The full check includes the Python fixture environment and MCP staging. Browser-only TypeScript demos do not require that Python setup.

## Current focused checks

Run all TypeScript tests:

```powershell
pnpm test
```

Run the current focused compatibility qualification:

```powershell
pnpm compatibility:qualify
```

The command runs offline against committed and source-derived fixtures. It exits nonzero only for unexpected failures; unavailable sources and documented intentional differences remain separate visible result classes. The suite is representative and non-exhaustive.

Run the compatibility tests, including output semantics and network denial:

```powershell
pnpm exec vitest run tests/compatibility
```

Run the Python checks:

```powershell
pnpm check:python
```

The Python command builds and stages the current MCP App before it runs Python checks.

## OpenAPI workflow

### Explicit refresh

The refresh operation requires a complete Sefaria commit SHA. It can access the network.

```powershell
pnpm openapi:refresh --commit 1f7d0844ca6a9eddc8e48168962aacb09de75bd6
```

The operation downloads only the OpenAPI document from that commit. It validates the formal overlay guards before updating the committed pin, upstream input, SHA-256, and generated TypeScript.

It then applies the local overlay, creates the corrected document in temporary storage, and regenerates the TypeScript contracts and runtime validators.

### Offline generation

```powershell
pnpm openapi:generate
```

The operation validates the checksum and co-located overlay guards, applies `openapi/overlay.yaml` through `openapi-format` 1.33.6, extracts eight reviewed Core GET/POST operations and recursive references into temporary storage, and runs `@hey-api/openapi-ts` 0.99.0.

The generator configures a deterministic Zod object resolver for every retained `additionalProperties: false` schema. It also maps the explicitly typed OpenAPI 3.0 null-only branches to `z.null()` and applies the `minProperties: 1` warning-record correction that Hey API 0.99 does not emit correctly.

Refresh writes every new file into a sibling staging directory. Publication moves existing outputs to a rollback directory, replaces the generated TypeScript directory, then publishes `upstream.json` and `source.json` last. Any replacement failure restores every prior output.

It must not access Sefaria, GitHub, the current time, or environment-specific data.

### Stale-output check

```powershell
pnpm openapi:check
```

The check fails for changed, missing, or unexpected generated files. `pnpm check` includes this operation.

### Overlay failure

If upstream content differs from an asserted old value, generation stops with an exact path:

```text
OpenAPI precondition mismatch for versions-contract at $.paths['/api/texts/versions/{index}']
expected: SHA-256 <reviewed value>
actual: <current value>
```

The developer must review the new upstream document. Do not change an assertion only to make generation pass.

## Client fixture candidate capture

The current Genesis index candidate capture is explicit and networked. Replace `YYYY-MM-DD` with the actual caller-declared capture date:

```powershell
pnpm client:fixture:capture-candidate --write --capture-date YYYY-MM-DD
```

The command requires exactly `--write --capture-date YYYY-MM-DD`. It refuses an invalid date or an existing `index-genesis-YYYY-MM-DD.json` before fetching. It then fetches only the deployed Genesis index URL declared by the immutable September 1 manifest entry, validates the unknown response with the generated public validator, deterministically reduces it, stages it beside the fixture directory, verifies the dated target is still absent, and publishes the new candidate with one same-filesystem rename. Download, JSON parsing, validation, reduction, or publication failure leaves committed evidence unchanged.

Candidate generation does not update `manifest.json`, tests, or other references and is not automatic baseline replacement. A reviewer must inspect the candidate and manually update provenance and references in the same reviewed change if it should become committed evidence. The committed `index-genesis-2026-09-01.json` remains immutable. Existing prose-reduced payloads, reduced captures for the other Core endpoints, and hand-extracted markup fragments remain manual-review-only because their reductions depend on source interpretation rather than a general capture rule.

## Generated artifacts

`@sefaria/client` commits:

- the upstream OpenAPI input
- the complete commit pin
- the SHA-256
- the formal Overlay 1.1 document with co-located old-state guards
- generated named SDK functions and TypeScript operation declarations
- generated Zod schemas, status-aware response metadata, and public validators

Generated TypeScript files live under `packages/client/src/generated` and identify their source pin and generation command. The corrected Core OpenAPI document exists only in temporary generation storage.

Do not edit generated declarations by hand.

## Run the component lab

```powershell
pnpm dev
```

The current page shows authored view models for the current elements, including `<sefaria-text-segment>`, `<sefaria-bilingual-segment>`, and `<sefaria-ref-label>`. These examples exercise production elements without making requests; they are development states, not a complete interaction catalog.

## Run the interactive text-segment page

```powershell
pnpm dev:text-segment
```

The page uses ordinary HTML controls and the production client. It calls the deployed Sefaria API, owns cancellation and host errors, and supplies each result to `<sefaria-text-segment>`.

## Run the interactive bilingual-segment page

```powershell
pnpm dev:bilingual-segment
```

The page makes one request for the source and translation versions of a segment. Its display controls change the visible sides, the layout, and the side order without making another request.

## Run the contextual connections reader

```powershell
pnpm dev:connections
```

The host loads a connection target and its server-provided parent section when necessary, selects the first target segment, and requests that segment's links. Reader-row selection makes only a links request. Category changes, 20-entry paging, and showing or hiding captured previews make no request. A labels-only links response exposes an explicit Load previews action rather than fetching inside the element.

## Run the MCP App server

```powershell
pnpm dev:mcp
```

The current command:

1. Builds the single-file MCP App.
2. Stages the App.
3. Starts the FastMCP server over standard input and output.

The server exposes `get_text(reference, version_language="both")`. It requests the deployed Sefaria v3 texts endpoint and returns one progressive result: plain text for every host, corrected API-shaped `structuredContent`, request/status metadata, and the App resource. The public `source`, `english`, and `both` choices select the source-card primary and translation roles through `version=primary`, `version=translation`, or both repeated values. The App bundles the generated validator and source-card factory into the staged HTML; no separate validator or payload fixture is staged.

VS Code reads the checked-in `.vscode/mcp.json`. It starts the server through `uv` with `${workspaceFolder}`, so the configuration stays portable across worktrees.

```json
{
  "servers": {
    "sefaria-components-demo": {
      "type": "stdio",
      "command": "uv",
      "args": [
        "run",
        "--no-sync",
        "--directory",
        "${workspaceFolder}/demos/mcp/fixture-server",
        "sefaria-mcp-app-fixture"
      ]
    }
  }
}
```

The resource URI is `ui://sefaria/source-card.html`. Its MIME type is `text/html;profile=mcp-app`.

The server request is live. The App's first render is request-free, and repository tests mock the server transport so `pnpm check` remains offline.

Build and stage the App before opening the workspace in VS Code:

```powershell
pnpm build:mcp
```

In Copilot Chat Agent mode, enable the `sefaria-components-demo` tools and ask it to use `get_text` for a reference such as `Leviticus 19:18`.

Prepare the persistent isolated VS Code environment before the first automated run:

```powershell
pnpm setup:mcp:vscode
```

The command builds and stages the App, creates dedicated user-data, extensions, Copilot home, shared-data, and process-home directories under `%LOCALAPPDATA%\SefariaMcpDemo`, writes deterministic user settings, writes empty VS Code and Agent Host MCP configurations, clears stale chat and MCP tool caches without deleting authentication state, and opens the worktree in that environment. The profile disables MCP discovery, MCP gallery browsing, plugins, and Settings Sync; ignores extension recommendations; and uses the empty extensions directory so no user-installed extensions are loaded. `COPILOT_HOME`, `HOME`, and `USERPROFILE` point at dedicated directories so Agent Host and customization discovery do not load servers, settings, plugins, agents, or other state from the standard user home. The explicit shared-data directory prevents VS Code from reading application state from the machine-wide `.vscode-shared` directory. VS Code's bundled Copilot and core built-in extensions remain available.

The isolated Copilot permission file records approval only for the `sefaria-components-demo` MCP server for this worktree. VS Code `1.136.1` still presents its normal host approval control for the tool call, so the acceptance harness clicks **Allow in this Session**. It does not enable bypass permissions, broad MCP auto-approval, writes, terminal commands, URLs, or any other server.

Sign in to GitHub Copilot once in that window, confirm the `sefaria-components-demo` workspace server when prompted, and close the window. Authentication remains in the dedicated user-data directory and is not committed.

The Playwright acceptance harness then launches a fresh VS Code process with that same user-data and extensions pair, connects over a reserved CDP port, submits the prompt, accepts the narrow session approval, waits for the rendered card inside a host frame, and captures `docs/images/mcp-app-vscode.png` only after it finds the card:

```powershell
pnpm capture:mcp:vscode
```

To capture the card and keep the controlled VS Code window open for continued manual use:

```powershell
pnpm demo:mcp:vscode
```

On Windows, a small Python launcher uses the native minimized startup flag so automation does not take foreground focus while the user is typing elsewhere. The harness follows VS Code's own Playwright/CDP Chat smoke-test pattern and enables the built-in smoke-test driver only for the capture process. After a successful `demo:mcp:vscode` capture, it closes that process and relaunches the same isolated workspace minimized without a debugging port or smoke-test driver. The demo command stays attached until the replacement VS Code window closes; restore it from the taskbar for continued manual use. `VSCODE_MCP_PROFILE_ROOT` overrides the default profile root. `VSCODE_USER_DATA_DIR`, `VSCODE_EXTENSIONS_DIR`, `VSCODE_EXECUTABLE_PATH`, `VSCODE_DEMO_PYTHON`, and `VSCODE_MCP_SCREENSHOT` override their individual paths. An unsigned profile fails with an explicit authentication message and writes only a diagnostic screenshot under the system temporary directory.

The dedicated user-data, shared-data, Copilot home, and process-home directories are intentionally separate from the standard VS Code and Agent Host profiles. This guarantees a distinct Electron process, makes the CDP port reliable even while normal VS Code windows are open, excludes standard-profile MCP servers and shared application state, and avoids copying authentication or secret-storage files. A normal named profile can share standard-profile authentication, but it does not provide the same process or Agent Host configuration isolation.

Preview the current App without an MCP host:

```powershell
pnpm --filter @sefaria-demo/mcp-app dev
```

The development URL uses `?standalone=1` and explains that a host tool result is required. Browser tests exercise successful, invalid-payload, and documented-error rendering without a host.

## Run the Linker demonstration

```powershell
pnpm dev:linker
```

The development server shows the authored article page. It loads the same classic script produced for embedding and calls `SefariaLinker.link()` after the artifact is ready.

The [Linker demonstration guide](linker-demo.md) covers embedding, the bookmarklet, configuration, safety bounds, and host-policy limitations. The local integration is implemented; public hosting and broader live-site qualification remain external.

Build the distributable files with:

```powershell
$env:SEFARIA_LINKER_ARTIFACT_URL = "https://example.org/assets/sefaria-linker.js"
pnpm --filter @sefaria-demo/linker build
```

The configured URL is written only into `dist/bookmarklet.txt`. The script itself keeps the Sefaria API origin configurable through `SefariaLinker.link({ baseUrl })`.

## Build artifacts

Build all packages and demonstrations:

```powershell
pnpm build
```

Build and stage only the current MCP App:

```powershell
pnpm build:mcp
```

The App build creates `demos/mcp/app/dist/mcp-app.html`.

The Linker build creates:

- `demos/linker/dist/sefaria-linker.js`
- `demos/linker/dist/bookmarklet.txt`
- `demos/linker/dist/index.html`
- `demos/linker/dist/bookmarklet-demo.html`

If a required input file is missing, staging stops.

## Package index configuration

Keep package-index configuration outside the repository.

The Python lock is `demos/mcp/fixture-server/requirements.lock`. It contains exact versions and artifact hashes without a registry URL.

After a change to `pyproject.toml`, refresh the portable lock:

```powershell
uv lock --directory demos/mcp/fixture-server
uv export --directory demos/mcp/fixture-server --format requirements-txt --all-groups --no-header --output-file requirements.lock
```

Make sure that the generated file contains no private registry URL.

pnpm can record mirror-specific tarball URLs. Make sure that `pnpm-lock.yaml` contains no private registry URL before a commit.

## Tool boundaries

Vite builds browser artifacts. TypeScript builds reusable ES modules.

Vitest runs TypeScript unit tests. Vitest Browser Mode and Playwright run Lit tests in Chromium.

pytest and the FastMCP in-memory client run Python integration tests.

The workspace uses TypeScript 6.0.3. Upgrade TypeScript and `typescript-eslint` together because their supported ranges must overlap.

The workspace does not use Nx or Turborepo. Add another task layer only after the pnpm scripts fail a measured need.
