> Created/edited by GitHub Copilot with human review/feedback by avilevin.

# Source handoff

This repository delivers reusable, source-level building blocks for placing Sefaria reading experiences in browser and MCP hosts. It is intentionally not a replacement for Sefaria.org, a published package release, or a claim of exhaustive corpus compatibility.

## What is delivered

The project addresses four steps between receiving JSON and presenting a reading experience:

1. `@sefaria/client` validates the corrected transport contract and preserves documented HTTP, network, and abort semantics.
2. `@sefaria/text-transform` safely prepares Sefaria's structured text markup and Hebrew vocalization.
3. Pure `@sefaria/components` factories project transport payloads into component-specific rendering data.
4. Request-free Web Components own layout, accessibility, interaction, and theming.

The same pieces support both packaged and host-specific compositions:

| Capability | Example |
| --- | --- |
| Text, bilingual, reference, source-card, and connections primitives | [Developer explorer](../demos/explorer/index.html) |
| Supported packaged Reader | `demos/reader-workspace/controlled.html` |
| Custom host-owned spatial reading workflow | `demos/reader-workspace/index.html` |
| Reading surfaces embedded in an ordinary page | [Linker demonstration](linker-demo.md) |
| The Reader delivered through an MCP App | [MCP App demonstration](mcp-app-demo.md) |
| Guided explanation of the complete story | [Public showcase](https://arithmomaniac.github.io/sefaria-web-components/) |

The Reader is one composition of the reusable contracts, not the whole product. The spatial workspace deliberately demonstrates that a host can use lower-level session and component contracts when the packaged composition does not fit its interaction model.

## What Sefaria would maintain

| Owner | Maintained responsibility |
| --- | --- |
| `packages/client` | Pinned upstream OpenAPI input, guarded corrections, generated contracts and validators, thin client, and bounded per-client response cache |
| `packages/text-transform` | Pure sanitization, vocalization, footnotes, and connected-text previews |
| `packages/components` | Component request types, view models, pure/async factories, reader session/controller, and request-free elements |
| `demos/explorer` | Authored component states and live developer diagnostics |
| `demos/reader-workspace`, `demos/linker`, `demos/mcp`, `demos/showcase` | Distinct website, embedding, host-transport, and presentation examples |
| `docs/specs` | Intended behavior and acceptance rules |
| `docs/evidence.md` | Upstream observations, deployed fixtures, captures, and provenance |

The [design](design.md) defines ownership boundaries. The [development guide](development.md) is the setup and command reference. The [review guide](review.md) identifies the additional gates for contract, generated, Unicode, and integration changes.

## Source and behavior authority

Use this order when evidence conflicts:

1. Repository specifications define intended behavior.
2. The pinned Sefaria route, handler, response builder, and tests inform OpenAPI corrections.
3. The pinned OpenAPI input plus guarded overlay defines transport payloads.
4. Component view models define rendering data.
5. `docs/evidence.md` records observations and provenance.

The implementation deliberately differs from Sefaria in a small number of documented areas, including sanitizer policy and some interaction choices. Review [Intentional differences](guides/differences.md) before treating visual or text-processing differences as regressions.

## Delivery limits

- All packages are private `0.0.0` workspace packages whose exports point to TypeScript source. This is a source handoff, not an npm or CDN distribution.
- The project is experimental and has no support or stability guarantee.
- Compatibility evidence is focused and representative, not exhaustive across the Sefaria corpus.
- Linker public hosting and broad third-party-site qualification are outside this source delivery.
- MCP screenshots and acceptance records apply to the named host and captured workflow; they are not a promise about every MCP Apps host.
- No generalized domain model, retry layer, request coalescing, persistence format, or request-capable element is included.

## First review path

1. Run the browser setup and `pnpm check` from [Development](development.md).
2. Open `pnpm dev` for authored and live component exploration.
3. Run `pnpm dev:reader-workspace` to compare the supported Reader with the custom spatial composition.
4. Read [How the pieces fit together](guides/data-flow.md), then inspect one component subpath from request through view model and element.
5. Use the specifications and evidence record for contract review rather than reconstructing intent from Git history or the showcase.
