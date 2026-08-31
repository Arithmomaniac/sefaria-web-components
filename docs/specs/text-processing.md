> Created/edited by GitHub Copilot; pending human review.

# Text-processing specification

## Status

This specification defines the current `@sefaria/text-transform` contract.

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

The package can use a standards parser internally. Its public operations remain independent of browser DOM globals.

## Markup source classes

Markup is classified before it is allowed or removed. A tag accepted by one Sefaria subsystem is not automatically safe or meaningful in this package.

| Source class | Meaning | Contract treatment |
| --- | --- | --- |
| Persisted text markup | Tags and attributes accepted by Sefaria's text-record contract | Candidate input that still requires a local semantic and security decision |
| API-generated markup | Markup added by a response adapter, such as wrapped entities | Recognized when a Core API return format can produce it |
| Web-generated rendering markup | Markup created after the API response for one Web interaction or layout | Not accepted from untrusted API HTML unless this specification lists it as a tolerated inert form |
| Legacy or out-of-contract markup | Markup that can survive old imports or direct writes despite not belonging to the persisted contract | Deterministically removed or unwrapped without becoming an approved contract |
| Hostile or active content | Executable content, event handlers, dangerous URLs, embedded documents, or equivalent attack forms | Removed under a rule that no option can widen |

## Markup contract

### Ordinary inline text

The sanitizer preserves these attribute-free semantic tags:

`b`, `strong`, `i`, `em`, `u`, `big`, `small`, `sup`, and `sub`.

A content-bearing ordinary `i` is italic text. It is not an annotation merely because other Sefaria features also use `i`.

An ordinary `sup` remains inert text. The component must not make every superscript interactive.

### Line breaks

The sanitizer preserves `br` and emits one canonical form.

The text API uses `br` for line structure, including poetry versions. Web-generated poetry layout classes are not API text markup and are not allowed merely because the Web reader creates them later.

### Direction wrappers

The sanitizer preserves `span[dir]` only when `dir` is `ltr`, `rtl`, or `auto`.

An unclassified `span` loses its attributes but preserves its children. A `span` with no remaining semantic attribute or approved class is unwrapped.

### Masorah markup

The sanitizer preserves these exact class tokens and their nesting:

- `mam-spi-pe`
- `mam-spi-samekh`
- `mam-kq`
- `mam-kq-k`
- `mam-kq-q`
- `mam-kq-trivial`

The `mam-spi-*` forms mark paragraph or section structure. The `mam-kq*` forms mark ketiv/qere or related textual distinctions.

The sanitizer does not accept an arbitrary `mam-*` prefix. A new class requires source evidence and a specification change.

This package preserves the semantic markers but does not style or interpret them. Component work owns presentation.

### Footnote markup

A footnote pair is:

```html
<sup class="footnote-marker">marker</sup><i class="footnote">body</i>
```

The class can appear among other source class tokens, but only the reviewed token survives. Parsed whitespace can occur between the marker and body.

An `i.footnote` can contain ordinary nested markup, including another ordinary `i`.

`sup.endFootnote` is a recognized standalone marker. It remains inert unless a later component defines a presentation.

### Inline commentary markup

Sefaria stores commentary placement metadata in an empty `i`:

```html
<i data-commentator="Magen Avraham" data-order="3" data-label="ג"></i>
```

`data-commentator` identifies the commentary. `data-label`, when present, is the displayed label used by Sefaria Web. Otherwise `data-order` supplies the order and possible label.

The sanitizer preserves these attributes:

- `data-commentator`
- `data-order`
- `data-label`
- `dir` when its value is approved

The element remains inert. This package does not select a commentary, convert the element to a marker, encode Hebrew numerals, or expose a commentary-extraction API without a concrete component consumer.

Malformed source attributes follow standards-parser recovery. The sanitizer does not guess a value that the parser could not recover.

### Structural overlay markup

Sefaria stores page and column transitions in an empty `i`:

