# Development

This guide describes current commands and planned architecture work. The current implementation does not yet satisfy all planned contracts.

## Current implementation

| Area | Current behavior | Planned change |
| --- | --- | --- |
| `packages/client` | Exports client option and cache types and imports `TextResponse` from `@sefaria/model` | Replace with the OpenAPI supply chain and thin client |
| `packages/model` | Exports normalized types, `SourceCardData`, and a runtime guard | Remove the package |
| `packages/ref` | Exports reference type stubs without a production consumer | Retire the package from Core |
| `packages/text-transform` | Exports option types | Implement pure sanitization, vocalization, and footnote operations |
| `packages/components` | Exports a base element and a source card that accepts `SourceCardData` | Add component factories and make every element view-model-only |
| `demos/mcp` | Stages a private source-card schema and fixture | Replace the writer, validator, App reader, and fixture atomically |
| `tests/compatibility` | Imports `@sefaria/model` and `@sefaria/ref` in workspace checks | Remove obsolete package dependencies during their owning migrations |

## Technology

| Area                   | Technology                         |
| ---------------------- | ---------------------------------- |
| Workspace              | pnpm 11                            |
| Language               | TypeScript 6                       |
| Components             | Lit 3                              |
| Browser builds         | Vite 8                             |
| TypeScript tests       | Vitest 4 and Playwright            |
| Python fixture         | Python 3.10 or later and FastMCP 3 |
| Python environment     | uv                                 |
| Python checks          | Ruff, mypy, and pytest             |
| Continuous integration | GitHub Actions                     |

TypeScript emits reusable ES modules. Vite builds the browser demonstrations and the single-file MCP App.

## Workspace

| Path | Planned responsibility |
| --- | --- |
| `packages/client` | Pinned OpenAPI input, overlay, corrected artifact, generated contracts, public schemas, validators, and thin client |
| `packages/text-transform` | Pure sanitization, vocalization, and footnotes |
| `packages/components` | Non-DOM component factories and request-free Lit elements |
| `tests/compatibility` | Pinned compatibility evidence for retained pure behavior |
| `demos/component-lab` | Browser development for view-model states and interactions |
| `demos/mcp` | Corrected-payload MCP boundary and FastMCP fixture |
| `demos/linker-userscript` | Third-party popup integration |

`packages/model` is planned for removal. `packages/ref` is outside current Core scope.

Workspace dependencies use `workspace:*`. All workspace packages remain private during the hackathon.

## Required tools

- Node.js 22 or later
- pnpm 11.22.0
- uv 0.11.23
- Chromium through Playwright

Tampermonkey or a compatible userscript engine is optional. An MCP Apps-compatible host is optional for local App development and required for host acceptance.

## Install the workspace

Run these commands from the repository root:

```powershell
corepack enable
pnpm install
pnpm install:python
pnpm exec playwright install chromium
```

If Corepack is unavailable, use the pinned fallback:

```powershell
npx --yes pnpm@11.22.0 install
npx --yes pnpm@11.22.0 install:python
npx --yes pnpm@11.22.0 exec playwright install chromium
```

## Current complete check

```powershell
pnpm check
```

The current command runs Prettier, ESLint, TypeScript checks, tests, builds, Python checks, MCP staging, and wheel package-data checks.

The current command does not yet generate or validate the planned OpenAPI artifacts with corrections.

## Current focused checks

Run all TypeScript tests:

```powershell
pnpm test
```

Run the compatibility harness:

```powershell
pnpm exec vitest run tests/compatibility
```

Run the Python checks:

```powershell
pnpm check:python
```

The Python command builds the current MCP App and stages the current private files for the source card before it runs Python checks.

## Planned OpenAPI workflow

The planned repository scripts do not exist yet. Their implementation can refine names, but it must preserve these operations.

### Explicit refresh

The refresh operation requires a complete Sefaria commit SHA. It can access the network.

Its planned behavior is equivalent to:

```powershell
pnpm openapi:refresh --commit 1f7d0844ca6a9eddc8e48168962aacb09de75bd6
```

The operation downloads only the OpenAPI document from that commit. It updates the committed pin, upstream input, and SHA-256.

It then applies the local overlay and regenerates the corrected document, TypeScript contracts, and runtime validators.

### Offline generation

The ordinary generation operation reads only committed files:

```powershell
pnpm openapi:generate
```

The operation validates the checksum, applies old-state assertions, writes the corrected OpenAPI document, and regenerates public outputs.

It must not access Sefaria, GitHub, the current time, or environment-specific data.

### Stale-output check

The planned check regenerates artifacts in a clean temporary location and compares them with committed output:

```powershell
pnpm openapi:check
```

The check fails if any generated file is stale. The planned `pnpm check` includes this operation.

### Overlay failure

If upstream content differs from an asserted old value, generation stops with an exact path:

```text
OpenAPI overlay mismatch at /paths/~1api~1texts~1versions~1{index}/get/responses/200/content/VersionJSON
expected: media-type key is present
actual: media-type key is absent
```

The developer must review the new upstream document. Do not change an assertion only to make generation pass.

## Planned generated artifacts

`@sefaria/client` will commit:

- the upstream OpenAPI input
- the complete commit pin
- the SHA-256
- the deterministic Core overlay
- the corrected OpenAPI document
- generated TypeScript `paths`, `components`, and operation declarations
- generated corrected public schemas and TypeScript runtime validators

The exact directories and generator packages remain open implementation choices. Generated and corrected files must identify their source pin and generation command.

Do not edit generated declarations or the corrected artifact by hand.

## Run the component lab

```powershell
pnpm dev
```

The current page shows workspace status and the current components. Planned component-lab states will supply view models rather than references or raw payloads.

## Run the MCP fixture

```powershell
pnpm dev:mcp
```

The current command:

1. Builds the single-file MCP App.
2. Stages the App, `source-card.schema.json`, and `source-card.example.json`.
3. Starts the FastMCP fixture over standard input and output.

This staging path belongs to the current implementation. The integration specification defines its replacement.

The planned atomic migration will stage:

- the built HTML
- the corrected API payload fixture
- the public corrected JSON Schema for the staged API payload

It will remove the private `SourceCardData` schema and fixture names in the same change.

An MCP host can use this current configuration:

```json
{
  "mcpServers": {
    "sefaria-components-demo": {
      "command": "uv",
      "args": [
        "run",
        "--no-sync",
        "--directory",
        "C:\\path\\to\\sefaria-web-components\\demos\\mcp\\fixture-server",
        "sefaria-mcp-app-fixture"
      ]
    }
  }
}
```

The resource URI is `ui://sefaria/source-card.html`. Its MIME type is `text/html;profile=mcp-app`.

Preview the current App without an MCP host:

```powershell
pnpm --filter @sefaria-demo/mcp-app dev
```

The development URL uses `?standalone=1`.

## Run the Linker userscript

```powershell
pnpm dev:linker
```

Install the development `.user.js` URL in Tampermonkey.

The default script runs only on localhost and `example.com`. To use another test page, add an explicit `match` value in `demos/linker-userscript/vite.config.ts`.

Do not use a match value for all sites.

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
