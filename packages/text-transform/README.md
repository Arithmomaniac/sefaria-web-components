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
