# Web Components

This specification defines the public Lit Web Components. The text primitives,
bounded composites, source card, and popup are Core scope. The connections panel
is Stretch 1.

## Platform contract

Each public element:

- uses an open shadow root
- emits no global style
- uses `--sefaria-*` custom properties
- accepts normalized data
- can delegate fetch-by-reference behavior to an injected client
- preserves available attribution for all rendered text
- supports keyboard operation
- reports loading, empty, configuration, and error states

Only `@sefaria/client` makes network requests. A component does not call an API
directly.

## Theming

Components contain no color values outside the token defaults.

The minimum token set is:

```css
--sefaria-surface
--sefaria-fg
--sefaria-fg-muted
--sefaria-border
--sefaria-accent
--sefaria-link
--sefaria-category-color
--sefaria-font-scale
--sefaria-font-hebrew
--sefaria-font-english
```

Default light and dark values come from Sefaria's mobile `ThemeWhite` and
`ThemeBlack` palettes.

| Source token     | Light     | Dark      |
| ---------------- | --------- | --------- |
| `mainBackground` | `#F9F9F7` | `#2d2d2b` |
| `mainText`       | `#000`    | `#fff`    |
| `sefariaBlue`    | `#18345D` | `#18345D` |

A host overrides tokens on a container. Custom properties inherit through each
shadow root.

The component inherits `color-scheme` from the host. It does not replace the
host selection with the operating-system preference.

Font size uses an `em` cascade. One scale value on the container changes all
nested components.

## `<sefaria-text-segment>`

### Contract

The element renders one segment in one language.

```html
<sefaria-text-segment
  lang="he"
  direction="rtl"
  vocalization="taamim_and_nikkud"
  footnotes="hidden"
  poetry
></sefaria-text-segment>
```

Set structured HTML through the `content` property. Do not infer direction from
`lang`.

`lang` is `he` or `en`.

The `poetry` state uses version `formatAsPoetry` data. The component does not
wrap a manually wrapped reference again.

### Events

- Inline-reference activation emits `ref-click`.
- Named-entity activation emits `entity-click`.
- `word-click` supports word selection.

These events are composed and bubble across the shadow boundary. Event details
contain the normalized identifier and source-segment reference.

### Required cases

- Markup with no visible text.
- Long text with no break opportunity.
- Hebrew with English, punctuation, and numbers.
- Manually wrapped references.
- Poetry and paragraph markers.
- Interactive and non-interactive footnotes.

Incorrect bidirectional behavior can look correct. Browser checks must include
the computed direction and ordering.

## `<sefaria-bilingual-segment>`

### Contract

The element aligns Hebrew and English for one segment.

```html
<sefaria-bilingual-segment
  layout="auto"
  primary="he"
></sefaria-bilingual-segment>
```

Allowed layouts are:

```text
auto | stacked | side-by-side | hebrew-only | english-only
```

`auto` is the default. It selects a side-by-side or stacked layout from the
available container width.

`primary` is `he` or `en`.

The layout does not assume equal text lengths. One language can be absent.

The implementation must preserve measured segment alignment from the Sefaria web
reader. It does not have to copy private application code.

### Required cases

- One language is missing.
- Source and translation lengths are different.
- The container is narrow or changes width.
- Each side has different wrapping.
- Each explicit layout.

## `<sefaria-ref-label>`

### Contract

```html
<sefaria-ref-label
  ref="Genesis 1:1"
  lang="en"
  form="human"
  link
></sefaria-ref-label>
```

`form` is `human` or `url`. `lang` is `he` or `en`.

If `link` is present, the element links to the canonical Sefaria URL. The
visible label uses the selected form.

### Required cases

- Hebrew labels that are not transliterations.
- Ranged and spanning references.
- Long commentary references.
- Works with no Hebrew title.

## `<sefaria-text-range>`

### Contract

The element renders a bounded list of segments.

```html
<sefaria-text-range
  ref="Genesis 1"
  content-lang="bilingual"
  layout="auto"
  show-segment-numbers
  selectable
></sefaria-text-range>
```

Inputs can include a chapter, a ranged reference, or a Torah portion.

`content-lang` is `he`, `en`, or `bilingual`.

