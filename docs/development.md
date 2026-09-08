> Created/edited by GitHub Copilot with human review/feedback by Avi Levin.

# Development

This contributor guide describes the current source tree as of September 8, 2026. The repository's specifications define intended behavior; the implementation and tests establish what is currently delivered.

The sections below separate delivered baseline behavior, changes from older plans, and work that remains intended. A runnable command is not proof that the corresponding integration is finished.

## Contributor guides

For reader-oriented explanations, use the friendly guides rather than the archived demo transcripts:

- [How the pieces fit together](guides/data-flow.md)
- [Render text](guides/render-text.md)
- [Text markup](guides/text-markup.md)
- [Intentional differences from Sefaria](guides/differences.md)
- [Reader navigation and host boundaries](guides/reader-navigation.md)

## Implemented on this baseline

| Area | Baseline status |
| --- | --- |
| `packages/client` | Delivers eight named Core GET and POST SDK functions, committed corrected TypeScript contracts, reusable Core schemas, Zod validators, and a status-aware fetch client with a bounded default-on per-client response cache. The corrected Core OpenAPI document is temporary generation output. |
| `packages/text-transform` | Delivers DOM-free sanitization, Hebrew vocalization modes, structured footnote extraction, and bounded connected-text previews. |
| `packages/components` | Delivers the current component-specific view models, pure and async factory subpaths, request-free elements for the current text, bilingual, reference-label, selectable source-card, connections-panel, popup, and controlled reader surfaces, plus the DOM-free bounded reader session and stateful reader controller. |
| `demos/explorer` | Provides one developer surface for request-free authored states and opt-in live pages for reference labels, text segments, bilingual segments, source cards, and contextual connections. Loading the landing page does not start every live request. |
| `demos/reader-workspace` | Demonstrates a regular website host with viewport-height spatial panes over the lower-level reader session and shared browser data source, plus an interactive host that uses `loadReaderController` and `bindReaderController` with the supported `<sefaria-reader>` component. |
| `demos/mcp` | Exposes live `get_text` and adaptive `get_links_between_texts` tools, packages a single-file App, validates corrected payloads and metadata, seeds one stateful reader with zero initial requests, continues through host-proxied same-App tool calls, retains local breadcrumbs, and provides an authenticated isolated VS Code hierarchy walkthrough with separate explicit chat export. |
| `demos/showcase` | Presents the supported controller-backed Reader, a separate manually composed side-by-side source/connections workflow, the Linker, and captured integrated MCP Reader evidence in the Reveal.js GitHub Pages deck. |
| `demos/linker` | Builds an embeddable classic script, bookmarklet loader, automatic and no-autostart article pages, asynchronous citation detection, safe DOM linking, and request-free popups. Public hosting and broad live-site qualification remain external. |
| `tests/compatibility` | Delivers focused pinned client and transform comparisons, a composed v3 validate-to-transform smoke case, and grouped qualification output without network access. The evidence is representative and non-exhaustive. |

## What changed from earlier plans

These are superseded decisions, not an uncompleted backlog:

- The generalized `@sefaria/model` foundation and broad offline reference parser are no longer the delivery architecture. The corrected OpenAPI contract and thin `@sefaria/client` own transport data; component factories own projections.
- The earlier unbounded or implicit cache proposal was removed from the baseline. The current client instead implements one bounded, default-on, per-client response cache with explicit opt-out; retries and request coalescing remain excluded.
- A separate text-range request and view-model stack was replaced by a bounded source-card collection. A single segment is a one-item collection, while a range remains one outer request with card-level reference data.
- Attribution belongs once at the source-card level for each displayed edition, not inside every repeated text segment.
- The private `SourceCardData` MCP wire format is superseded. The current integration uses corrected API-shaped JSON, boundary validation, and the same source-card pure factory as client mode.

