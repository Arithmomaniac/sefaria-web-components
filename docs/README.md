> Created/edited by GitHub Copilot; pending human review.

# Documentation

Sefaria supplies texts and metadata. This project supplies a validated client, pure text processing, component-specific factories, request-free Web Components, and a controlled Reader. Start with the task you need; the specifications are reference material, not a prerequisite.

This Markdown page is the repository-native documentation home. `pnpm dev:site` presents the same maintained files through a local VitePress site with isolated interactive examples. The site is unpublished and is not required to use the source.

## Learn step by step

1. [Understand Web Components and toolkit ownership](learn/01-web-components.md): registration, properties versus attributes, events, encapsulation, and `client -> factory -> view model -> element`.
2. [Set up and render supplied data](learn/02-supplied-data.md): private workspace and local-tarball setup, validation, pure projection, and a zero-request Micah 6:8 render.
3. [Load data and handle interaction](learn/03-live-data.md): explicit async factory calls, loading, visible failures, component selection events, cancellation, and stale-result rejection.
4. [Use the Reader or compose a custom host](learn/04-reader.md): the supported controlled Reader and the extra responsibilities of spatial composition.
5. [Customize presentation and use headless APIs](learn/05-customization.md): theme, width, side visibility/order, layout, client, factories, and text transforms.
6. [Integrate an authored article or MCP host](learn/06-host-integration.md): native-link enhancement, server-provided data, host-proxied tools, and static-preview limits.

React users can branch from steps 2 and 3 into [Use the Web Components from React](learn/react.md). It uses the same packages and elements; there is no React wrapper package.

## Start from a complete solution

You do not need to finish the tutorial before using the toolkit:

| Need | Destination |
| --- | --- |
| Prebuilt stateful reading surface | [Controlled Reader lesson](learn/04-reader.md) and [`examples/reader/controlled.html`](https://github.com/Arithmomaniac/sefaria-web-components/blob/feature/avilevin/frontend-toolkit-alpha/examples/reader/controlled.html) |
| Component states and live diagnostics | [Example catalog](https://github.com/Arithmomaniac/sefaria-web-components/blob/feature/avilevin/frontend-toolkit-alpha/examples/README.md) |
| A passage card in a browser app | [Render text](guides/render-text.md) |
| Authored citation popups | [Linked article](linked-article.md) |
| Reader in an MCP Apps host | [MCP App demonstration](mcp-app-demo.md) |

## Understand the design

- [How the pieces fit together](guides/data-flow.md)
- [Text markup, with examples](guides/text-markup.md)
- [Intentional differences from Sefaria](guides/differences.md)
- [Reader navigation and host boundaries](guides/reader-navigation.md)
- [Stable ownership and dependency boundaries](design.md)
- [Observed source evidence and provenance](evidence.md)

**Current** means delivered on the documented repository baseline. **Planned** means intended but not delivered. **Observed** identifies evidence from a named source or capture, not a universal promise about every Sefaria text.

## Reference and contribution

| Goal | Document |
| --- | --- |
| Set up the repository and run local/site checks | [Development](development.md) |
| Review a change at the right depth | [Review](review.md) |
| Use the validated transport package | [`@sefaria/client`](https://github.com/Arithmomaniac/sefaria-web-components/blob/feature/avilevin/frontend-toolkit-alpha/packages/client/README.md) |
| Use text transforms without components | [`@sefaria/text-transform`](https://github.com/Arithmomaniac/sefaria-web-components/blob/feature/avilevin/frontend-toolkit-alpha/packages/text-transform/README.md) |
| Choose component and Reader subpaths | [`@sefaria/web-components`](https://github.com/Arithmomaniac/sefaria-web-components/blob/feature/avilevin/frontend-toolkit-alpha/packages/web-components/README.md) |
| Inspect generated element metadata | [Custom elements](reference/custom-elements.md) |
| Inspect declaration-derived package exports | [Public package exports](reference/public-exports.md) |
| Find historical removed material | [Documentation archive](archive/README.md) |

## Specifications

Specifications own intended behavior and acceptance rules. Generated declarations own field-level transport definitions; component subpaths define rendering types.

- [Client specification](specs/client.md)
- [Text-processing specification](specs/text-processing.md)
- [Component specification](specs/components.md)
- [Integration specification](specs/integrations.md)
