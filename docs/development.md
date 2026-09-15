> Created/edited by GitHub Copilot; pending human review.

# Development

This contributor guide describes the current source tree as of September 15, 2026. The repository's specifications define intended behavior; the implementation and tests establish what is currently delivered.

The sections below separate delivered baseline behavior, changes from older plans, and work that remains intended. A runnable command is not proof that the corresponding integration is finished.

## Unpublished toolkit integration branch

The unpublished toolkit work is integrated through `feature/avilevin/frontend-toolkit-alpha`; implementation pull requests must target that branch rather than `main`. Its branch workflow is CI-only and requires the complete deterministic gate on both Ubuntu and Windows behind the stable `check` status for pull requests targeting `main` or the toolkit branch and for pushes to the toolkit branch. It deliberately has no Pages deployment, package publication, release action, OIDC permission, tag trigger, or manual-dispatch path. Failure-only artifacts are restricted to setup/check results and maintained browser diagnostics. `main` remains the separate website and Pages deployment source.

The conditional GitHub-hosted Copilot setup workflow must also exist on the repository's default branch before GitHub can use it. On the toolkit branch it is implemented but activation remains pending until the setup-only bootstrap is merged to `main` and verified in real cloud sessions. The bootstrap does not merge toolkit source into `main`; selecting the toolkit branch when launching a task determines the task's code base. Merging the bootstrap can still rerun `main`'s existing Pages workflow.

Run the deterministic workflow-policy regression with:

```powershell
pnpm test -- tests/workflow-policy.test.ts
```

The `integration:check` stage also parses active paths, package manifests, workflow YAML, and the lockfile. It rejects active Python runtime/build files, retired demo assembly, source export fallbacks, non-private manifests, publication or deployment capabilities, credential-like workflow fields, remote tarball resolutions, and unsupported installation, ownership, or deployment claims in maintained entry-point documentation. Historical evidence and immutable archive links are outside those active-path checks.

The same stage reconciles the immutable 73-file test inventory from `7bc2d258fac2959beb5252ebdbcbddbaccd0c7b7` and the nine pre-retirement showcase tests from `d7e2d59645ebf7427dcff2cbdd78073e2e7df58c`. It requires every retained destination to appear in Vitest's actual static discovery output and records a specific reason for each presentation-only or superseded retirement.

