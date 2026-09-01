> Created/edited by GitHub Copilot; pending human review.

# `@sefaria/text-transform`

`@sefaria/text-transform` provides deterministic, DOM-free operations for Sefaria text HTML and Hebrew vocalization.

## Processing order

Component pure factories process text in this order:

1. Call `sanitize` on API HTML.
2. Call `extractFootnotes` on the sanitized result.
3. Call `applyVocalizationToHtml` on HTML body parts and note content, and `applyVocalization` on plain marker text.
4. Add component rendering state such as accessible marker and note IDs.

API validation and HTML sanitation are separate controls. `@sefaria/client` validates the JSON response shape; this package restricts markup inside valid string fields.

## Implementation notes

### Parsing and serialization

The package parses fragments in HTML mode. This decodes entities and applies browser-style recovery to malformed markup. The package never returns the parser's original source string. Its serializers escape text and attribute values, sort retained attributes, and emit canonical markup. `applyVocalizationToHtml` uses the same serializer but does not apply the sanitizer's allowlist.

The parser, serializers, and traversal helpers are iterative. They can handle realistic deep nesting without exhausting the JavaScript call stack.

### Sanitizer traversal

The sanitizer assigns one of five actions to each parsed element: retain a reviewed element, unwrap its children, remove its entire subtree, replace it with text, or unwrap it as a block with a deferred separator. Only the retain action can emit a tag or attribute. Parser recovery cannot make unsupported source markup trusted.

Block separators are deferred until visible content appears. This prevents adjacent legacy block wrappers from concatenating words without introducing leading, trailing, or duplicate spaces.

### Footnote extraction

The extractor recognizes a marker followed by optional whitespace and a footnote body. When a marker appears inside retained markup, the serializer temporarily closes each open ancestor, emits the marker as a typed body part, and reopens the ancestors. This keeps each emitted HTML part balanced and independently renderable.

Closing and reopening tags can make the output much larger for hostile deeply nested input. Body and note serialization therefore share one output limit. Exceeding the documented limit throws `RangeError` instead of producing unbounded synchronous output.

## Vocalization

```ts
import { applyVocalization } from "@sefaria/text-transform";

const unpointed = applyVocalization("בְּרֵאשִׁ֖ית", "none");
```

`taamim_and_nikkud` preserves all marks, `nikkud` removes cantillation, and `none` removes cantillation, vowel marks, and U+05C3 SOF PASUQ. PASEQ removal defaults to the mobile-style `after-space` behavior; pass `{ paseq: "always" }` for the Web/Linker-style behavior.

Do not pass raw HTML to `applyVocalization`. It operates on plain text or parsed text-node content.

Use `applyVocalizationToHtml` for an already-sanitized HTML fragment. It changes only text nodes and preserves markup and attribute values; it does not sanitize its input.

## Sanitization

```ts
import { sanitize } from "@sefaria/text-transform";

const html = sanitize(apiText, {
  allowFootnotes: true,
  allowInlineAnnotations: true,
  allowNamedEntities: false,
  allowRefLinks: true,
});
```

All options default to `true` and can only remove approved features. They cannot expand the fixed tag, attribute, class, or URL allowlist.

The sanitizer preserves reviewed Sefaria text structure, including footnotes, commentary placements, structural overlays, Masorah spans, named entities, and reference links. It unwraps generic and category links, replaces images with escaped alt text, and removes active content.

Absolute links are limited to HTTPS on `sefaria.org`, `www.sefaria.org`, `sefaria.org.il`, and `www.sefaria.org.il`. Normal relative Sefaria paths are accepted and serialized as canonical absolute `https://www.sefaria.org/...` URLs so embedding-page origins cannot change their destinations.

## Footnotes

```ts
import { extractFootnotes, sanitize } from "@sefaria/text-transform";

const result = extractFootnotes(sanitize(apiText));
```

`result.body` contains ordered HTML and logical marker parts. `result.notes` contains source-ordered marker/content pairs. `markerText` is decoded plain text for text-node rendering; `html` and non-null `content` are escaped HTML. A missing body is `null`; a present empty body is `""`.

The extractor does not return DOM IDs. Component view-model factories own IDs because only they know the segment, language side, composition, and render scope.

`extractFootnotes` does not sanitize its input. Call `sanitize` first when processing untrusted API HTML.

Extraction rejects adversarial inputs with a `RangeError` when closing and reopening nested ancestors around markers would produce more than eight times the input length or 64 KiB, whichever is larger.

## Evidence and compatibility

The [text-processing specification](../../docs/specs/text-processing.md) defines every accepted and removed markup family. [Evidence](../../docs/evidence.md) records the pinned Sefaria source and dated deployed examples. Broad corpus comparison remains in issue #14.
