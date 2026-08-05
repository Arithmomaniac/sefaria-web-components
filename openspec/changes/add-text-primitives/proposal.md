## Why

The headless core renders nothing. These three custom elements are the first code in the project
that a browser displays, and every composite above them builds on these three.

Source review of eight third-party projects that render Sefaria text found that all of them build a
bilingual segment renderer for themselves. Four build a text column as well. The bilingual segment
is the single most repeated piece of work in the ecosystem.

The same review found three different layout mechanisms for placing Hebrew next to English. Sefaria
uses neither flex nor grid, which Playwright measurement confirmed. talmud.page uses table rows with
sibling cells. Stndr uses CSS grid with `unicode-bidi: plaintext`. One project switches from side by
side to stacked when the viewport is narrow.

## What Changes

- Add `<sefaria-text-segment>`. This element renders one segment in one language.
- Add `<sefaria-bilingual-segment>`. This element renders Hebrew and English together.
- Add `<sefaria-ref-label>`. This element renders a reference and its attribution.
- Add layout modes `auto`, `side-by-side`, and `stacked`. The `auto` mode selects a layout from the
  available width.
- Add a Hebrew-side option, so that a host can place Hebrew on the left or on the right.
- Extend the differential oracle with structural assertions and visual baselines.

## Capabilities

### New Capabilities

- `text-segment`: one segment rendered in one language, with direction, font, and diacritic options.
- `bilingual-segment`: Hebrew and English rendered together, with layout and side options.
- `ref-label`: a reference and its attribution rendered as one unit.

### Modified Capabilities

- `differential-oracle`: add structural assertions and visual baselines for rendered output. The
  current requirements cover character level comparison, which rendered components cannot use. State
  that these methods are weaker than the character level oracle.

## Impact

- **New package**: `packages/components`.
- **Depends on**: `text-transform`, `theming-tokens`, and `api-client` from the first change.
- **Blocks**: `source-card`, `citation-popup`, and every demonstration surface.
- **Open question**: whether accessibility requirements sit in each component specification or in
  one shared capability. This change must settle that question, because it adds the first
  components.
- **Risk**: the component API shapes are this project's design, not an observed Sefaria structure.
  They are the part that Sefaria review can most usefully correct.
