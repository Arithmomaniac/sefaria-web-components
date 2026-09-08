> Created/edited by GitHub Copilot with human review/feedback by avilevin.

# Documentation

Sefaria supplies texts and their metadata. This project supplies a small client, pure text processing, and reusable components for displaying that data. Start with the task you want to accomplish; you do not need to read the specifications first.

The public [interactive showcase](https://arithmomaniac.github.io/sefaria-web-components/) walks through the repository as a Reveal.js presentation and keeps the standalone browser demonstrations available at linked subpaths.

Sefaria reviewers and incoming maintainers should begin with the [source handoff](handoff.md). Developers can run the consolidated component explorer with `pnpm dev`.

## Use the components

1. [Render text](guides/render-text.md): run a demo, choose a component, and put a source card in a browser app.
2. [How the pieces fit together](guides/data-flow.md): understand the client, factories, view models, and elements, including the already-fetched-data path.
3. [Linker demonstration](linker-demo.md): embed citation detection and request-free popups or run the same script as a bookmarklet.
4. [MCP App demonstration](mcp-app-demo.md): run the stateful reader in VS Code Copilot Chat and inspect same-App connection navigation, retained breadcrumbs, and explicit chat export.
5. [Text markup, with examples](guides/text-markup.md): recognize footnotes, commentary markers, Masorah spans, links, and other HTML inside a passage.
6. [Intentional differences](guides/differences.md): understand which Sefaria behaviors we preserve and which we deliberately change.
7. [Reader navigation, illustrated](guides/reader-navigation.md): compare the multi-pane and supported-controller website demos, Sefaria navigation ownership, and the current DOM-free reader session, controller, controlled surface, and integrated MCP consumer.

**Current** means available on the documented repository baseline. **Planned** means an intended contract that is not yet delivered there. **Observed** describes evidence from a named source or capture, not a universal promise about every Sefaria text.

## Sefaria concepts

The guides use Sefaria's vocabulary rather than defining another reference system:

| Term | Meaning here | Upstream introduction |
| --- | --- | --- |
| Reference, or `ref`/`tref` | A citation identifying a book, section, segment, or range; it is not the text or an HTML element | [Text references](https://developers.sefaria.org/docs/text-references) |
| Index | Metadata and the structural description of a work | [Index and versions](https://developers.sefaria.org/docs/index-and-versions) |
| Version or edition | A particular source text or translation of a work | [Index and versions](https://developers.sefaria.org/docs/index-and-versions) |
| Segment | A leaf text unit within the work's structure | [Structure of a book](https://developers.sefaria.org/docs/the-structure-of-a-text-on-sefaria) |
| Text markup | HTML inside a returned text string, not syntax in the reference | [Sefaria formatting](https://developers.sefaria.org/docs/text-formatting-beyond-the-segment-level) and [our illustrated guide](guides/text-markup.md) |

Sefaria's [API introduction](https://developers.sefaria.org/reference/getting-started) explains its broader API. Our client covers the eight GET and POST operations in the [client specification](specs/client.md), with reviewed schema corrections. Upstream documentation is useful context; it does not override this project's intentional differences.

## Contribute and investigate

| Goal | Document |
| --- | --- |
| Set up the repository; distinguish changed plans from unfinished work | [Development](development.md) |
| Understand stable ownership and dependency boundaries | [Design](design.md) |
| Find the source, fixture, or historical decision behind a behavior | [Evidence](evidence.md) |
| Review a change at the right depth | [Review](review.md) |
| Use text transforms without components | [`@sefaria/text-transform`](../packages/text-transform/README.md) |
| Use the validated transport package | [`@sefaria/client`](../packages/client/README.md) |
| Choose component and Reader entry points | [`@sefaria/components`](../packages/components/README.md) |

## Detailed reference

Guides explain use. Specifications own intended behavior and acceptance rules. Generated declarations own field-level transport definitions; component subpaths define rendering types.

| Reference | Scope |
| --- | --- |
| [Client specification](specs/client.md) | Pinned OpenAPI, corrections, eight GET and POST operations, validation, and failure contracts |
| [Text-processing specification](specs/text-processing.md) | Exact sanitizer allowlists, vocalization, and footnote rules |
| [Component specification](specs/components.md) | Requests, view models, factories, elements, connections, popup behavior, and composition |
| [Integration specification](specs/integrations.md) | Current connections-reader, Linker, and MCP boundaries, including host acceptance |

The [archive index](archive/README.md) points to the exact Git revision containing the pre-rewrite documents and demo captures. It is not a second checked-in set of current instructions.
