# Text-processing specification [Planned]

## Status

This specification defines the planned `@sefaria/text-transform` contract.

The package remains in the architecture because sanitization, vocalization, and footnote handling are pure cross-component operations.

## Responsibility

`@sefaria/text-transform` owns deterministic text changes. It has no network, DOM rendering, API transport, component view-model, or host responsibility.

Component pure factories call these operations before unsafe or presentation-specific text enters a view model. Elements render the resulting view model without reparsing an API payload.

## Common contract

Every public operation must:

- be deterministic
- read no global state
- make no request
- preserve text that the selected operation does not target
- return an explicit result or throw a standard exception for programmer misuse
- include malformed, hostile, and adversarial Unicode cases

The package can use a parser internally. Its public operations remain independent of browser DOM globals.

## Vocalization

### Planned public contract

```ts
type VocalizationMode = "taamim_and_nikkud" | "nikkud" | "none";

applyVocalization(
  text: string,
  mode: VocalizationMode,
  options?: { paseq?: "always" | "after-space" },
): string;
```

Each mode is a preset over separate cantillation and vowel controls. Internal code keeps those controls separate.

The function accepts plain text or parsed text-node content. It must not run over raw markup because Unicode changes can corrupt attributes.

### PASEQ

Sefaria Web and the deployed Linker remove U+05C0 PASEQ in all positions. Sefaria Mobile removes it only after whitespace and removes that whitespace.

The package exposes both behaviors. The planned default remains `after-space` until a later reviewed decision selects another canonical behavior.

Compatibility results must identify the selected behavior and show differing Unicode code points.

### Required cases

- empty text
- text without Hebrew
- each vocalization mode
- PASEQ with and without preceding whitespace
- combining marks in an unexpected order
- text that is already unpointed
- Hebrew mixed with English, punctuation, and numbers

## Sanitization

### Planned public contract

```ts
sanitize(
  html: string,
  options?: {
    allowFootnotes?: boolean;
    allowRefLinks?: boolean;
    allowNamedEntities?: boolean;
  },
): string;
```

Sanitization uses an explicit allowlist. An option can remove an allowed feature, but it cannot expand the base trust boundary.

### Element allowlist

The base allowlist contains:

`b`, `strong`, `i`, `em`, `big`, `small`, `sup`, `br`, `span`, and `a`.

The sanitizer permits `class` only for reviewed Sefaria markup classes. It permits only required `data-*` attributes.

The sanitizer removes:

- `style`
- every `on*` event attribute
- scripts and active content
- unapproved elements and attributes
- links outside approved Sefaria origins
- URL forms that can execute script or active content

### Required cases

- unbalanced tags
- nested text markup
- entity-encoded Hebrew
- empty content spans
- poetry spans
- paragraph-marker spans
- dangerous URLs
- event handlers
- inline styles
- malformed attributes

Sanitization must preserve allowed text and structural markup. Dangerous attributes must not survive.

## Footnotes

### Planned public contract

```ts
extractFootnotes(html: string): {
  body: string;
  notes: Array<{
    id: string;
    marker: string;
    content: string;
  }>;
};
```

`body` keeps footnote markers and removes note bodies. `notes` contains the separated note content in source order.

The rendering element can select one presentation:

```text
hidden | inline | end | none
```

The view model keeps the extracted body, notes, and missing-note state for every presentation.

`hidden` keeps accessible note data without visible note bodies. `none` suppresses visible note presentation without deleting note data.

### Information loss

`return_format=text_only` removes footnote content, not only tags. The mobile `stripItags` path also removes note bodies before rendering.

A component factory cannot reconstruct removed notes. If requested note content is absent, the factory returns its component-specific partial or empty state.

The factory must not return an empty note list as proof that no notes exist.

### Required cases

- nested markup inside a note
- several notes in one segment
- letter and non-numeric markers
- the `endFootnote` variant
- notes on one side of a bilingual pair
- missing note bodies
- duplicate source identifiers

Marker order must remain stable. Generated identifiers must be unique in one rendered range.

## Processing boundary

API schema validation and HTML sanitization are different controls. `@sefaria/client` validates unknown JSON structure. `@sefaria/text-transform` makes approved HTML safe for rendering.

A component pure factory owns the processing sequence for its payload. Unsafe HTML must pass sanitization before the view model reaches an element.

The element must not repeat sanitization, vocalization, or footnote extraction during rendering.

## Compatibility evidence

Compatibility tests compare retained pure behavior with pinned Sefaria implementations or fixed deployed fixtures.

A text difference report includes:

- the input reference or fixture name
- expected and actual text
- the first different index
- nearby Unicode code points
- the selected operation and options

Known intentional differences remain separate from passes and failures.

## Completion criteria

`@sefaria/text-transform` is complete for Core when:

- the package implements vocalization, sanitization, and footnote operations
- every named case has a deterministic test
- sanitization uses an explicit allowlist
- unsafe markup does not reach component view models
- Unicode difference reports show code points
- no operation imports a client, component element, or browser DOM global
- a clean checkout passes `pnpm check`
