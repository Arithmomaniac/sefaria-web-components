# Development

This guide gives the setup, build, and local-run commands.

## Tech stack

| Area                   | Technology                         |
| ---------------------- | ---------------------------------- |
| Workspace              | pnpm 11                            |
| Language               | TypeScript 6                       |
| Components             | Lit 3                              |
| Browser builds         | Vite 8                             |
| TypeScript checks      | Vitest 4 and Playwright            |
| Python fixture         | Python 3.10 or later and FastMCP 3 |
| Python environment     | uv                                 |
| Python checks          | Ruff, mypy, and pytest             |
| Continuous integration | GitHub Actions                     |

TypeScript emits reusable ES modules. Vite builds the browser demonstrations and
the single-file MCP App.

## Workspace organization

| Path                      | Purpose                                       |
| ------------------------- | --------------------------------------------- |
| `packages/ref`            | Reference operations                          |
| `packages/client`         | Public API requests                           |
| `packages/model`          | Normalized data and wire contracts            |
| `packages/text-transform` | Text transforms                               |
| `packages/components`     | Lit Web Components                            |
| `tests/compatibility`     | Cross-package compatibility checks            |
| `demos/component-lab`     | Browser development                           |
| `demos/mcp`               | MCP App, contract fixture, and Python fixture |
| `demos/linker-userscript` | Linker userscript                             |

Workspace dependencies use `workspace:*`. All workspace packages stay private
during the hackathon.

## Required tools

- Node.js 22 or later
- pnpm 11.22.0
- uv 0.11.23
- Chromium through Playwright

These tools are optional:

- Tampermonkey or a compatible userscript engine for the Linker
- an MCP Apps-compatible host for the embedded App

pnpm manages the TypeScript workspace. uv manages the Python fixture and its
Python environment.

## Install the workspace

Run these commands from the repository root:

```powershell
corepack enable
pnpm install
pnpm install:python
pnpm exec playwright install chromium
```

If Corepack is not available, use the pinned fallback:

```powershell
npx --yes pnpm@11.22.0 install
npx --yes pnpm@11.22.0 install:python
npx --yes pnpm@11.22.0 exec playwright install chromium
```

## Run the complete check

```powershell
pnpm check
```

The command runs:

- Prettier
- ESLint
- TypeScript type checks
- Vitest unit checks
- Vitest browser checks
- TypeScript package builds
- Vite builds
- Ruff
- mypy
- pytest
- FastMCP tool and resource checks
- Python wheel package-data checks

Run the command from a clean checkout before a pull request.

## Run focused checks

Run all TypeScript checks:

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

This command installs the locked Python environment. It then builds and stages
the MCP App before it runs the Python checks.

## Run the component lab

```powershell
pnpm dev
```

The Vite URL shows components that use the public base class and token contract.

## Run the MCP fixture

```powershell
pnpm dev:mcp
```

This command:

1. Builds the single-file MCP App.
2. Stages the App, schema, and example payload.
3. Starts the FastMCP fixture over standard input and output.

An MCP host can use this configuration:

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

The resource URI is `ui://sefaria/source-card.html`. Its MIME type is
`text/html;profile=mcp-app`.

Preview the App without an MCP host:

```powershell
pnpm --filter @sefaria-demo/mcp-app dev
```

The development URL uses `?standalone=1`. Standalone mode and the Python fixture
use the same example payload.

## Run the Linker userscript

```powershell
pnpm dev:linker
```

Install the development `.user.js` URL in Tampermonkey.

The default script runs only on localhost and `example.com`. To use a real test
page, add an explicit `match` value in `demos/linker-userscript/vite.config.ts`.

Do not use a match value for all sites.

## Build artifacts

Build all packages and demonstrations:

```powershell
pnpm build
```

Build and stage only the MCP App:

```powershell
pnpm build:mcp
```

The App build creates `demos/mcp/app/dist/mcp-app.html`.

`demos/mcp/stage-fixture.mjs` copies these files into ignored Python package
data:

- the built HTML
- `packages/model/contracts/source-card.schema.json`
- `demos/mcp/contract/source-card.example.json`

If an input file is missing, staging stops.

## Package index configuration

Keep package-index configuration outside the repository.

The Python lock is `demos/mcp/fixture-server/requirements.lock`. uv generates
this file with exact versions and artifact hashes. The file does not contain a
registry URL.

The same lock can install through public PyPI or an approved package mirror.

uv records the active index in `uv.lock`. Do not commit a local `uv.lock`.

After a change to `pyproject.toml`, refresh the portable lock:

```powershell
uv lock --directory demos/mcp/fixture-server
uv export --directory demos/mcp/fixture-server --format requirements-txt --all-groups --no-header --output-file requirements.lock
```

Make sure that the generated file contains no private registry URL.

pnpm can record mirror-specific tarball URLs. Make sure that `pnpm-lock.yaml`
contains no private registry URL before a commit.

## Toolchain boundaries

Vite builds browser artifacts. TypeScript builds reusable ES modules.

Vitest runs TypeScript unit checks. Vitest Browser Mode and Playwright run Lit
checks in Chromium.

pytest and the FastMCP in-memory client run the Python integration checks.

The workspace uses TypeScript 6.0.3. Upgrade TypeScript and `typescript-eslint`
together because their supported ranges must overlap.

The workspace does not use Nx or Turborepo. If the pnpm commands cannot meet a
measured need, add another task layer.
