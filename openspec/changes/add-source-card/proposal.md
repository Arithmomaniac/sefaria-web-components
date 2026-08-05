## Why

This is the tag that the public hackathon description names: `<sefaria-source-card ref="Genesis 1:1">`.
One tag, no framework, no server, and no Hebrew typography knowledge needed. It is the shortest
statement of what this project delivers.

The card is also the first element that a caller uses without reading any other documentation. Every
piece beneath it exists to make this one tag correct.

Attribution is the reason the card is a composite rather than a wrapper. Source review of eight
third-party projects found that one attributes each quotation. That project also filters out
versions whose license is not clearly redistributable. Every other project shows a "Powered by
Sefaria" logo and no per-quotation credit. Attribution that stays attached to the text is the least
contested claim in this project.

## What Changes

- Add `<sefaria-source-card>`. Give it a reference, and it renders the text with attribution.
- Make attribution non-optional. A caller cannot remove it through an attribute or through CSS.
- Accept data through an attribute for callers that already hold the text, so that the card works
  without a network request.
- Report license information for the version that the card renders.

## Capabilities

### New Capabilities

- `source-card`: a self-contained bilingual card with non-optional attribution, usable with a
  reference or with supplied data.

### Modified Capabilities

None.

## Impact

- **Package**: `packages/components`.
- **Depends on**: `bilingual-segment` and `ref-label` from the primitives change, and `api-client`
  and `theming-tokens` from the first change.
- **Blocks**: the Linker demonstration and the MCP App demonstration. Both render this card.
- **Open question**: what the card does when the version license does not permit redistribution.
  One third-party project already solves this by excluding those versions.
- **Risk**: the card has no character level oracle. Correctness rests on the layers beneath it,
  which do have one.
