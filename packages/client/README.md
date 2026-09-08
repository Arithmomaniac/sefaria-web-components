> Created/edited by GitHub Copilot with human review/feedback by avilevin.

# `@sefaria/client`

`@sefaria/client` is the validated transport boundary for the Sefaria operations used by this workspace. It owns the pinned OpenAPI input, guarded corrections, generated contracts and Zod validators, thin fetch client, and bounded default-on per-client response cache.

This is a private source workspace package, not a published npm installation.

## Ordinary use

```ts
import { createSefariaClient } from "@sefaria/client";

const client = createSefariaClient();
const result = await client.getText({ path: { tref: "Micah 6:8" } });
```

Most component consumers should call an async component factory and supply this client rather than interpret the transport result themselves:

```ts
import { createSefariaClient } from "@sefaria/client";
import { loadSourceCardViewModel } from "@sefaria/components/source-card";

const viewModel = await loadSourceCardViewModel(
  { tref: "Micah 6:8" },
  createSefariaClient(),
);
```

## Entry points

| Import | Purpose |
| --- | --- |
| `@sefaria/client` | Named client functions, generated types, validation helpers, and common errors |
| `@sefaria/client/client` | Thin client implementation |
| `@sefaria/client/contracts` | Generated transport declarations |
| `@sefaria/client/schemas` | Generated Zod schemas |
| `@sefaria/client/validators` | Generated operation/status validators |
| `@sefaria/client/validation` | Shared validation helpers |
| `@sefaria/client/errors` | Contract-validation error types |

Documented HTTP errors remain typed response payloads. Network failures and aborts reject with Fetch API semantics. Undocumented statuses or invalid JSON reject as contract failures with structured paths; they are not converted to empty or success-shaped results.

See [How the pieces fit together](../../docs/guides/data-flow.md) for the client-to-component path and the [client specification](../../docs/specs/client.md) for exact behavior.