The maintained bootstrap handoff is [`IMPLEMENTATION-PLAN.md`](https://github.com/Arithmomaniac/sefaria-web-components/blob/feature/avilevin/frontend-toolkit-alpha/IMPLEMENTATION-PLAN.md). Its archive links point to the immutable pre-bootstrap baseline; it is an execution handoff, not a normative component or transport specification.

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
| `packages/web-components` | Delivers the current component-specific view models, pure and async factory subpaths, request-free elements for the current text, bilingual, reference-label, selectable source-card, connections-panel, popup, and controlled reader surfaces, plus the DOM-free bounded reader session and stateful reader controller. |
| `examples/explorer` | Provides one developer surface for request-free authored states and opt-in live pages for reference labels, text segments, bilingual segments, source cards, and contextual connections. Loading the landing page does not start every live request. |
| `examples/reader` | Demonstrates a regular website host with viewport-height spatial panes over the lower-level reader session and shared browser data source, plus an interactive host that uses `loadReaderController` and `bindReaderController` with the supported `<sefaria-reader>` component. |
| `examples/vanilla-vite` | Exercises installed public client, source-card factory, and custom-element registration paths with a deterministic validated `Micah 6:8` response. |
| `examples/linked-article` | Progressively enhances authored Sefaria anchors with the public popup factory while preserving native navigation, page-owned cancellation, visible failures, and request-free rendering. |
| `examples/mcp-app` | Exposes compiled Node stdio and Streamable HTTP `get_text` and adaptive `get_links_between_texts` tools, packages a single-file App, validates corrected payloads and metadata, includes a separate-origin AppBridge reference host and deterministic request-count proof, and retains the optional authenticated isolated VS Code hierarchy walkthrough with separate explicit chat export. |
| `docs/` and `dist/site` | Provide one GitHub-readable learning sequence and a local VitePress presentation that embeds isolated builds of the maintained examples. |
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
| Broader compatibility coverage | Extend the small current suite with additional source-backed cases, without promising exhaustive corpus equivalence | [Compatibility evidence](evidence.md#current-focused-compatibility-qualification) |

The client, text-transform foundations, current components, controlled reader, contextual and multi-pane website reader demos, same-App MCP reader, named-host hierarchy acceptance, explicit chat export, and authored linked article are already delivered. New component slices still need concrete consumers; they do not justify restoring the superseded generalized model or hidden client policies.

## Technology

| Area                   | Technology                                       |
| ---------------------- | ------------------------------------------------ |
| Workspace              | pnpm 11                                          |
| Language               | TypeScript 7                                     |
| Components             | Lit 3                                            |
| Browser builds         | Vite 8                                           |
| TypeScript tests       | Vitest 4 and Playwright                          |
| MCP server and App     | MCP TypeScript SDK 1.30.0 and MCP Apps SDK 1.7.5 |
| MCP protocol inspector | MCP Inspector 1.0.2 on the compatible SDK 1 line |
| Continuous integration | GitHub Actions                                   |

TypeScript emits reusable ES modules. Vite builds the browser demonstrations and the single-file MCP App.

## Local documentation site

Run the development site:

```powershell
pnpm dev:site
```

The command first builds isolated copies of the maintained browser examples, then starts VitePress over the canonical Markdown in `docs/`. The examples remain independent workspace projects and do not import one another at runtime. The site is local-only and does not add or change a deployment.

Build and preview the production artifact:

```powershell
pnpm build:site
pnpm preview:site
```

The generated `dist/site` directory contains the VitePress pages plus allowlisted example routes under `examples/`: explorer, Reader, vanilla, React, linked article, and the static MCP App fixture preview. The MCP preview is rendering evidence only; `pnpm dev:mcp` remains the protocol and AppBridge proof.

`pnpm build:site` typechecks each included example before bundling it. `pnpm build:site:bundles` skips those repeated typechecks and is used inside `pnpm check` after workspace builds. Both commands verify required output files and reject a same-origin authored-source fallback.

The previous Reveal.js showcase, booth loop, Pages assembly, QR assets, presentation media, and presentation-only tests are no longer active on this branch. They remain available through the full-SHA links in the [documentation archive](archive/README.md#september-14-2026-presentation-snapshot). The independently deployed `main` website remains unchanged.

## Workspace

| Path | Responsibility (status described above) |
| --- | --- |
| `packages/client` | Pinned OpenAPI input, formal guarded overlay, generated contracts, Zod schemas, validators, and named SDK functions |
| `packages/text-transform` | Pure sanitization, vocalization, and footnotes |
| `packages/web-components` | Non-DOM component factories and request-free Lit elements |
| `tests/compatibility` | Pinned compatibility evidence for retained pure behavior |
| `examples/explorer` | Request-free authored states and opt-in live diagnostics for component primitives and contextual connections |
| `examples/mcp-app` | Corrected-payload Node MCP boundary, compiled stdio and Streamable HTTP servers, self-contained App, separate-origin AppBridge reference host, static fixture preview, and isolated VS Code qualification tooling |
| `examples/linked-article` | Authored native citation navigation and page-owned popup integration |
| `examples/reader` | Interactive multi-pane website host and controlled `<sefaria-reader>` host over the DOM-free reader session |
| `examples/vanilla-vite` | Minimal deterministic public-package consumption path |
| `docs/.vitepress` and `scripts/build-site.mjs` | Local documentation presentation, navigation, styling, and isolated example assembly |

Workspace dependencies use `workspace:*`. All workspace packages remain private during this unpublished development phase.

## Required tools

Running the browser demos requires:

- Node.js 22.12 or later
- pnpm 11.22.0

Browser tests also require Chromium through Playwright.

The local deterministic browser acceptance uses the Playwright Chromium installation. An external MCP Apps-compatible host is optional for local App development and named-host qualification.

## Copilot agent and fresh-worktree setup

After Node.js and the pinned pnpm are available, prepare a fresh toolkit checkout with:

```powershell
pnpm setup:agent
```

The command performs a frozen install, checks the two immutable commits used to reconcile the historical test inventory, fetches only missing required objects from `origin`, installs Chromium, and launches and closes a headless browser. On Linux it also asks Playwright to install Chromium's system dependencies; that can require privileges supplied by the host. It uses the effective package-manager configuration and does not override registries.

Preparation can use the network and fails at the exact unsuccessful step. `pnpm check` remains the offline validation boundary: it does not fetch Git history, refresh fixtures, or contact Sefaria. If the historical objects are unavailable, the disposition error identifies `pnpm setup:agent` as the recovery command.

GitHub's `.github/workflows/copilot-setup-steps.yml` first checks for `packages/web-components/package.json` with package name `@sefaria/web-components`. Toolkit-derived branches prepare normally; an unrelated checkout logs an explicit skip. A checkout that looks like the toolkit but lacks the setup script fails rather than silently skipping. This capability-based behavior must be verified in real cloud sessions after the workflow is active on `main`.

Copilot CLI and Desktop do not automatically run the hosted workflow. Run `pnpm setup:agent` in each fresh local worktree. Concurrent Vitest browser runs may begin with port `6338`; Vitest selects another port when it is occupied. Tests on September 15, 2026 confirmed this fallback, so no custom port allocator is required.

## Install the workspace

For browser-only TypeScript work, run these commands from the repository root:

```powershell
corepack enable
pnpm install
pnpm exec playwright install chromium
```

If Corepack is unavailable, install the pinned pnpm release through your approved package-management path, then run the same commands. Do not let a transient executor download an unpinned tool.

The individual commands remain useful for targeted troubleshooting. Prefer `pnpm setup:agent` for a complete fresh-agent or fresh-worktree preparation.

## Current complete check

```powershell
pnpm check
```

The current command checks stale OpenAPI output, then runs Prettier, Oxlint, workspace builds, the production local-site assembly and browser acceptance, official Inspector stdio qualification, deterministic real HTTP/AppBridge browser acceptance, TypeScript checks, freshly emitted API-documentation checks, tests, the offline focused compatibility qualification, private tarball consumption, and changeset rehearsal. It prints the elapsed time and result of every completed stage, including the first failed stage, so a slow local run can be attributed without rerunning the complete gate. The qualification prints grouped pass, failure, unavailable-source, and intentional-difference results. It does not refresh network fixtures or contact Sefaria.

Every run writes a bounded machine-readable result to `.artifacts/check/result.json`. CI uploads that result and allowlisted browser diagnostics only after a platform failure. A Linux success cannot hide a Windows failure: the required `check` aggregation succeeds only when the complete matrix succeeds.

The MCP acceptance transport rejects unexpected requests and uses the compiled Node server, registered resource, separate host and sandbox origins, and packaged App. TypeScript projects use ignored incremental build-information files, which reduce repeated local typecheck and build work without changing emitted artifacts.

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

Run the official Inspector against the compiled stdio server:

```powershell
pnpm build:mcp
pnpm --filter @sefaria-example/mcp-app inspect:stdio
```

Run the deterministic stdio, Streamable HTTP, resource, AppBridge, sandbox, and browser acceptance:

```powershell
pnpm --filter @sefaria-example/mcp-app demo
```

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
pnpm dev:reader
```

The command serves two linked interactive pages. The root page is a realistic regular-website consumer rather than a component state gallery: its host uses one DOM-free reader session for semantic entries and capture retention, while demo-private state owns ordered pane IDs, parent relationships, compact selection, and the 20-visible-pane limit. Wide containers scroll horizontally across independently scrolling source and connections panes; compact containers show one selected pane and a path switch.

`/controlled.html` demonstrates the public stateful convenience path. The host calls `loadReaderController` with the starting reference and client, then binds the returned controller to one persistent `<sefaria-reader>` with `bindReaderController`. The controller owns continuing requests, cancellation, session transitions, captures, Back, breadcrumbs, and local connections projection while the element remains request-free.

## Run the MCP App server

```powershell
pnpm dev:mcp
```

The current command:

1. Builds the single-file MCP App, reference host, sandbox, and Node server.
2. Starts the compiled Streamable HTTP server plus separate host and sandbox origins.
3. Opens the reference browser host.

The server exposes `get_text(reference, version_language="both")`. It requests the deployed Sefaria v3 texts endpoint and returns one progressive result: plain text for every host, corrected API-shaped `structuredContent`, request/status metadata, and the App resource. The public `source`, `english`, and `both` choices select the source-card primary and translation roles through `version=primary`, `version=translation`, or both repeated values. The App bundles the generated validator and source-card factory into the staged HTML; no separate validator or payload fixture is staged.

VS Code reads the checked-in `.vscode/mcp.json`. It starts the compiled Node stdio server with `${workspaceFolder}`, so the configuration stays portable across worktrees.

```json
{
  "servers": {
    "sefaria-components-demo": {
      "type": "stdio",
      "command": "node",
      "args": ["${workspaceFolder}/examples/mcp-app/dist/server/stdio.js"]
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

The command builds the App and Node server, creates dedicated user-data, extensions, Copilot home, shared-data, and process-home directories under `%LOCALAPPDATA%\SefariaMcpDemo`, writes deterministic user settings, writes empty VS Code and Agent Host MCP configurations, clears stale chat and MCP tool caches without deleting authentication state, and opens the worktree in that environment. The profile disables MCP discovery, MCP gallery browsing, plugins, and Settings Sync; ignores extension recommendations; and uses the empty extensions directory so no user-installed extensions are loaded. `COPILOT_HOME`, `HOME`, and `USERPROFILE` point at dedicated directories so Agent Host and customization discovery do not load servers, settings, plugins, agents, or other state from the standard user home. The explicit shared-data directory prevents VS Code from reading application state from the machine-wide `.vscode-shared` directory. VS Code's bundled Copilot and core built-in extensions remain available.

The isolated Copilot permission file records approval only for the `sefaria-components-demo` MCP server for this worktree. VS Code `1.137.0` still presents its normal host approval control for the tool call, so the acceptance harness clicks **Allow in this Session**. It does not enable bypass permissions, broad MCP auto-approval, writes, terminal commands, URLs, or any other server.

Sign in to GitHub Copilot once in that window, confirm the `sefaria-components-demo` workspace server when prompted, and close the window. Authentication remains in the dedicated user-data directory and is not committed.

The Playwright acceptance harness then launches a fresh VS Code process with that same user-data and extensions pair, connects over a reserved CDP port, accepts the narrow session approval, and runs the integrated Reader walkthrough. Screenshots remain under the ignored repository-local `.artifacts/vscode-mcp` staging area until every stage passes; then capture mode publishes the three maintained screenshots and `docs/images/mcp-app-vscode-walkthrough.json`. A failed walkthrough preserves the previous outputs and reports its diagnostic directory.

```powershell
pnpm walkthrough:mcp:vscode
```

The walkthrough writes its machine-readable result to `.artifacts/vscode-mcp/walkthrough.json` and publishes no screenshots. To run the same full walkthrough and, only after complete success, publish the three maintained initial Reader, retained hierarchy, and explicit chat-export screenshots plus `docs/images/mcp-app-vscode-walkthrough.json`:

```powershell
pnpm capture:mcp:vscode
```

To open the prepared isolated workspace without automation:

```powershell
pnpm launch:mcp:vscode
```

On Windows, the Node commands use a narrow PowerShell native-process helper that calls `CreateProcessW` with `SW_SHOWMINIMIZED`, `CREATE_NEW_PROCESS_GROUP`, an exact quoted argument vector, the isolated environment, and the requested working directory. The helper returns the created process PID; cleanup closes that window and then terminates the exact remaining process tree if necessary. Only walkthrough and capture enable the smoke-test driver and a reserved debugging port. Launch-only does not attach CDP, drive the UI, submit a prompt, or call a tool. Data navigation during walkthrough remains in one App through host-proxied tools. Explicit chat export fills the real composer through `ui/message`; the harness verifies that text without submitting it and records `host-message`.

`VSCODE_MCP_PROFILE_ROOT` overrides the default profile root. `VSCODE_USER_DATA_DIR`, `VSCODE_EXTENSIONS_DIR`, `VSCODE_EXECUTABLE_PATH`, `VSCODE_MCP_SCREENSHOT`, and `VSCODE_MCP_RESULT` override their individual paths. Failed walkthrough diagnostics remain under `.artifacts/vscode-mcp` and do not replace maintained screenshots or the maintained result.

The dedicated user-data, shared-data, Copilot home, and process-home directories are intentionally separate from the standard VS Code and Agent Host profiles. This guarantees a distinct Electron process, makes the CDP port reliable even while normal VS Code windows are open, excludes standard-profile MCP servers and shared application state, and avoids copying authentication or secret-storage files. A normal named profile can share standard-profile authentication, but it does not provide the same process or Agent Host configuration isolation.

Preview a clearly labeled static fixture without an MCP host:

```powershell
pnpm --filter @sefaria-example/mcp-app preview:fixture
```

This preview proves fixture-driven rendering only. It is not protocol, resource, AppBridge, sandbox, or request-count evidence.

## Run the authored linked article

```powershell
pnpm dev:linked-article
```

The development server shows the authored article page. The native citation is present in static HTML; the module enhancement calls the public popup factory only after an eligible unmodified activation.

The [authored linked-article guide](linked-article.md) covers native fallback, page-owned request lifecycle, strict deterministic transport, and the immutable archive for the retired automatic Linker.

## Build artifacts

Build all packages and demonstrations:

```powershell
pnpm build
```

Build only the current MCP App, host, sandbox, and Node server:

```powershell
pnpm build:mcp
```

The App build creates `examples/mcp-app/dist/app/mcp-app.html`; compiled server entries are under `examples/mcp-app/dist/server`, and host assets are under `examples/mcp-app/dist/host`.

The linked-article build creates `examples/linked-article/dist`.

If a required input file is missing, staging stops.

### Build and pack the private libraries

The normal build creates `dist` JavaScript and declarations before workspace consumers typecheck:

```powershell
pnpm install --frozen-lockfile
pnpm build
$repository = (Resolve-Path .).Path
$destination = Join-Path $repository ".toolchain\tarballs"
New-Item -ItemType Directory -Force $destination
pnpm --filter @sefaria/client pack --pack-destination $destination
pnpm --filter @sefaria/text-transform pack --pack-destination $destination
pnpm --filter @sefaria/web-components pack --pack-destination $destination
```

The packages remain private. There is no npm alpha installation command, publication workflow, tag, or release in this branch.

Run `pnpm package:smoke` to create an isolated Vite consumer, inspect each unchanged packed manifest and file list, override all three internal toolkit dependencies to their exact `file:` tarballs, inspect the lockfile and installed real paths, remove the producer tarballs, build, import the Node-safe subpaths, and render the source-card path in Chromium. Consumer-side overrides are required for this local private-tarball topology because pnpm otherwise attempts registry resolution for a packed package's internal toolkit dependency.

Run `pnpm metadata:generate` after changing a public export or element contract. `pnpm metadata:check` rejects stale `packages/web-components/custom-elements.json`, `packages/public-exports.json`, and their readable summaries under `docs/reference/`.

Run `pnpm changeset:rehearse` to exercise the pinned private fixed group in a disposable fixture. The current rehearsal proves the observed `0.1.1-alpha.0` to `0.1.1-alpha.1` sequence from a `0.1.0` fixture, synchronized internal dependencies and changelogs, retained private flags, and no automatic commit or tag. It does not publish anything or promise that a future authorized release starts at those versions.

## Package index configuration

Keep package-index configuration outside the repository. pnpm can record mirror-specific tarball URLs. Make sure that `pnpm-lock.yaml` contains no private registry URL before a commit.

## Tool boundaries

Vite builds browser artifacts. TypeScript builds reusable ES modules.

Vitest runs TypeScript unit and protocol tests. Vitest Browser Mode and Playwright run Lit tests in Chromium. The official MCP Inspector qualifies the compiled stdio server, and the deterministic local harness exercises the compiled stdio and Streamable HTTP transports through the real AppBridge host and packaged App.

### Why this repository uses Oxlint

The repository moved away from ESLint because its required TypeScript integration was not compatible with the compiler upgrade: `typescript-eslint` 8.67.0 officially supports TypeScript versions below 6.1, not TypeScript 7. ESLint core alone does not provide the TypeScript parsing and rules this workspace used, so retaining the ESLint toolchain would have kept the workspace compiler on TypeScript 6.

The workspace uses TypeScript 7.0.2 and native Oxlint rules. `pnpm lint` does not enable Oxlint's type-aware rules; `pnpm typecheck` remains the compiler-owned type gate.

`pnpm check:api-docs` removes and freshly emits declaration files for handwritten package source and client scripts, then parses those declarations and requires JSDoc on exported declarations, exported interface properties, and public class properties. It ignores generated declarations and compiler-emitted private fields. This output check replaces the former `eslint-plugin-jsdoc` source check because Oxlint's JavaScript-plugin selector engine did not visit an exported class property during qualification.

`@hey-api/openapi-ts` 0.99.0 still uses the TypeScript 6 compiler API. `packages/client` therefore pins TypeScript 6.0.3 for that generator only. Its `build` and `typecheck` scripts explicitly invoke the workspace-root TypeScript 7 compiler. Do not remove the local generator pin or the workspace-root compiler invocation independently; `tests/toolchain-versions.test.ts` enforces both sides of this boundary.

This arrangement separates four responsibilities: Oxlint performs explicitly configured syntax and source-quality checks, the workspace TypeScript 7 compiler owns typechecking and package output, the API-documentation check owns JSDoc enforcement on freshly emitted public declarations, and the client-local TypeScript 6 compiler exists only inside the OpenAPI generator. It is a qualified compatibility arrangement, not a claim that Oxlint and declaration-output analysis are universally better than ESLint and source-AST plugins.

Reconsider ESLint when its TypeScript integration officially supports the workspace TypeScript version and the required source-level JSDoc policy can run without an incompatible compiler or plugin boundary. Also reconsider the choice if Oxlint loses required rule parity, develops platform reliability problems, or makes the lint policy materially harder to maintain. Evaluate a return with the repository's executable counterexamples, full checks, cross-platform runs, and measured performance rather than ecosystem preference alone. Do not remove the declaration-output check until a replacement demonstrably covers its exported-declaration and public-property cases; the client-local TypeScript 6 generator boundary is an independent compatibility issue.

The workspace does not use Nx or Turborepo. Add another task layer only after the pnpm scripts fail a measured need.