```html
<i data-overlay="Vilna Pages" data-value="2a"></i>
```

The sanitizer preserves:

- `data-overlay`
- `data-value`
- `dir` when its value is approved

Overlay names are data and are not a closed enumeration. Source and deployed examples include `Vilna Pages`, `Venice Columns`, and `Venice Pages`; a safe unknown value remains inert rather than being discarded.

This package does not render transition labels or expose an overlay-extraction API without a concrete component consumer.

### Rendered annotation markers

`sup.itag` is produced by Sefaria Web after it selects and formats a commentary placement. It is tolerated as inert input because Sefaria's stripping behavior recognizes it.

`sup.endFootnote` and `sup.itag` preserve their text only. No source metadata is inferred from them.

### Reference links

A reference link is an `a` with `data-ref`. It can also contain:

- `class="refLink"`
- `href`
- `data-range`
- `data-ven`
- `data-vhe`
- `data-scroll-link`
- approved `dir`

The semantic discriminator is `data-ref`, not the class alone.

When reference links are enabled, the sanitizer retains only reviewed attributes and an approved URL. A missing `data-ref` or invalid URL unwraps the anchor to its children.

### Named-entity links

A named-entity link is:

```html
<a
  class="namedEntityLink"
  data-slug="entity-slug"
  data-range="start-end"
  href="/topics/entity-slug"
  >text</a
>
```

`data-slug` is required. `data-range` and an approved `href` are optional.

When named entities are disabled, missing their required slug, or carrying an invalid URL, the sanitizer unwraps the anchor to its children.

### Category and generic links

Sefaria can generate `a.categoryLink[data-category-path][data-range]`, but no Core component owns category navigation. Category anchors are always unwrapped to their children.

Every other anchor, including an unrelated safe HTTPS anchor, is also unwrapped. The Core sanitizer does not provide generic outbound navigation on a third-party page.

### Images

Sefaria's persisted text contract permits `img[src][alt]`, but the selected Core evidence has no representative live image fixture and no component owns image loading.

The sanitizer removes every image and replaces it with escaped `alt` text. An image without `alt` produces no output.

Image rendering and source-origin policy require a later specification change supported by a concrete consumer and fixture.

### Unsupported wrappers

An unknown non-active inline element is unwrapped and its children are preserved.

Block elements are not approved text-body markup. `p`, `div`, lists, headings, tables, blockquotes, and other non-active block wrappers are unwrapped. One deterministic separator is inserted at block boundaries so adjacent text does not concatenate.

Attributes on unsupported wrappers are discarded.

### Active content

The sanitizer removes an active element and all of its descendants. This includes:

- `script`
- `style`
- `template`
- `iframe`
- `object`
- `embed`
- SVG or MathML content
- equivalent embedded or executable surfaces

The sanitizer never unwraps an active subtree because its text can itself contain executable source or misleading fallback content.

### Attribute policy

The sanitizer removes:

- every `on*` event attribute, regardless of case or encoding
- every inline `style`
- unknown class tokens
- unknown `data-*` attributes
- `data-target-module`
- Linker debugging classes
- attributes not assigned to the recognized semantic family

An option can remove an approved feature. No option can preserve an otherwise unapproved attribute, class, tag, origin, or URL scheme.

## Vocalization

### Public contract

```ts
type VocalizationMode = "taamim_and_nikkud" | "nikkud" | "none";

applyVocalization(
  text: string,
  mode: VocalizationMode,
  options?: { paseq?: "always" | "after-space" },
): string;

applyVocalizationToHtml(
  html: string,
  mode: VocalizationMode,
  options?: { paseq?: "always" | "after-space" },
): string;
```

Each mode is a preset over separate cantillation and vowel controls. Internal code keeps those controls separate.

The function accepts plain text or parsed text-node content. It must not run over raw markup because Unicode changes can corrupt attributes.