The [historical decision record](evidence.md#historical-decision-provenance) explains the sources and supersession behind these changes. Work on other branches is not included in this baseline. Use the [repository issues](https://github.com/Arithmomaniac/sefaria-web-components/issues) page for live delivery tracking, not as the definition of a component contract.

## Still intended

These are remaining intended capabilities, not removed plans. A scaffold, command, or specification does not make them delivered.

| Planned capability | Intended result | Contract |
| --- | --- | --- |
| Public Linker hosting and broader live-site qualification | Host the built artifact and prove the bounded integration against representative third-party sites and browser policies | [Linker demonstration](linker-demo.md), [Linker integration](specs/integrations.md#linker-script-purpose) |
| Broader compatibility coverage | Extend the small current suite with additional source-backed cases, without promising exhaustive corpus equivalence | [Compatibility evidence](evidence.md#current-focused-compatibility-qualification) |

The client, text-transform foundations, current components, controlled reader, contextual and multi-pane website reader demos, same-App MCP reader, named-host hierarchy acceptance, explicit chat export, and Linker demonstration are already delivered. New component slices still need concrete consumers; they do not justify restoring the superseded generalized model or hidden client policies.

## Technology

| Area                   | Technology                         |
| ---------------------- | ---------------------------------- |
| Workspace              | pnpm 11                            |
| Language               | TypeScript 7                       |
| Components             | Lit 3                              |
| Browser builds         | Vite 8                             |
| TypeScript tests       | Vitest 4 and Playwright            |
| Python MCP server      | Python 3.10 or later and FastMCP 3 |
| Python environment     | uv                                 |
| Python checks          | Ruff, mypy, and pytest             |
| Continuous integration | GitHub Actions                     |

TypeScript emits reusable ES modules. Vite builds the browser demonstrations and the single-file MCP App.

## Showcase and GitHub Pages

Run the interactive deck locally:

```powershell
pnpm dev:showcase
```

The deck calls the deployed Sefaria API. Network, CORS, contract, and documented HTTP failures remain visible; there is no automatic fixture fallback.

The top-level presentation requires a browser content viewport of at least 1440 by 900 CSS pixels. Below either dimension it replaces the deck with a blocking larger-window message; enlarging the viewport restores the same slide and mounted demonstrations. The mouse wheel moves forward and backward through the deck. On the MCP slide it traverses the three recorded screenshots before leaving the slide in either direction. Scrollable code, JSON, component panes, and live iframe demonstrations retain their native scrolling rather than advancing the deck.

Build the exact allowlisted Pages artifact:

```powershell
pnpm build:pages
pnpm preview:pages
```

The generated `dist/pages` directory puts the deck at the site root, the consolidated developer explorer under `demos/explorer/`, the packaged and spatial Reader pages under `demos/reader-workspace/`, compatibility redirects at the former demo subpaths, and the Linker artifact under `demos/linker/`. In GitHub Actions, the build derives the public Linker URL from `GITHUB_REPOSITORY`. For another public location, set `SEFARIA_PAGES_URL` to the HTTPS site root before `pnpm build:pages`.

`pnpm build:pages` typechecks each included demo before bundling it so the command remains safe to run independently. CI runs `pnpm build:pages:bundles` only after `pnpm check` has already completed the workspace typecheck; that command rebuilds the Pages bundles with their publication-specific base URLs without repeating TypeScript compilation.

Public screenshots live under `demos/showcase/public/media` with `manifest.json` provenance. The MCP slide displays the recorded stateful Reader, retained hierarchy, and explicit chat export from named-host acceptance; GitHub Pages does not run the Python MCP server. Confirm quotation permission and every public asset before enabling the Pages deployment.

## Workspace

| Path | Responsibility (status described above) |
| --- | --- |
| `packages/client` | Pinned OpenAPI input, formal guarded overlay, generated contracts, Zod schemas, validators, and named SDK functions |
| `packages/text-transform` | Pure sanitization, vocalization, and footnotes |
| `packages/components` | Non-DOM component factories and request-free Lit elements |
| `tests/compatibility` | Pinned compatibility evidence for retained pure behavior |
| `demos/explorer` | Request-free authored states and opt-in live diagnostics for component primitives and contextual connections |
| `demos/mcp` | Corrected-payload MCP boundary, live FastMCP server, self-contained App, and isolated VS Code acceptance tooling |
| `demos/linker` | Third-party citation detection, DOM linking, and popup integration |
| `demos/reader-workspace` | Interactive multi-pane website host and controlled `<sefaria-reader>` host over the DOM-free reader session |
| `demos/showcase` | Reveal.js GitHub Pages showcase, React factory bindings, resizable preview viewports, and static Pages assembly |

Workspace dependencies use `workspace:*`. All workspace packages remain private during the hackathon.

## Required tools

Running the browser demos requires:

- Node.js 22.12 or later
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

The current command checks stale OpenAPI output, then runs Prettier, Oxlint, Python static checks, TypeScript checks, freshly emitted API-documentation checks, tests, the offline focused compatibility qualification, builds, MCP staging, and Python tests. It prints the elapsed time and result of every completed stage, including the first failed stage, so a slow local run can be attributed without rerunning the complete gate. The qualification prints grouped pass, failure, unavailable-source, and intentional-difference results. It does not refresh network fixtures.

The full check requires the Python fixture environment and includes MCP staging. Python formatting, linting, and typechecking run before the TypeScript gate so inexpensive Python failures stop early; tests that inspect the staged App remain at the end. Browser-only TypeScript demos do not require that Python setup. TypeScript projects use ignored incremental build-information files, which reduce repeated local typecheck and build work without changing emitted artifacts.

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

## Run the component explorer

```powershell
pnpm dev
```

The landing page links to authored states and opt-in live diagnostics. Authored states exercise production elements without requests; live pages use ordinary HTML controls, the production client, component factories, and request-free elements. Opening the landing page does not start all live requests.

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

## Run the multi-pane website reader

```powershell
pnpm dev:reader-workspace
```

The command serves two linked interactive pages. The root page is a realistic regular-website consumer rather than a component state gallery: its host uses one DOM-free reader session for semantic entries and capture retention, while demo-private state owns ordered pane IDs, parent relationships, compact selection, and the 20-visible-pane limit. Wide containers scroll horizontally across independently scrolling source and connections panes; compact containers show one selected pane and a path switch.

`/controlled.html` demonstrates the public stateful convenience path. The host calls `loadReaderController` with the starting reference and client, then binds the returned controller to one persistent `<sefaria-reader>` with `bindReaderController`. The controller owns continuing requests, cancellation, session transitions, captures, Back, breadcrumbs, and local connections projection while the element remains request-free.

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

The Playwright acceptance harness then launches a fresh VS Code process with that same user-data and extensions pair, connects over a reserved CDP port, accepts the narrow session approval, and runs the integrated Reader walkthrough. Screenshots remain in a temporary staging directory until every stage passes; then it publishes the screenshots and `docs/images/mcp-app-vscode-walkthrough.json`. A failed walkthrough preserves the previous outputs and reports its temporary diagnostic directory.

```powershell
pnpm capture:mcp:vscode
```

To capture the Reader and keep the controlled VS Code window open for continued manual use:

```powershell
pnpm demo:mcp:vscode
```

On Windows, a small Python launcher uses the native minimized startup flag so automation does not take foreground focus while the user is typing elsewhere. The harness follows VS Code's own Playwright/CDP Chat smoke-test pattern and enables the built-in smoke-test driver only for the capture process. Data navigation stays in one App through host-proxied tools. Explicit chat export fills the real composer through `ui/message`; the harness verifies that text without submitting it and records `host-message`. After a successful `demo:mcp:vscode` capture, it closes that process and relaunches the same isolated workspace minimized without a debugging port or smoke-test driver. The demo command stays attached until the replacement VS Code window closes; restore it from the taskbar for continued manual use. `VSCODE_MCP_PROFILE_ROOT` overrides the default profile root. `VSCODE_USER_DATA_DIR`, `VSCODE_EXTENSIONS_DIR`, `VSCODE_EXECUTABLE_PATH`, `VSCODE_DEMO_PYTHON`, and `VSCODE_MCP_SCREENSHOT` override their individual paths. An unsigned profile fails with an explicit authentication message and retains diagnostics under the system temporary directory.

For presentation capture, set `VSCODE_MCP_SHOWCASE=1` and an explicit `VSCODE_MCP_SCREENSHOT` path outside the public media directory. This selects the natural-language prompt, resets the configured zoom, enters fullscreen, and centers Chat before the same walkthrough. The isolated profile hides session history and sticky prompts. Native CDP screenshots avoid Electron zoom clipping, and bounded host-list scrolling keeps the Reader header visible. Inspect the initial, hierarchy, and export images before promoting those three files into the gallery; the result remains labeled `showcase-capture`, not a separate host qualification.

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

The workspace uses TypeScript 7.0.2 and native Oxlint rules. `pnpm lint` does not enable Oxlint's type-aware rules; `pnpm typecheck` remains the compiler-owned type gate.

`pnpm check:api-docs` removes and freshly emits declaration files for handwritten package source and client scripts, then parses those declarations and requires JSDoc on exported declarations, exported interface properties, and public class properties. It ignores generated declarations and compiler-emitted private fields. This output check replaces the former `eslint-plugin-jsdoc` source check because Oxlint's JavaScript-plugin selector engine did not visit an exported class property during qualification.

`@hey-api/openapi-ts` 0.99.0 still uses the TypeScript 6 compiler API. `packages/client` therefore pins TypeScript 6.0.3 for that generator only. Its `build` and `typecheck` scripts explicitly invoke the workspace-root TypeScript 7 compiler. Do not remove the local generator pin or the workspace-root compiler invocation independently; `tests/toolchain-versions.test.ts` enforces both sides of this boundary.

This arrangement separates four responsibilities: Oxlint performs explicitly configured syntax and source-quality checks, the workspace TypeScript 7 compiler owns typechecking and package output, the API-documentation check owns JSDoc enforcement on freshly emitted public declarations, and the client-local TypeScript 6 compiler exists only inside the OpenAPI generator. It is a qualified compatibility arrangement, not a claim that Oxlint and declaration-output analysis are universally better than ESLint and source-AST plugins.

Reconsider ESLint when its TypeScript integration officially supports the workspace TypeScript version and the required source-level JSDoc policy can run without an incompatible compiler or plugin boundary. Also reconsider the choice if Oxlint loses required rule parity, develops platform reliability problems, or makes the lint policy materially harder to maintain. Evaluate a return with the repository's executable counterexamples, full checks, cross-platform runs, and measured performance rather than ecosystem preference alone. Do not remove the declaration-output check until a replacement demonstrably covers its exported-declaration and public-property cases; the client-local TypeScript 6 generator boundary is an independent compatibility issue.

The workspace does not use Nx or Turborepo. Add another task layer only after the pnpm scripts fail a measured need.