The element creates one `<sefaria-bilingual-segment>` for each segment.

If `selectable` is present, segment activation emits `segment-select`. The event
contains the normalized segment reference.

The `highlightedRefs` property accepts an array of normalized segment
references. Each matching segment receives the highlighted state.

This component is bounded and does not use virtualization. Open-ended reader
columns are not in scope.

### Required cases

- `Genesis 1:31-2:3` and other spanning references.
- Ranges that cross section boundaries.
- Missing text in one language.
- Hebrew segment numbers.
- Torah aliyah markers.
- More than one highlighted segment.

## `<sefaria-source-card>`

### Contract

```html
<sefaria-source-card
  ref="Genesis 1:1"
  content-lang="bilingual"
  layout="auto"
></sefaria-source-card>
```

The card renders:

- the canonical reference
- one segment or a bounded `<sefaria-text-range>`
- source text and selected translations
- version attribution
- loading, empty, and error states

If the card receives only `ref`, it fetches through `@sefaria/client`.

If the card receives [`SourceCardData`](headless.md#source-card-data), it makes
no network request. The MCP App uses this data mode.

`content-lang` is `he`, `en`, or `bilingual`.

No attribute suppresses attribution.

### Required cases

- The reference does not exist.
- Only one language is available.
- A long segment is in a narrow card.
- A bounded range has more than one segment.
- Loading, empty, configuration, and network errors.

## `<sefaria-popup>`

### Contract

```html
<sefaria-popup
  ref="Genesis 1:1"
  content-lang="bilingual"
  interface-lang="en"
  open
></sefaria-popup>
```

The `anchor` property accepts an element or a selector.

`content-lang` is `he`, `en`, or `bilingual`. `interface-lang` is `he` or `en`.

The popup keeps these correct Linker behaviors:

- category color in the header through `--sefaria-category-color`
- `role="dialog"`
- focus entry
- focus restoration
- Escape closes the dialog
- `aria-controls` connects the trigger

It adds:

- `aria-modal`
- an accessible name
- a real close button
- a Tab and Shift+Tab focus cycle
- viewport-edge placement
- token-based light and dark themes
- shadow-root style isolation

The first version does not reproduce drag behavior. The current drag behavior
has no keyboard equivalent.

### Required cases

- Anchors near each viewport edge.
- Host pages with aggressive global CSS.
- Right-to-left host pages.
- Rapid activation of several citations.
- Escape, close button, Tab cycle, and focus restoration.

## `<sefaria-connections-panel>`

### Scope

This element is Stretch 1.

```html
<sefaria-connections-panel
  ref="Genesis 1:1"
  mode="summary"
></sefaria-connections-panel>
```

The only modes are `summary` and `commentary`.

The existing web panel has 26 modes. The mobile panel has seven modes. This
component does not claim parity with either client.

Commentary mode uses a fixed page size and an explicit control for more results.
One measured verse had 957 commentary links.

### Required cases

- Hundreds of connections.
- Category order.
- Collapsed and expanded categories.
- Ranged-reference counts.
- One commentary selection and Back in the MCP App.

## Accessibility

Core interaction works with a keyboard.

Required behavior includes:

- real buttons for close and footnote actions
- visible focus
- Tab and Shift+Tab cycling in modal popups
- Escape closes a popup
- focus entry and restoration
- a dialog name, role, and `aria-modal`
- composed events for shadow-root consumers
- direction from version data
- status and error announcements

Do not suppress Tab as a substitute for a focus cycle.

## Browser checks

Run Lit component checks in Chromium through Vitest Browser Mode and Playwright.

The checks include:

- browser structure
- accessible names and roles
- text direction and language
- focus and keyboard behavior
- responsive containers
- event composition
- token inheritance
- visual baselines only for useful evidence

A React tree and a Web Component are not directly comparable. Visual evidence is
weaker than character-level transform comparison.

Publish a numeric result for each component. The result must identify the
structural, accessibility, and visual evidence that it uses.

## Component completion

The completion requirements for a Core component are:

- its public contract is implemented
- each named edge case has a browser check
- the component works with keyboard input
- data mode makes no network request
- direction comes from version data
- attribution appears with text
- a clean checkout passes the complete repository check