`applyVocalizationToHtml` parses an already-sanitized HTML fragment, applies the same vocalization operation only to text nodes, and deterministically serializes the result. It does not sanitize input or widen the accepted markup contract. Component factories use this operation rather than implementing another HTML parser.

### Modes

| Mode | Cantillation | Vowel marks | PASEQ |
| --- | --- | --- | --- |
| `taamim_and_nikkud` | Preserve | Preserve | Preserve |
| `nikkud` | Remove | Preserve | Apply the selected removal policy |
| `none` | Remove | Remove | Apply the selected removal policy |

`none` also removes U+05C3 SOF PASUQ, matching Sefaria's full vocalization-removal expressions. `nikkud` preserves it.

Reordered combining marks are handled by code-point class. The function does not normalize caller text before or after transformation.

Unsupported runtime mode or PASEQ values throw `TypeError`. Valid options have no conflicting combination.

### PASEQ

Sefaria Web and the deployed Linker remove U+05C0 PASEQ wherever their cantillation-removal path sees it. Sefaria Mobile removes PASEQ only after whitespace and removes that preceding whitespace.

`paseq: "always"` removes every U+05C0 while preserving surrounding whitespace.

`paseq: "after-space"` removes a PASEQ only when immediately preceded by whitespace and removes that preceding whitespace. A PASEQ without preceding whitespace remains.

The default is `after-space`.

Compatibility results must identify the selected behavior and show differing Unicode code points.

### Required cases

- empty text
- text without Hebrew
- each vocalization mode
- both PASEQ policies with and without preceding whitespace
- PASEQ separated from whitespace by a removable source code point
- SOF PASUQ preserved by `nikkud` and removed by `none`
- combining marks in an unexpected order
- text that is already unpointed
- Hebrew mixed with English, punctuation, and numbers
- invalid runtime option values

## Sanitization

### Public contract

```ts
interface SanitizeOptions {
  allowFootnotes?: boolean;
  allowInlineAnnotations?: boolean;
  allowNamedEntities?: boolean;
  allowRefLinks?: boolean;
}

sanitize(html: string, options?: SanitizeOptions): string;
```

Every option defaults to `true`.

`allowFootnotes: false` removes recognized footnote markers and bodies while preserving surrounding text.

`allowInlineAnnotations: false` removes commentary and structural metadata iTags and tolerated `sup.itag` and `sup.endFootnote` markers.

`allowRefLinks: false` and `allowNamedEntities: false` unwrap those anchors to their children.

### URL policy

The sanitizer permits:

- normal relative and root-relative input paths, serialized as canonical absolute `https://www.sefaria.org/...` URLs
- HTTPS URLs whose hostname is exactly `sefaria.org`, `www.sefaria.org`, `sefaria.org.il`, or `www.sefaria.org.il`

The sanitizer rejects:

- protocol-relative URLs
- URLs with credentials
- active schemes such as `javascript:` or `data:`
- encoded or mixed-case forms of active schemes
- malformed URLs
- unrelated absolute origins
- suffix-confusion hosts such as `evilsefaria.org`

An invalid URL unwraps the anchor. Link text and approved nested markup remain.

### Required cases

- every tag and semantic subtype in the markup contract
- every approved class and data attribute
- unbalanced and malformed tags and attributes
- nested text and footnote markup
- entity-encoded text and URLs
- empty spans
- line breaks and Masorah paragraph markers
- dangerous and protocol-relative URLs
- event handlers and inline styles
- active subtrees
- unknown classes and data attributes
- disabled feature options
- deeply nested hostile markup
- deterministic attribute order and serialization

Sanitization must preserve allowed text and structural markup. Dangerous content must not survive.

## Footnotes

### Public contract

```ts
interface ExtractedFootnote {
  readonly index: number;
  readonly markerText: string;
  readonly content: string | null;
}

type FootnoteBodyPart =
  | {
      readonly kind: "html";
      readonly html: string;
    }
  | {
      readonly kind: "footnote-marker";
      readonly noteIndex: number;
      readonly markerText: string;
    };

interface ExtractFootnotesResult {
  readonly body: readonly FootnoteBodyPart[];
  readonly notes: readonly ExtractedFootnote[];
}

extractFootnotes(html: string): ExtractFootnotesResult;
```

