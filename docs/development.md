# Development

This guide describes current commands and remaining planned architecture work.

## Current implementation

| Area | Current behavior | Planned change |
| --- | --- | --- |
| `packages/client` | Generates six named Core SDK functions, contracts, Zod validators, and a status-aware fetch client from a pinned corrected OpenAPI document | Expand only when a reviewed contract adds another operation |
| `packages/text-transform` | Exports option types | Implement pure sanitization, vocalization, and footnote operations |
| `packages/components` | Exports the base element and token defaults | Add component factories and request-free elements |
| `demos/mcp` | Packages an App shell and returns a text-only tool result | Add corrected payload validation and component projection |
| `tests/compatibility` | Imports the client and text-transform stubs | Add pinned compatibility evidence |

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
| `packages/client` | Pinned OpenAPI input, formal guarded overlay, generated contracts, Zod schemas, validators, and named SDK functions |
| `packages/text-transform` | Pure sanitization, vocalization, and footnotes |
| `packages/components` | Non-DOM component factories and request-free Lit elements |
| `tests/compatibility` | Pinned compatibility evidence for retained pure behavior |
| `demos/component-lab` | Browser development for view-model states and interactions |
| `demos/mcp` | Corrected-payload MCP boundary and FastMCP fixture |
| `demos/linker-userscript` | Third-party popup integration |

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

The current command checks stale OpenAPI output, then runs Prettier, ESLint, TypeScript checks, tests, builds, Python checks, MCP staging, and wheel package-data checks.

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

The operation validates the checksum and co-located overlay guards, applies `openapi/overlay.yaml` through `openapi-format` 1.33.6, extracts the six Core GET operations and recursive references into temporary storage, and runs `@hey-api/openapi-ts` 0.99.0.

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

The current page shows workspace status and the current components. Planned component-lab states will supply view models rather than references or raw payloads.

## Run the MCP fixture

```powershell
pnpm dev:mcp
```

The current command:

1. Builds the single-file MCP App.
2. Stages the App.
3. Starts the text-only FastMCP fixture over standard input and output.

The planned integration will also stage:

- the built HTML
- the corrected API payload fixture
- the generated TypeScript validator used by the App for the staged API payload

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
