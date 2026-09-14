> Created/edited by GitHub Copilot; pending human review.

# 6. Integrate an authored article or MCP host

## Objective

Apply the same request, validation, pure projection, and request-free rendering boundaries in an ordinary authored page and in an MCP App, while distinguishing a deterministic static preview from protocol proof.

## Prerequisites

- Complete [Customize presentation and use headless APIs](05-customization.md).
- For the MCP protocol path, use the repository's compiled Node server and local reference host.

## Try it

An authored page keeps a native citation link and enhances it only after JavaScript loads:

```html
<a href="https://www.sefaria.org/Micah.6.8" data-sefaria-ref="Micah 6:8">
  Micah 6:8
</a>
```

The page-owned enhancement handles activation, calls the popup async factory with its client and `AbortSignal`, assigns the resulting view model to the request-free popup, and preserves native navigation for JavaScript-disabled and modifier-key use.

Run it with:

```powershell
pnpm dev:linked-article
```

The MCP App starts differently. The Node tool obtains a corrected API payload and puts it in `structuredContent`; the App validates that unknown JSON and calls the same pure factory. The first render makes zero duplicate source requests. Later navigation uses host-proxied server-tool calls rather than direct browser requests.

```powershell
pnpm dev:mcp
```

The site preview below uses a committed fixture and deliberately has no MCP host:

<iframe class="example-frame mcp" title="Static MCP App fixture preview" src="/examples/mcp-app/index.html?fixture=1"></iframe>

## Expected result

The linked article still navigates as ordinary HTML when enhancement is unavailable. With JavaScript, explicit activation opens a popup with visible loading, error, cancellation, and cleanup behavior.

The static MCP preview renders a supplied links payload and labels itself as rendering evidence only. `pnpm dev:mcp` separately proves compiled stdio and Streamable HTTP transports, registered resources, separate host/sandbox origins, AppBridge calls, cancellation, validation failures, and exact request deltas.

## Who owns what

| Integration | Request owner | Rendering path |
| --- | --- | --- |
| Authored article | Page enhancement | Client -> popup async factory -> popup view model -> request-free element |
| MCP first render | Node server before the tool result reaches the App | Unknown `structuredContent` -> public schema -> pure factory/controller seed -> request-free Reader |
| MCP continuation | App through the host's supported server-tool bridge | Host-proxied tool result -> validation -> controller/factory -> request-free Reader |
| Static MCP preview | No request owner; committed fixture only | Fixture -> validation/projection -> request-free Reader |

The App does not call Sefaria directly, and a successful static preview is not MCP protocol qualification.

## Exercise

Disable JavaScript and follow the authored Micah 6:8 link. Re-enable JavaScript, activate it with the keyboard, then close the popup and confirm focus restoration. For MCP, compare the static fixture label with the local reference host and identify which actions cross the tool boundary.

## Source and run links

- Linked article guide: [Authored linked article](../linked-article.md)
- Linked article source: [`examples/linked-article/src/app.ts`](https://github.com/Arithmomaniac/sefaria-web-components/blob/feature/avilevin/frontend-toolkit-alpha/examples/linked-article/src/app.ts)
- MCP guide and maintained screenshots: [MCP App demonstration](../mcp-app-demo.md)
- MCP App source: [`examples/mcp-app/src/app.ts`](https://github.com/Arithmomaniac/sefaria-web-components/blob/feature/avilevin/frontend-toolkit-alpha/examples/mcp-app/src/app.ts)
- MCP server source: [`examples/mcp-app/src/server`](https://github.com/Arithmomaniac/sefaria-web-components/tree/feature/avilevin/frontend-toolkit-alpha/examples/mcp-app/src/server)

## Next step

Return to the [documentation home](../README.md), inspect the [example catalog](https://github.com/Arithmomaniac/sefaria-web-components/blob/feature/avilevin/frontend-toolkit-alpha/examples/README.md), or follow [Development](../development.md) to run the complete repository checks.