The extractor uses parsed nodes rather than a footnote regex.

A paired marker and body produces one marker part and one note in source order.

A marker without a following body produces a note whose `content` is `null`. This is different from a present but empty body, whose content is `""`.

An `i.footnote` without a preceding marker is preserved as ordinary italic content with the `footnote` class removed.

Nested ordinary markup inside a note remains serialized inside `content`.

Duplicate marker text is allowed. Logical `index` values are unique and stable within one extraction.

`markerText` is decoded plain text and must be rendered through a text-node API. `html` body parts and non-null note `content` are escaped HTML strings.

The extractor returns no DOM IDs. A transform has no segment, language-side, range, or render-instance scope. Component view-model factories own accessible marker and note IDs.

`body` is structured so a request-free element can render a real marker button without reparsing an HTML string.

Closing and reopening ordinary ancestor elements around markers can expand output. The extractor throws `RangeError` before projected body HTML plus note HTML exceeds eight times the input length or 64 KiB, whichever is larger.

### Information loss

`return_format=text_only` removes footnote content, not only tags. The mobile `stripItags` path and the v3 `strip_only_footnotes` return format also remove annotation families before rendering.

An extractor cannot reconstruct removed notes. An empty `notes` array is not proof that the source had no notes.

Request and component context owns the partial or unavailable state caused by an upstream return format.

### Required cases

- nested markup inside a note
- several notes in one segment
- letter and non-numeric markers
- `endFootnote`
- marker classes with extra source tokens
- present but empty bodies
- missing bodies
- orphan bodies
- duplicate marker text
- malformed closing syntax and parser recovery
- stable source order
- coalesced HTML body parts
- plain-text marker handling
- bounded nested-marker expansion
- absence of rendering IDs

## Processing boundary

API schema validation and HTML sanitization are different controls. `@sefaria/client` validates unknown JSON structure. `@sefaria/text-transform` makes approved HTML safe for rendering.

A component pure factory owns this sequence:

1. Sanitize the API HTML with the selected narrowing options.
2. Extract structured footnotes from the sanitized HTML.
3. Apply `applyVocalizationToHtml` to HTML body parts and non-null note content, and apply `applyVocalization` to plain marker text.
4. Assign component-specific rendering fields, including accessible IDs.

`extractFootnotes` is deterministic on any parsed input, but it does not independently claim that unsanitized input is safe.

Raw payload HTML must not be stored in a component view model for later interpretation. A view model can contain sanitized and transformed HTML fragments plus typed marker and note fields.

The element must not repeat sanitization, vocalization, footnote extraction, or API parsing during rendering.

## Compatibility evidence

Compatibility tests compare retained pure behavior with pinned Sefaria implementations or fixed deployed fixtures.

A text difference report includes:

- the input reference or fixture name
- expected and actual text
- the first different index
- nearby Unicode code points
- the selected operation and options

Known intentional differences remain separate from passes and failures.

Broad corpus comparison and compatibility publication belong to #14. This package uses only small source-backed characterization fixtures and labeled synthetic hostile inputs.

## Completion criteria

`@sefaria/text-transform` is complete for Core when:

- the specification classifies every approved, unwrapped, removed, and deferred markup family
- evidence identifies whether each family is persisted, API-generated, Web-generated, legacy, live-confirmed, source-only, or synthetic
- the package implements vocalization, sanitization, and structured footnote operations
- every named case has a deterministic test traceable to the markup contract
- sanitization uses an explicit allowlist and exact URL policy
- unsafe markup does not reach component view models
- rendering IDs remain outside transform output
- no operation imports a client, component element, host API, or browser DOM global
- a clean checkout passes `pnpm check`
