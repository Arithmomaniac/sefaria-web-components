> Created/edited by GitHub Copilot; pending human review.

# How this project differs from Sefaria Web, Mobile, and Linker

[Documentation](../README.md) | [Design](../design.md) | [Development](../development.md)

This project is intentionally not a clone of the Sefaria Web reader, Sefaria Mobile, or the deployed Linker. The pinned source and dated fixtures are evidence for compatibility decisions, not an instruction to reproduce every implementation detail. This page records differences that the local specifications intentionally make, and separates them from upstream behavior that the project preserves.

The local specifications remain normative: [client](../specs/client.md), [components](../specs/components.md), [text processing](../specs/text-processing.md), and [integrations](../specs/integrations.md). The detailed source citations live in [Evidence](../evidence.md).

## Difference map

| Local choice | Reader impact | Rationale and evidence |
| --- | --- | --- |
| Narrower HTML sanitization and exact Sefaria URL policy | Some links, images, styles, and wrappers that Sefaria surfaces can display are removed or unwrapped here. | Third-party embedding requires an explicit allowlist and origin policy. See [URL policy](../specs/text-processing.md#url-policy) and [Render and sanitation boundaries](../evidence.md#render-and-sanitation-boundaries). |
| Explicit PASEQ policies with `after-space` as the local default | Vowel-removal output can differ in U+05C0 handling and whitespace from Web or Linker output. | The project exposes source-derived policies instead of hiding the divergence. See [PASEQ](../specs/text-processing.md#paseq) and [Executable PASEQ references](../evidence.md#executable-paseq-references). |
| Thin client and deterministic factories have one bounded default-on per-client response cache, with no retry or request coalescing | Repeated validated public-data GET operations through one client can reuse cached responses within explicit TTL, entry-count, and retained-byte limits; callers can opt out. | The local client stays a transport capability and does not adopt Sefaria's process-global page cache or same-URL in-flight request combination. See [Current front-end cache](../evidence.md#current-front-end-cache), [Client boundary](../design.md#client-boundary), and [Response cache](../specs/client.md#response-cache). |
| Request-free Web Components render view models | Hosts call a factory, own cancellation and selection, and pass a component-specific view model to the element. | This keeps network and projection outside the DOM element and makes captured-payload, server-provided, and client paths explicit. See [Element contract](../specs/components.md#element-contract). |
| No offline reference parser or generalized domain-model package | Consumers use generated API contracts and component-specific factories rather than a second local Sefaria model. | These are product-scope decisions, not claims that Sefaria's systems are defective. See [Non-goals](../design.md#non-goals) and [Source baseline](../evidence.md#source-baseline). |
| UI aims for semantic parity, not pixel parity | Direction, roles, attribution, focus, and safe text are preserved, while spacing and private layout mechanics can differ. | The local contract names bilingual sides by role, gets direction from payload data, and renders source-card attribution once. See [Bilingual segment contract](../specs/components.md#bilingual-segment-contract-current), [Source card contract](../specs/components.md#source-card-contract-current), and [Bilingual layout and alignment](../evidence.md#bilingual-layout-and-alignment). |

## PASEQ is an explicit compatibility choice

PASEQ is U+05C0. The comparison input recorded in evidence is `א ׀ ב׀ג`, whose code points are `U+05D0 U+0020 U+05C0 U+0020 U+05D1 U+05C0 U+05D2`.

With `paseq: "always"`, the local transform removes every U+05C0 and preserves surrounding whitespace:

```text
input:  א ׀ ב׀ג
output: א  בג
```

With `paseq: "after-space"`, it removes only a PASEQ immediately preceded by whitespace in the original input and removes that preceding whitespace:

```text
input:  א ׀ ב׀ג
output: א ב׀ג
```

The local default is `after-space`, matching the documented Mobile-style behavior. Sefaria Web and the deployed Linker use the `always` behavior in the pinned comparison. `taamim_and_nikkud` preserves cantillation and therefore preserves PASEQ; `nikkud` and `none` apply the selected PASEQ policy. Separately, `none` removes U+05C3 SOF PASUQ while `nikkud` preserves it.

The reader impact is exact Unicode and whitespace difference, not merely visual style. A compatibility-sensitive caller must select the policy explicitly and report code points when comparing output. See [Vocalization](../specs/text-processing.md#vocalization), [PASEQ](../specs/text-processing.md#paseq), and [Vocalization differences](../evidence.md#vocalization-differences).

## Sanitization is narrower on purpose

Sefaria's broader `cleanHTML` helper permits sheet-oriented tags, styles, and `href` values without the exact production-origin policy used here. The local sanitizer instead:

- retains only the reviewed semantic tags, attributes, classes, and direction values;
- removes active subtrees, event attributes, inline styles, dangerous URLs, SVG, MathML, and embedded-document surfaces;
- unwraps category anchors and every generic anchor because no Core component owns generic outbound navigation;
- preserves reference and named-entity anchors only when their reviewed discriminator and URL requirements are satisfied; and
- replaces `img` with escaped `alt` text because no current component owns image loading or an image-origin policy, even though official Sefaria documentation demonstrates image-bearing text.

The reader impact is that a text fragment can be visibly less interactive or less image-rich than the Sefaria Web surface. That is intentional for safe rendering inside third-party pages, not an undocumented attempt to reproduce every Web feature. See [Markup contract](../specs/text-processing.md#markup-contract), [URL policy](../specs/text-processing.md#url-policy), [Source-only and intentionally unsupported forms](../evidence.md#source-only-and-intentionally-unsupported-forms), [Render and sanitation boundaries](../evidence.md#render-and-sanitation-boundaries), and [Sefaria's text-formatting explanation](https://developers.sefaria.org/docs/text-formatting-beyond-the-segment-level).

## Transport and rendering are separate local responsibilities

The local client is a thin generated-client capability. Its only transport policy is the specified bounded default-on per-client response cache; it does not add a normalized domain facade, retries, request coalescing, stale fallback, persistence, or cross-client sharing. Component factories own projection and text processing; Web Components own layout, accessibility, interaction, and DOM rendering, but make no requests.

This split changes where a reader looks for behavior. A host supplies a client to an async factory, or supplies captured/server data to a pure factory, then gives the resulting view model to the element. The element does not receive a reference, raw payload, client, base URL, host, or `fetch`.

This is a product architecture choice, not a claim that Sefaria Web's application structure is wrong. It supports deterministic tests, server-provided data, request-count proofs, and third-party style isolation. See [Ownership](../design.md#ownership), [Client boundary](../design.md#client-boundary), [Pure factories](../specs/components.md#pure-factories), and [Element contract](../specs/components.md#element-contract).

## No pixel parity is promised

The local bilingual component names its sides `primary` and `translation`, keeps visible sides and layout separate, and names side order by role rather than by text direction. Direction comes from the selected payload version. The source card owns edition attribution and renders each selected edition once at the card boundary rather than repeating it for every leaf.

These choices preserve data ownership and work when the primary side is left-to-right as well as right-to-left. They intentionally avoid copying private Sefaria Web layout mechanics or claiming identical geometry. The evidence supports CSS-based alignment without measurement scripts, but the local element remains free to use its own shadow-DOM layout. See [Bilingual segment contract](../specs/components.md#bilingual-segment-contract-current), [Source card contract](../specs/components.md#source-card-contract-current), and [Bilingual layout and alignment](../evidence.md#bilingual-layout-and-alignment).

## The local Linker fixes dated deployed-Linker limitations

The current local popup and Linker demonstration implement:

- shadow-root isolation so popup rules and fonts do not leak into the host page;
- host-overridable theme tokens with light and dark defaults;
- an accessible close control, Escape handling, focus restoration, and a real Tab and Shift+Tab focus cycle; and
- cancellation and stale-result suppression for article scans and popup requests.

The recorded August 2026 observations explain the intentional difference: the inspected deployed Linker leaked popup styles, used a fixed light theme, and suppressed Tab without moving focus. Those are dated upstream observations, not claims about every current Linker deployment or the local implementation. Public hosting and broader live-site qualification for the local demonstration remain external. See [Linker demonstration](../linker-demo.md), [Integration specification](../specs/integrations.md#popup-behavior), [Linker style isolation](../evidence.md#linker-style-isolation), [Linker theme behavior](../evidence.md#linker-theme-behavior), and [Linker keyboard behavior](../evidence.md#linker-keyboard-behavior).

## Upstream behavior we preserve rather than fix

Some surprising behavior belongs to the reviewed upstream payload or response contract. The local project preserves it and projects it explicitly instead of normalizing it away.

### Recursive text shape is payload data

Nested arrays can occur for both spanning and non-spanning references. `isSpanning` does not determine whether `text` is nested. Source-card projection follows the recursive value, aligns sides by the union of position paths, keeps one-sided paths as partial pairs, skips empty inner arrays, and does not synthesize leaf references from array indexes.

This preserves returned source text even when the two sides disagree about which paths exist. See [Recursive text shape and side alignment](../evidence.md#recursive-text-shape-and-side-alignment) and [Source card contract](../specs/components.md#source-card-contract-current).

### `isPrimary` is not a unique side identifier

The payload can contain more than one version with `isPrimary: true`. Exact selectors claim their matching version before the opposite bare selector falls back to role predicates, and response array order is not a side identifier.

This avoids treating response array order as authoritative. See [Bilingual version roles](../evidence.md#bilingual-version-roles) and [Bilingual segment contract](../specs/components.md#bilingual-segment-contract-current).

### Valid HTTP 200 error objects remain errors

Several Core endpoints can return an HTTP 200 JSON error object for an invalid reference or title, while other failures use documented HTTP error statuses. The client preserves the HTTP 200 payload union; it does not automatically turn that object's `error` field into an HTTP failure or rejection. A caller must inspect the operation's actual payload shape rather than equating HTTP 200 with renderable text.

The reference endpoint also has a distinct HTTP 200 `{ "is_ref": false }` outcome. The reference-label factory projects that as empty, while its documented HTTP 404 outcome is an error view model.

See [Core endpoint implementation map](../evidence.md#core-endpoint-implementation-map), [Success and failure semantics](../specs/client.md#success-and-failure-semantics), and [Reference label contract](../specs/components.md#reference-label-contract-current).

### Return formats can remove information

`text_only`, Mobile `stripItags`, and the v3 `strip_only_footnotes` path can remove footnote bodies or broader annotation families before a factory receives the response. An empty note list is therefore not proof that the source contained no notes.

Transforms cannot reconstruct this missing content or infer that it once existed. Hosts need request context to explain the loss and must use the component's supported states rather than inventing a generic unavailable state. See [Return-format information loss](../evidence.md#return-format-information-loss) and [Information loss](../specs/text-processing.md#information-loss).

## Read next

- [Text markup](text-markup.md) for the reviewed tag, attribute, link, image, footnote, and parser families.
- [Design](../design.md) for ownership and dependency boundaries.
- [Development](../development.md) for current commands and planned work.
- [Client specification](../specs/client.md) for generated transport contracts and response semantics.
- [Component specification](../specs/components.md) for view models, factories, and request-free elements.
