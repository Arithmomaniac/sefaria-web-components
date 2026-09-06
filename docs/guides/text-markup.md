> Created/edited by GitHub Copilot; pending human review.

# HTML inside Sefaria text

[Documentation](../README.md) | [Design](../design.md) | [Development](../development.md)

When a caller requests a Sefaria reference such as `Genesis 1:1`, the reference identifies a passage. It does not contain HTML tags. The returned version `text` value can be a string, `null`, or a recursively nested array of string and `null` leaves; a string leaf can contain HTML markup.

This guide explains the reviewed markup families that may occur in those string leaves and how this project handles them. It is an explanatory guide, not a new allowlist or a promise about every future upstream response. The exhaustive contract is the [text-processing specification](../specs/text-processing.md#markup-contract), and the source observations are in [Text markup evidence](../evidence.md#text-markup-evidence).

Sefaria already documents the core tag families, footnotes, commentary placements, overlays, links, and images in [Formatting within Sefaria texts](https://developers.sefaria.org/docs/text-formatting-beyond-the-segment-level). This guide is a companion explaining examples and this project's local handling, not a claim that those concepts are undocumented. See the dated [coverage record](../evidence.md#upstream-documentation-coverage).

Subsegment tags belong to a Version's text rather than an Index. Different editions of the same passage can therefore have different annotations.

## Start with the boundary

The client validates the response shape. A non-DOM component factory owns the text boundary: it sanitizes the API HTML, extracts structured footnotes, applies vocalization to text nodes, and creates render-ready view-model fields. The Web Component receives the view model and renders it; it does not parse an API payload or decide which tags are safe.

For the path from client to renderer, read [How the pieces fit together](data-flow.md). The [processing boundary](../specs/text-processing.md#processing-boundary) defines the exact responsibilities.

Do not copy a raw API string into `unsafeHTML`. A component may render HTML fragments only after the owning factory has applied the documented processing sequence.

## What a returned text value can contain

The following is an illustrative shape, not a claim that one response contains every family:

```json
{
  "ref": "Genesis 1:1",
  "versions": [
    {
      "text": "A string leaf can contain <b>HTML</b>."
    }
  ]
}
```

The deployed API also returns arrays for ranges and nested arrays for some spanning and non-spanning references. Follow the recursive `text` value rather than assuming that `isSpanning` describes its shape. See [Text response shape](../evidence.md#text-response-shape) and [Recursive text shape and side alignment](../evidence.md#recursive-text-shape-and-side-alignment).

The examples below are short authored illustrations unless they are marked as source-backed. They show the reviewed input shape and local handling; they do not imply that every reference contains every example.

## Ordinary inline tags

These tags carry ordinary text meaning and are retained without arbitrary attributes:

| Example inside a returned string | Meaning | Local handling |
| --- | --- | --- |
| `<b>bold</b>` | Bold text | Retain the semantic tag. |
| `<strong>strong emphasis</strong>` | Strong emphasis | Retain the semantic tag. |
| `<i>italic text</i>` | Ordinary italic text | Retain the semantic tag; ordinary `i` is not automatically an annotation. |
| `<em>emphasis</em>` | Emphasis | Retain the semantic tag. |
| `<big>larger text</big>` | Larger inline text | Retain the semantic tag. |
| `<small>smaller text</small>` | Smaller inline text | Retain the semantic tag. |
| `<u>underlined text</u>` | Underlined text | Retain the semantic tag. |
| `<sup>2</sup>` | Ordinary superscript | Retain it as inert text; do not make every superscript interactive. |
| `<sub>2</sub>` | Ordinary subscript | Retain it as inert text. |
| `line one<br>line two` | Text line structure | Retain one canonical `br`. |

`br` is text structure, including poetry line breaks. Web-only layout classes such as `poetry` and `indentWhenWrap` are not source text markup and are not retained merely because the Web reader creates them.

## Direction and Masorah spans

The reviewed span contract is deliberately narrow:

| Example | Meaning | Local handling |
| --- | --- | --- |
| `<span dir="rtl">שלום</span>` | Right-to-left text wrapper | Retain `span` and `dir="rtl"`. |
| `<span dir="ltr">English</span>` | Left-to-right text wrapper | Retain `span` and `dir="ltr"`. |
| `<span dir="auto">mixed</span>` | Browser-selected direction | Retain `span` and `dir="auto"`. |
| `<span class="mam-spi-pe">...</span>` | Masorah paragraph or section marker | Retain the exact class token and nesting. |
| `<span class="mam-spi-samekh">...</span>` | Masorah paragraph or section marker | Retain the exact class token and nesting. |
| `<span class="mam-kq">...</span>` | Masorah ketiv/qere family | Retain the exact class token and nesting. |
| `<span class="mam-kq-k">...</span>` | Masorah ketiv/qere family | Retain the exact class token and nesting. |
| `<span class="mam-kq-q">...</span>` | Masorah ketiv/qere family | Retain the exact class token and nesting. |
| `<span class="mam-kq-trivial">...</span>` | Masorah textual distinction | Retain the exact class token and nesting. |
| `<span dir="rtl" class="mam-kq">...</span>` | Direction plus a reviewed Masorah class | Retain the approved `dir` and exact class token. |

An arbitrary `mam-*` prefix is not an allowlist. Only the six listed class tokens are approved; a new class requires source evidence and a specification change.

An unclassified `span` loses unapproved attributes and is unwrapped when it has no remaining approved semantic class or direction. The sanitizer does not preserve arbitrary class tokens.

## Annotation-shaped `i` and `sup` elements

The same HTML tags are used for different Sefaria features. The feature is identified by the reviewed class or data attributes, not by the tag alone.

### Footnotes

A paired footnote is a marker followed by a body, with optional parsed whitespace between them:

```html
<sup class="footnote-marker">*</sup>
<i class="footnote"><b>When God began to create </b>Others ...</i>
```

This abbreviated example is source-backed by the deployed `Genesis 1:1` evidence. The sanitizer preserves the reviewed marker and body shape; `extractFootnotes` then returns a typed marker part and a source-ordered note. Nested ordinary markup inside the body, including another ordinary `i`, remains part of the note content.

The marker and body cases remain distinct:

| Input | Result |
| --- | --- |
| `<sup class="footnote-marker">*</sup><i class="footnote">note</i>` | One marker part and one note in source order. |
| `<sup class="footnote-marker">*</sup>` | A note with `content: null`; a missing body is not the same as an empty body. |
| `<sup class="footnote-marker">*</sup><i class="footnote"></i>` | A note with `content: ""`; the body exists but is empty. |
| `<i class="footnote">orphan body</i>` | Ordinary italic content with the `footnote` class removed; it is not invented into a note. |
| `<sup class="source footnote-marker">†</sup> ...` | Only the reviewed `footnote-marker` token matters; unrelated class tokens do not become trusted metadata. |

Several notes retain source order even when marker text repeats:

```html
first<sup class="footnote-marker">*</sup><i class="footnote">one</i> second<sup
  class="footnote-marker"
  >*</sup
><i class="footnote">two</i>
```

The extractor assigns stable logical indexes within that extraction. It does not assign DOM IDs; component view-model factories own accessible IDs because only they know the segment, language side, and render scope.

### Commentary placements and rendered markers

An inline commentary placement is an empty `i` carrying reviewed metadata:

```html
<i data-commentator="Magen Avraham" data-order="3" data-label="ג"></i>
```

Sefaria's official formatting explanation describes this marker as part of a linked commentary placement: the corresponding inline-reference metadata supplies the link, `data-commentator` matches the commentary's `collective_title`, and `data-label` overrides the display label. That is different from embedded footnote content. The sanitizer preserves `data-commentator`, `data-order`, `data-label`, and an approved `dir` value, but the element remains inert. This package does not perform the metadata matching, choose a commentary, convert the placement into a marker, or encode Hebrew numerals.

`sup.itag` is a rendered commentary marker produced after Sefaria Web selects and formats a placement:

```html
<sup class="itag">ג</sup>
```

It is tolerated as inert text. No source commentary metadata is inferred from it.

`sup.endFootnote` is a standalone annotation marker:

```html
<sup class="endFootnote">†</sup>
```

It remains inert unless a later component defines a presentation. It is not a footnote body by itself.

### Structural overlays

An overlay transition is an empty `i`:

```html
<i data-overlay="Vilna Pages" data-value="2a"></i>
```

The sanitizer preserves `data-overlay`, `data-value`, and an approved `dir`. Overlay names are data rather than a closed local enumeration; reviewed deployed evidence includes `Vilna Pages`, `Venice Columns`, and `Venice Pages`. The transform keeps the marker inert and does not render a transition label or expose an overlay-extraction API.

## Links and images

### Reference links

A reference link is identified by `data-ref`, not by `class="refLink"` alone:

```html
<a
  class="refLink"
  data-ref="Genesis 1:2"
  data-ven="Example English edition"
  data-vhe="Example Hebrew edition"
  data-scroll-link="true"
  dir="ltr"
  href="/Genesis.1.2"
  >the next verse</a
>
```

When reference links are enabled, the sanitizer retains only the reviewed semantic attributes: `data-ref`, optional `class="refLink"`, `href`, `data-range`, `data-ven`, `data-vhe`, `data-scroll-link`, and approved `dir`. The URL must satisfy the exact Sefaria-origin policy. A missing `data-ref` or invalid URL unwraps the anchor to its children.

| Attribute | Purpose |
| --- | --- |
| `data-ref` | The target Sefaria reference; it is the semantic discriminator |
| `href` | The browser navigation URL, subject to the local URL policy |
| `data-ven`, `data-vhe` | English and Hebrew version-selection metadata, not reference labels; the edition names above are illustrative |
| `data-range` | Upstream range metadata, retained without local interpretation |
| `data-scroll-link` | Sefaria's same-book scroll-navigation metadata |
| `class="refLink"`, `dir` | Reviewed link classification and approved inline direction |

Preserving metadata does not implement Sefaria's reader navigation in a Web Component. The transform does not select editions or fetch a linked passage.

### Named-entity links

A named entity requires `data-slug`:

```html
<a
  class="namedEntityLink"
  data-slug="entity-slug"
  data-range="start-end"
  href="/topics/entity-slug"
  >an entity</a
>
```

`data-range` and an approved `href` are optional after the required slug. When named entities are disabled, incomplete, or unsafe, the anchor is unwrapped to its children.

### Category and generic links

Sefaria can generate category links such as:

```html
<a class="categoryLink" data-category-path="Tanakh" data-range="Genesis 1"
  >Tanakh</a
>
```

Category anchors are source-confirmed but have no Core component owner, so the local sanitizer always unwraps them. Every other anchor, including an unrelated safe HTTPS link, is also unwrapped. The reusable component boundary does not provide generic outbound navigation from embedded API text.

### Images

The persisted Sefaria text contract permits:

```html
<img src="/static/example.png" alt="descriptive text" />
```

Image markup is source-confirmed but lacks a representative live Core fixture and a component-owned image-loading or source-origin policy. The local sanitizer removes the image and replaces it with escaped `alt` text; an image without `alt` produces no output. Image rendering is deferred, not silently enabled.

Sefaria's official documentation includes an image example from Mishnat Eretz Yisrael on Pirkei Avot 1.1.42. The absence of an image in the pinned reviewed Core fixtures is therefore a local evidence and ownership boundary, not a claim that upstream text never contains images.

## Unsupported and active markup

Unknown non-active inline elements are unwrapped while preserving their children:

```html
<mark data-unknown="discard-me">visible text</mark>
```

Block wrappers such as `p`, `div`, lists, headings, tables, and blockquotes are not approved text-body markup. They are unwrapped, and one deterministic separator is inserted at block boundaries so adjacent words do not concatenate:

```html
<p>first</p>
<div>second</div>
```

Active elements and their entire descendants are removed:

```html
<script>
  alert("not text");
</script>
<style>
  .secret {
    display: none;
  }
</style>
<template><b>not text</b></template>
<iframe src="https://example.invalid"></iframe>
<object data="https://example.invalid"></object>
<embed src="https://example.invalid" />
<svg><text>not text</text></svg>
<math><mi>not text</mi></math>
```

Active subtrees are discarded, not unwrapped. Attribute removal is a different operation: event attributes such as `onload`, inline `style`, unknown `data-*` attributes, `data-target-module`, and unapproved classes are discarded from otherwise retained tags. A link with a dangerous URL is unwrapped to its text; it does not gain permission to navigate.

## Parsing, entities, and serialization

The transform parses an HTML fragment in HTML mode. Entity references become text during parsing and are escaped again during canonical serialization:

```html
Tom &amp; Jerry
```

Malformed markup follows standards-parser recovery. The serializer does not return the original source string; it escapes text and attribute values, sorts retained attributes, and emits deterministic markup. A malformed attribute is not guessed into a trusted value. The evidence includes a deployed malformed commentary attribute and a tolerated malformed closing form such as `</i >`; the local behavior is parser recovery, not an invented correction.

`applyVocalizationToHtml` uses the same parser and serializer but does not sanitize. It must receive an already-sanitized fragment and changes text nodes only, so Unicode processing cannot corrupt tag names or attribute values.

## Return formats can remove markup before the factory sees it

The response format is part of the information available to a component:

| Upstream format or path | Information that can be lost |
| --- | --- |
| `return_format=text_only` | Footnote content is removed, not merely stripped of tags; other inline distinctions such as small-cap markup can also disappear. |
| Mobile `stripItags` | Footnote pairs and several annotation families are removed before rendering. |
| v3 `strip_only_footnotes` | The name understates the behavior: the broader stripping path also removes commentary and overlay families and rendered markers. |

An empty `notes` array after one of these formats is not proof that the source had no notes. The transform cannot detect or reconstruct content that was removed before it received the string. The host needs request context to explain that loss; use only states supported by the component, not an invented universal “unavailable” state. See [Return-format information loss](../evidence.md#return-format-information-loss).

## The processing path

For a validated API string, the owning pure factory follows this order:

1. `sanitize` the API HTML with options that may narrow approved features but cannot widen the allowlist.
2. `extractFootnotes` from the sanitized fragment.
3. Apply `applyVocalizationToHtml` to HTML body parts and non-null note content, and `applyVocalization` to plain marker text.
4. Add component-specific rendering fields such as accessible marker and note IDs.

The element receives the resulting view model. It does not receive a reference, raw JSON, client, base URL, `fetch`, or raw API HTML. For ownership and current/planned boundaries, see [Design](../design.md#ownership), [Development](../development.md#implemented-on-this-baseline), and the [component specification](../specs/components.md#element-contract).

## Read the exhaustive sources

- [Text-processing specification: markup contract](../specs/text-processing.md#markup-contract)
- [Text-processing specification: URL policy](../specs/text-processing.md#url-policy)
- [Text-processing specification: footnotes](../specs/text-processing.md#footnotes)
- [Text-processing specification: processing boundary](../specs/text-processing.md#processing-boundary)
- [Evidence: persisted text contract and markup taxonomy](../evidence.md#persisted-text-contract)
- [Evidence: footnote markup](../evidence.md#footnote-markup)
- [Evidence: commentary placement iTags](../evidence.md#commentary-placement-itags)
- [Evidence: structural overlays](../evidence.md#structural-overlays)
- [Evidence: API-generated links](../evidence.md#api-generated-links)
- [Sefaria: formatting within texts](https://developers.sefaria.org/docs/text-formatting-beyond-the-segment-level)
