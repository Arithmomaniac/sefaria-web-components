> Created/edited by GitHub Copilot; pending human review.

# Evidence

This document records source observations that support the design and specifications. It does not define product behavior or delivery status.

## Source baseline

The research used:

- `Sefaria/Sefaria-Project` at `c33ee50`
- later web spot checks at `4c0ecc1`
- `Sefaria/Sefaria-Mobile` at `925420d`
- `Sefaria/sefaria-mcp` at `d409602`
- the live `sefaria.org` DOM and computed styles in August 2026
- the live `/api/texts`, `/api/v3/texts`, and `/api/powered-by` endpoints
- live probes of each relevant `return_format`
- [`Sefaria/Sefaria-Project` `docs/openAPI.json` at `1f7d0844ca6a9eddc8e48168962aacb09de75bd6`](https://github.com/Sefaria/Sefaria-Project/blob/1f7d0844ca6a9eddc8e48168962aacb09de75bd6/docs/openAPI.json)
- the deployed Linker on a third-party page
- `DaveDushi/bisl-torah` at `ea51f7b`
- `jleznek/torah-chat` at `1492fc5`

Evidence has these classes:

- **Observed:** Source code or a live result supplied the fact.
- **Inferred:** Public consumer behavior supplied the likely rule.
- **Proposed:** This project defines the behavior.

The specifications own proposed behavior. This document records observed and inferred evidence.

The Sefaria web and mobile repositories are the primary evidence for current rendering behavior. Live Sefaria surfaces supplement those repositories.

Consumer projects show integration needs and independent use. They do not define Sefaria behavior.

On August 30, 2026, Sefaria's remote `master` was `91ca8c1a32a6f883261862933ecb394dc1025c1e`. The files used for the text-markup and transform analysis had not changed since the pinned `1f7d0844ca6a9eddc8e48168962aacb09de75bd6` revision.

## Core endpoint implementation map

The Core API source audit uses Sefaria commit [`1f7d0844ca6a9eddc8e48168962aacb09de75bd6`](https://github.com/Sefaria/Sefaria-Project/tree/1f7d0844ca6a9eddc8e48168962aacb09de75bd6).

| Endpoint | Route | Handler and response builder | Upstream tests |
| --- | --- | --- | --- |
| `GET /api/v3/texts/{tref}` | [`sefaria/urls_shared.py:86`](https://github.com/Sefaria/Sefaria-Project/blob/1f7d0844ca6a9eddc8e48168962aacb09de75bd6/sefaria/urls_shared.py#L86) | [`api/views.py:28-88`](https://github.com/Sefaria/Sefaria-Project/blob/1f7d0844ca6a9eddc8e48168962aacb09de75bd6/api/views.py#L28-L88), [`sefaria/model/text_request_adapter.py:15-235`](https://github.com/Sefaria/Sefaria-Project/blob/1f7d0844ca6a9eddc8e48168962aacb09de75bd6/sefaria/model/text_request_adapter.py#L15-L235) | [`api/tests.py:13-227`](https://github.com/Sefaria/Sefaria-Project/blob/1f7d0844ca6a9eddc8e48168962aacb09de75bd6/api/tests.py#L13-L227) |
| `GET /api/texts/versions/{index}` | [`sefaria/urls_shared.py:74`](https://github.com/Sefaria/Sefaria-Project/blob/1f7d0844ca6a9eddc8e48168962aacb09de75bd6/sefaria/urls_shared.py#L74) | [`reader/views.py:2615-2622`](https://github.com/Sefaria/Sefaria-Project/blob/1f7d0844ca6a9eddc8e48168962aacb09de75bd6/reader/views.py#L2615-L2622), [`sefaria/model/text.py:4649-4671`](https://github.com/Sefaria/Sefaria-Project/blob/1f7d0844ca6a9eddc8e48168962aacb09de75bd6/sefaria/model/text.py#L4649-L4671) | [`api-tests/test_texts.py:52-56`](https://github.com/Sefaria/Sefaria-Project/blob/1f7d0844ca6a9eddc8e48168962aacb09de75bd6/api-tests/test_texts.py#L52-L56) |
| `GET /api/ref/{tref}` | [`sefaria/urls_shared.py:135`](https://github.com/Sefaria/Sefaria-Project/blob/1f7d0844ca6a9eddc8e48168962aacb09de75bd6/sefaria/urls_shared.py#L135) | [`api/views.py:91-176`](https://github.com/Sefaria/Sefaria-Project/blob/1f7d0844ca6a9eddc8e48168962aacb09de75bd6/api/views.py#L91-L176) | [`api/tests.py:230-380`](https://github.com/Sefaria/Sefaria-Project/blob/1f7d0844ca6a9eddc8e48168962aacb09de75bd6/api/tests.py#L230-L380) |
| `GET /api/v2/index/{title}` | [`sefaria/urls_shared.py:92`](https://github.com/Sefaria/Sefaria-Project/blob/1f7d0844ca6a9eddc8e48168962aacb09de75bd6/sefaria/urls_shared.py#L92) | [`reader/views.py:2061-2131`](https://github.com/Sefaria/Sefaria-Project/blob/1f7d0844ca6a9eddc8e48168962aacb09de75bd6/reader/views.py#L2061-L2131), [`sefaria/model/text.py:260-321`](https://github.com/Sefaria/Sefaria-Project/blob/1f7d0844ca6a9eddc8e48168962aacb09de75bd6/sefaria/model/text.py#L260-L321) | [`api-tests/test_endpoints.py:14-19`](https://github.com/Sefaria/Sefaria-Project/blob/1f7d0844ca6a9eddc8e48168962aacb09de75bd6/api-tests/test_endpoints.py#L14-L19) |
| `GET /api/shape/{title}` | [`sefaria/urls_shared.py:104`](https://github.com/Sefaria/Sefaria-Project/blob/1f7d0844ca6a9eddc8e48168962aacb09de75bd6/sefaria/urls_shared.py#L104) | [`reader/views.py:2204-2304`](https://github.com/Sefaria/Sefaria-Project/blob/1f7d0844ca6a9eddc8e48168962aacb09de75bd6/reader/views.py#L2204-L2304) | [`api-tests/test_endpoints.py:56-58`](https://github.com/Sefaria/Sefaria-Project/blob/1f7d0844ca6a9eddc8e48168962aacb09de75bd6/api-tests/test_endpoints.py#L56-L58) |
| `GET /api/links/{tref}` | [`sefaria/urls_shared.py:95`](https://github.com/Sefaria/Sefaria-Project/blob/1f7d0844ca6a9eddc8e48168962aacb09de75bd6/sefaria/urls_shared.py#L95) | [`reader/views.py:2344-2391`](https://github.com/Sefaria/Sefaria-Project/blob/1f7d0844ca6a9eddc8e48168962aacb09de75bd6/reader/views.py#L2344-L2391), [`sefaria/client/wrapper.py:164-327`](https://github.com/Sefaria/Sefaria-Project/blob/1f7d0844ca6a9eddc8e48168962aacb09de75bd6/sefaria/client/wrapper.py#L164-L327) | [`api-tests/test_endpoints.py:22-26`](https://github.com/Sefaria/Sefaria-Project/blob/1f7d0844ca6a9eddc8e48168962aacb09de75bd6/api-tests/test_endpoints.py#L22-L26) |

The source audit establishes these constraints before overlay work:

- The v3 text response builder starts with `versions`, `missings`, `available_langs`, and `available_versions`. The handler removes `missings` and `available_langs` and adds `warnings`.
- The v3 text handler reads every `version` query value with `request.GET.getlist("version")`, so the generated request contract must permit a repeated parameter.
- The v3 text handler returns 404 for an invalid or empty reference. It returns 400 for an invalid `return_format` or an adapter failure.
- V3 text success fields include unconditional reference fields and conditional spanning, index, node, source, and linker fields. Required lists must follow the handler branches.
- The versions route names its parameter `tref`, and the tests pass `Genesis 1:1`. The OpenAPI path calls the same parameter `index`.
- The versions endpoint calls `Ref.version_list()`. A successful response is a list of version metadata. Book-level requests can add `firstSectionRef`.
- Live versions probes on August 30, 2026 returned `versionSource: null` for one Rashi on Genesis version and `status: null` for one Sefer HaChinukh version.
- A live invalid versions reference on August 30, 2026 returned HTTP 200 with a JSON `error` object through `catch_error_as_json`.
- The ref endpoint returns HTTP 200 with `{ "is_ref": false }` for expected parse failures. Successful fields depend on the node type and reference depth.
- The index endpoint delegates to `Index.contents()`. Query parameters can add content counts and related topics.
- `index_api` uses `catch_error_as_json`; an invalid title therefore returns an HTTP 200 JSON error object. A live invalid-title probe confirmed this branch on August 30, 2026.
- The shape endpoint returns a list for a text, complex text, corpus, or category. Each shape record uses lower-case `section`, `length`, `chapters`, and `book`, plus `heTitle`, `title`, and `heBook`.
- The shape collapse branch omits `title` and `heTitle` from aggregate complex-book records. The handler parses `dependents` with `bool(int(...))` and reads but does not use the deprecated `depth` value. A live Talmud shape probe on August 30, 2026 returned five collapsed records.
- The links endpoint defaults to `with_text=1`. A successful response is a list. Text and version fields can be strings, arrays, or null because merged and missing versions use different branches.
- The repeatable `category` query is read with `request.GET.getlist("category")`.
- When `with_sheet_links=1`, `format_sheet_as_link()` adds `isSheet`, `index_title`, `category`, `collectiveTitle`, `sourceRef`, and `sourceHeRef` to sheet results before appending them to the same response list.
- Essay links expose `displayedText` as an object with required `en` and `he` strings. Live Genesis 1:1 links on August 30, 2026 contained this branch.
- A live invalid links reference on August 30, 2026 returned HTTP 200 with a JSON `error` object.

Two documentation corrections also use the local Sefaria API audit as supporting evidence while retaining the pinned Sefaria implementation as authority:

- `Sefaria-API-audit/findings.yaml` finding `OAS-SCHEMA-009`, `Sefaria-API-audit/evidence/shape-matrix.md`, and `Sefaria-API-audit/proposed/openAPI.corrected.json` support wrapping both shape examples in the array root returned by the endpoint.
- `Sefaria-API-audit/findings.yaml` finding `OAS-DOC-001` and `Sefaria-API-audit/evidence/shape-matrix.md` support documenting the `SheetNode` navigation exception and the conditional `first_subref` and `last_subref` fields.

These source facts constrain the overlay. Deployed fixtures must still cover representative data-dependent branches.

The dated captures under `packages/client/test/fixtures` preserve the deployed v3 spanning-text, Genesis index, nullable version metadata, versions error, simple shape, shape error, Targum link, links error, Sheet reference, segment reference, same-section range, spanning range, commentary reference, and unresolvable-reference branches. `packages/client/test/fixtures/manifest.json` records the exact request URL and any reduction for each capture.

### September 3, 2026 reference captures

The unmodified deployed captures `ref-genesis-segment-2026-09-03.json`, `ref-genesis-range-2026-09-03.json`, `ref-genesis-spanning-2026-09-03.json`, `ref-rashi-commentary-2026-09-03.json`, and `ref-unresolved-2026-09-03.json` establish the payloads consumed by the current reference-label factory. They cover `Genesis 1:1`, `Genesis 1:1-3`, `Genesis 1:31-2:2`, `Rashi on Genesis 1:1:1`, and `__missing_ref_label_probe__`. The first four return `CoreRefSuccess`; the last returns HTTP 200 with `{ "is_ref": false }`.

The pinned [`RefView.dispatch`](https://github.com/Sefaria/Sefaria-Project/blob/1f7d0844ca6a9eddc8e48168962aacb09de75bd6/api/views.py#L93-L101) catches `InputError` and `DictionaryEntryNotFoundError` as `{ "is_ref": false }`, while other exceptions produce an HTTP 404 error payload. The empty and error reference-label states preserve that distinction.

The pinned [`Ref.he_normal`](https://github.com/Sefaria/Sefaria-Project/blob/1f7d0844ca6a9eddc8e48168962aacb09de75bd6/sefaria/model/text.py#L4739-L4748) delegates to `normal("he")`. [`Ref._get_normal`](https://github.com/Sefaria/Sefaria-Project/blob/1f7d0844ca6a9eddc8e48168962aacb09de75bd6/sefaria/model/text.py#L4683-L4691) falls back to `self.normal()` when the Hebrew full title is absent. A successful `hebrew` value therefore cannot distinguish a true Hebrew form from an English fallback without unsupported heuristics.

The pinned [`Ref.url`](https://github.com/Sefaria/Sefaria-Project/blob/1f7d0844ca6a9eddc8e48168962aacb09de75bd6/sefaria/model/text.py#L4780-L4801) replaces spaces with underscores, colons with periods, and question marks with `%3F`; it does not fully percent-encode a URL path. The reference-label factory preserves existing valid escapes and encodes remaining unsafe path characters before it creates an absolute URL.

### September 1, 2026 Genesis index capture

`packages/client/test/fixtures/index-genesis-2026-09-01.json` was captured from the deployed `https://www.sefaria.org/api/v2/index/Genesis` response on September 1, 2026. The committed fixture retains top-level `title` and `categories`; the root schema's `nodeType`, `depth`, `addressTypes`, `sectionNames`, `lengths`, `title`, `heTitle`, `heSectionNames`, and `key`; exactly the primary Hebrew and English root-schema titles; and only `alts.Parasha.nodes[0]`. That alternate node retains `nodeType`, `depth`, `wholeRef`, `addressTypes`, `sectionNames`, `refs`, reduced `match_templates`, `isMapReferenceable`, `sharedTitle`, all deployed titles in that node, `title`, and `heTitle`. All other top-level metadata and alternate nodes are omitted.

The September 1 capture is immutable. The current candidate-capture implementation requires exactly `--write --capture-date YYYY-MM-DD`, reads the source URL from this fixture's manifest declaration, refuses an invalid date or existing dated target before fetching, validates the unknown response with `validateGetIndexV2200`, applies the same deterministic reduction, and stages a newly dated candidate beside the fixture directory. It verifies the candidate target is still absent and publishes with one same-filesystem rename; it does not update the manifest, tests, or references. `packages/client/test/refresh-fixtures.test.ts` proves argument refusal, candidate naming, exact URL use, deterministic bytes, existing-target refusal, unchanged evidence on source or validation failures, successful creation, failed-publication behavior, and one-rename replacement semantics. Reviewers manually retain a candidate and update its provenance and references in a reviewed change.

## Current focused compatibility qualification

The current qualification is a small, pinned, offline suite. It is not an exhaustive comparison of Sefaria corpora, endpoints, versions, markup, or consumer code paths, and it does not claim broad compatibility publication. Broader corpus qualification remains planned.

### Criterion-to-proof map

| Issue #14 criterion | Existing and current proof |
| --- | --- |
| Six representative Core endpoints with provenance | `packages/client/test/validation.test.ts` validates the dated v3, versions, ref, shape, and links fixtures; `packages/client/test/payload-agreement.test.ts` proves the manifest covers all six operations and validates the September 1 Genesis index fixture statically and at runtime. |
| Overlay scope and guarded preconditions | Existing `packages/client/test/generation.test.ts` cases prove extraction of only six Core operations, mutation failure at every co-located guard, deterministic offline generation, stale-output detection, and each reviewed correction. |
| Generated TypeScript and public validator agreement | Existing `packages/client/test/type-contract.test.ts` and `packages/client/test/validation.test.ts` cover generated public types and validators; `packages/client/test/payload-agreement.test.ts` adds shared accepted and rejected fixture expressions. |
| Negative required-field and old-shape fixtures | `packages/client/test/payload-agreement.test.ts` rejects an index response without required `categories` and the pre-overlay uppercase shape fields. Existing `packages/client/test/validation.test.ts` also enforces required, strict, and `minProperties` constraints. |
| Character and structural transform comparison | Existing `packages/text-transform/test/vocalization.test.ts`, `sanitize.test.ts`, and `footnotes.test.ts` cover the pure operations. New `tests/compatibility/src/index.test.ts`, `text-transform.test.ts`, and `cross-package-smoke.test.ts` add bounded code-point differences, pinned source comparisons, structural comparisons, and a full validate-to-transform path. |
| Explicit, reviewable capture | `packages/client/test/refresh-fixtures.test.ts` proves the Genesis-only network command requires exact write and capture-date arguments, creates only a new dated candidate, reduces deterministically, refuses existing targets, and leaves committed evidence unchanged on source, validation, or publication failure. |
| Evidence and parser interpretation preservation | This document remains the provenance record. Existing `packages/text-transform/test/sanitize.test.ts` characterizes standards-parser recovery without inventing malformed attributes; the focused qualification adds no alternate model or parser interpretation to supersede that result. |
| Separate result classes and no exhaustive claim | `tests/compatibility/src/qualification.test.ts` proves grouped `passed`, `failed`, `unavailable`, and `intentional-difference` output and nonzero exit only for unexpected failures. This section states the qualification's representative, non-exhaustive scope. |

### Composed v3 smoke fixture

`tests/compatibility/src/v3-source-backed.fixture.ts` is an intentionally composed fixture, not a verbatim deployed response. Its v3 field set and nesting follow the August 29, 2026 deployed `https://www.sefaria.org/api/v3/texts/Genesis%201%3A31-2%3A2` capture, while its citation-identifying metadata was authored as a non-spanning `Genesis 1:1` response for this focused case. Its single text string combines the MAM span `<span class="mam-kq-trivial">שְׁעָרָ֗ו</span>` hand-extracted from the August 30, 2026 Miqra according to the Masorah `Obadiah 1` response with the footnote marker, body, and nested bold text hand-extracted from the August 30, 2026 Contemporary Torah `Genesis 1:1` response; short connecting prose and punctuation make the two reviewed fragments one executable string. The fixture retains one `versions` record and only enough response metadata to exercise the generated v3 validator before sanitation, HTML text-node vocalization, and structured footnote extraction. Because the metadata, fragments, and connecting prose are manually composed, refresh remains a manual source-review operation.

### Text-segment evidence reuse

The current text-segment tests reuse evidence that already supports the behavior under test rather than collecting another API capture. The composed v3 smoke fixture supplies a validated single-segment payload with mixed Hebrew and English text, retained vocalization, and a static footnote. `packages/client/test/fixtures/v3-text-spanning-2026-08-29.json` supplies a validated deployed array-valued response that proves the segment factory reports wrong granularity instead of silently choosing the first child.

Missing-version warnings, exact-version selection, ambiguous matches, `null`, blank content, invalid selectors, network rejection, and abort rejection are authored unit cases. They test the component contract directly and are not presented as deployed corpus evidence. The component-lab states are also authored view models for visual development; they are not API captures or independent behavior oracles.

### Executable PASEQ references

The compatibility input is exactly `א ׀ ב׀ג`.

| Reference implementation | Pinned source-derived policy | Expected output | Current executable comparison |
| --- | --- | --- | --- |
| [Sefaria Web `TextRange.jsx:263-278`](https://github.com/Sefaria/Sefaria-Project/blob/1f7d0844ca6a9eddc8e48168962aacb09de75bd6/static/js/TextRange.jsx#L263-L278) | Remove every PASEQ while preserving surrounding whitespace (`always`) | `א  בג` | `applyVocalization(..., { paseq: "always" })` matches. |
| [Sefaria Mobile `sefaria.js:1286-1292`](https://github.com/Sefaria/Sefaria-Mobile/blob/925420dcf7dd00a16f8dc4c4191284792fc3f9fa/sefaria.js#L1286-L1292) | Remove PASEQ only after whitespace and remove that whitespace (`after-space`) | `א ב׀ג` | `applyVocalization(..., { paseq: "after-space" })` matches. |
| [Sefaria Linker `popup.js:308-319`](https://github.com/Sefaria/Sefaria-Project/blob/1f7d0844ca6a9eddc8e48168962aacb09de75bd6/static/js/linker.v3/popup.js#L308-L319) | Remove every PASEQ while preserving surrounding whitespace (`always`) | `א  בג` | `applyVocalization(..., { paseq: "always" })` matches. |

The current project default is `after-space`, so its output `א ב׀ג` intentionally differs from the Web reference output `א  בג`. The qualification labels that exact pair as `intentional-difference`; it is neither a pass nor an unexpected failure.

### Qualification result semantics

The current command emits one grouped count line and one detail line for every non-passing case. `passed` means the focused executable comparison matched. `failed` means an unexpected mismatch and produces exit code 1. `unavailable` means required pinned evidence could not be evaluated and remains visible but does not by itself produce a nonzero exit. `intentional-difference` means the exact documented project/reference divergence was reproduced and also does not by itself produce a nonzero exit. The current pinned suite expects `passed=9 failed=0 unavailable=0 intentional-difference=1`; this result qualifies only the named cases above.

## Text markup evidence

### Persisted text contract

Sefaria's persisted text contract permits `i`, `b`, `br`, `u`, `strong`, `em`, `big`, `small`, `img`, `sup`, `sub`, `span`, and `a`. It assigns attributes by tag: `sup[class]`; `span[class,dir]`; `i[data-overlay,data-value,data-commentator,data-order,class,data-label,dir]`; `img[src,alt]`; and `a[dir,class,href,data-ref,data-ven,data-vhe,data-scroll-link]`. The comments distinguish three uses of `i`: footnote bodies, commentary placements, and structural overlays. See [`sefaria/constants/model.py:1-12`](https://github.com/Sefaria/Sefaria-Project/blob/1f7d0844ca6a9eddc8e48168962aacb09de75bd6/sefaria/constants/model.py#L1-L12).

`AbstractTextRecord` recursively passes string segments through Bleach with that tag and attribute contract. See [`sefaria/model/text.py:1068-1072`](https://github.com/Sefaria/Sefaria-Project/blob/1f7d0844ca6a9eddc8e48168962aacb09de75bd6/sefaria/model/text.py#L1068-L1072) and [`sefaria/model/text.py:1208-1217`](https://github.com/Sefaria/Sefaria-Project/blob/1f7d0844ca6a9eddc8e48168962aacb09de75bd6/sefaria/model/text.py#L1208-L1217).

Normal `TextChunk` writes sanitize text, but direct `Version` sanitation is deliberately empty. Legacy imports or direct Version writes can therefore retain markup outside the current persisted contract. See [`sefaria/model/text.py:1444-1448`](https://github.com/Sefaria/Sefaria-Project/blob/1f7d0844ca6a9eddc8e48168962aacb09de75bd6/sefaria/model/text.py#L1444-L1448) and [`sefaria/model/text.py:1918-1957`](https://github.com/Sefaria/Sefaria-Project/blob/1f7d0844ca6a9eddc8e48168962aacb09de75bd6/sefaria/model/text.py#L1918-L1957).

The persisted contract is evidence of legitimate source forms, not the reusable component's trust boundary. Arbitrary stored class values and URLs are too broad for HTML rendered on a third-party page.

### Markup taxonomy

| Family | Observed or source-defined form | Source status | Sefaria behavior | Project treatment |
| --- | --- | --- | --- | --- |
| Ordinary emphasis | `b`, `strong`, content-bearing `i`, `em`, `u` | Persisted; selected live probes did not establish `u` | Rendered as native inline HTML | Preserve safe semantic tags |
| Size markup | `big`, `small` | Persisted; `small` is live-confirmed | Rendered as native inline HTML | Preserve safe semantic tags |
| Ordinary super/subscript | `sup`, `sub` | Persisted; selected live probes did not establish `sub` | Web delegates clicks from superscripts broadly | Preserve inertly; do not make every `sup` interactive |
| Line structure | `br` | Persisted and live-confirmed | Web uses breaks for text structure and layout | Preserve as canonical `br` |
| Footnote pair | `sup.footnote-marker` followed by `i.footnote` | Persisted, tested, and live-confirmed | Web hides the body and toggles it from the marker | Preserve through sanitation, then extract structurally |
| End-footnote marker | `sup.endFootnote` | Source-defined and recognized by stripping | Removed by `strip_itags` | Preserve as inert text until a component owns presentation |
| Rendered commentary marker | `sup.itag` | Web-generated and recognized by stripping | Produced from a selected commentary placement | Tolerate as inert text; do not infer source metadata |
| Commentary placement | Empty `i[data-commentator]` with `data-order` or `data-label` | Persisted, tested, migrated, and live-confirmed | Web replaces matching placements with `sup.itag`; `data-label` wins | Preserve reviewed attributes inertly |
| Structural overlay | Empty `i[data-overlay][data-value]` | Persisted and live-confirmed | CSS renders selected overlay names | Preserve safe values inertly without closing the value set |
| Direction wrapper | `span[dir]` and `i[dir]` | Persisted | Browser direction semantics | Preserve only `ltr`, `rtl`, or `auto` |
| Masorah paragraph marker | `span.mam-spi-pe`, `span.mam-spi-samekh` | Live-confirmed | Preserves paragraph or section notation | Preserve exact class tokens |
| Masorah ketiv/qere | `span.mam-kq`, `span.mam-kq-k`, `span.mam-kq-q`, `span.mam-kq-trivial` | Live-confirmed | Preserves textual distinctions | Preserve exact class tokens and nesting |
| Reference link | `a[data-ref]` with optional `refLink`, `href`, version, range, and scroll metadata | Persisted attributes and API-generated/live forms | Web routes reference interaction from `data-ref` | Preserve only approved metadata and approved Sefaria URLs |
| Named-entity link | `a.namedEntityLink[data-slug][data-range]` | API-generated and live-confirmed | Web opens named-entity context | Preserve only when enabled and complete |
| Category link | `a.categoryLink[data-category-path][data-range]` | API-generated in source | No Core interaction owner | Unwrap to text |
| Image | `img[src,alt]` | Persisted but not confirmed in selected live Core probes | Web can render raw images | Replace with escaped alt text; defer loading |
| Block HTML | `p`, `div`, lists, headings, tables, blockquotes | Outside the persisted Version contract | Can survive legacy or direct writes | Unwrap with deterministic separation |
| Active content | Scripts, styles, templates, embedded documents, SVG, MathML, event handlers, active URLs | Hostile or out-of-contract | Not a supported text feature | Remove under a non-configurable rule |

### Footnote markup

The normalizer recognizes a `sup` whose class tokens contain `footnote-marker`, followed by an `i` whose class tokens contain `footnote`. It scans nested `i` elements and tolerates a malformed closing `</i >`. See [`sefaria/helper/normalization.py:153-198`](https://github.com/Sefaria/Sefaria-Project/blob/1f7d0844ca6a9eddc8e48168962aacb09de75bd6/sefaria/helper/normalization.py#L153-L198).

Pinned tests establish nested ordinary italics inside a footnote and standalone removal of `sup.footnote-marker`, `sup.endFootnote`, and `sup.itag`. See [`sefaria/helper/tests/normalization_tests.py:8-43`](https://github.com/Sefaria/Sefaria-Project/blob/1f7d0844ca6a9eddc8e48168962aacb09de75bd6/sefaria/helper/tests/normalization_tests.py#L8-L43).

Sefaria Web receives footnote bodies and markers. It handles marker clicks in the reader and styles `sup.footnote-marker`, `sup.endFootnote`, and `sup.itag`. See [`static/js/TextRange.jsx:225-229`](https://github.com/Sefaria/Sefaria-Project/blob/1f7d0844ca6a9eddc8e48168962aacb09de75bd6/static/js/TextRange.jsx#L225-L229) and [`static/css/s2.css:7667-7700`](https://github.com/Sefaria/Sefaria-Project/blob/1f7d0844ca6a9eddc8e48168962aacb09de75bd6/static/css/s2.css#L7667-L7700).

The August 30, 2026 deployed `Genesis 1:1` fixture contains:

```html
When God began to create<sup class="footnote-marker">*</sup
><i class="footnote"><b>When God began to create </b>Others ...</i>
```

The source URL is `https://www.sefaria.org/api/v3/texts/Genesis%201%3A1?version=english%7CThe%20Contemporary%20Torah%2C%20Jewish%20Publication%20Society%2C%202006&return_format=default`.

### Commentary placement iTags

Sefaria Web converts only placements whose `data-commentator` matches the selected commentary. `data-label` becomes the marker when present; otherwise `data-order` is used and can be converted to a Hebrew numeral. See [`static/js/TextRange.jsx:528-552`](https://github.com/Sefaria/Sefaria-Project/blob/1f7d0844ca6a9eddc8e48168962aacb09de75bd6/static/js/TextRange.jsx#L528-L552).

The Shulchan Arukh migration script treats `data-commentator` and `data-order` as placement identity and order. See [`scripts/Even_HaEzer_add_itags_to_existing_links.py:35-60`](https://github.com/Sefaria/Sefaria-Project/blob/1f7d0844ca6a9eddc8e48168962aacb09de75bd6/scripts/Even_HaEzer_add_itags_to_existing_links.py#L35-L60).

The August 30, 2026 deployed Shulchan Arukh fixture contains empty commentary placements with `data-commentator`, `data-order`, and `data-label`. Labels include Hebrew letters and a diamond. One deployed attribute has malformed quoting around `Mishnah Berurah`; the project characterizes standards-parser recovery and does not guess the intended value.

The source URL is `https://www.sefaria.org/api/v3/texts/Shulchan%20Arukh%2C%20Orach%20Chayim%201?version=hebrew%7CMaginei%20Eretz%3A%20Shulchan%20Aruch%20Orach%20Chaim%2C%20Lemberg%2C%201893&return_format=default`.

### Structural overlays

Sefaria's persisted contract assigns `data-overlay` and `data-value` to empty `i` elements. Web CSS renders `Vilna Pages` and `Venice Columns`. See [`static/css/s2.css:7704-7722`](https://github.com/Sefaria/Sefaria-Project/blob/1f7d0844ca6a9eddc8e48168962aacb09de75bd6/static/css/s2.css#L7704-L7722).

August 30, 2026 deployed probes also found `Venice Pages`. The local contract therefore treats overlay names as inert data rather than enumerating only names with current Web CSS.

The representative source URL is `https://www.sefaria.org/api/v3/texts/Jerusalem%20Talmud%20Berakhot%201%3A1?version=hebrew%7CThe%20Jerusalem%20Talmud%2C%20edition%20by%20Heinrich%20W.%20Guggenheimer.%20Berlin%2C%20De%20Gruyter%2C%201999-2015&return_format=default`.

### Masorah markup and line structure

August 30, 2026 deployed Miqra according to the Masorah probes found `mam-spi-pe`, `mam-spi-samekh`, nested `mam-kq`, `mam-kq-k`, and `mam-kq-q` spans, `mam-kq-trivial`, and `br` line structure.

The Obadiah fixture contains:

```html
<span class="mam-kq-trivial">שְׁעָרָ֗ו</span>
```

The source URL is `https://www.sefaria.org/api/v3/texts/Obadiah%201?version=hebrew%7CMiqra%20according%20to%20the%20Masorah&return_format=default`.

The Song of Songs source URL is `https://www.sefaria.org/api/v3/texts/Song%20of%20Songs%201?version=hebrew%7CMiqra%20according%20to%20the%20Masorah&return_format=default`.

Poetry versions expose text line structure through `br` and version metadata. The `poetry` and `indentWhenWrap` classes are Web-generated presentation and are not source text classes.

### API-generated links

The v3 `wrap_all_entities` path can generate references with `class="refLink"`, `data-ref`, and `data-range`; named entities with `class="namedEntityLink"`, `data-slug`, and `data-range`; and categories with `class="categoryLink"`, `data-category-path`, and `data-range`.

See [`sefaria/model/marked_up_text_chunk.py:310-348`](https://github.com/Sefaria/Sefaria-Project/blob/1f7d0844ca6a9eddc8e48168962aacb09de75bd6/sefaria/model/marked_up_text_chunk.py#L310-L348), [`sefaria/model/text_request_adapter.py:193-225`](https://github.com/Sefaria/Sefaria-Project/blob/1f7d0844ca6a9eddc8e48168962aacb09de75bd6/sefaria/model/text_request_adapter.py#L193-L225), and [`api/tests.py:201-220`](https://github.com/Sefaria/Sefaria-Project/blob/1f7d0844ca6a9eddc8e48168962aacb09de75bd6/api/tests.py#L201-L220).

The August 30, 2026 `Genesis 10` deployed probe confirmed reference and named-entity links. The source URL is `https://www.sefaria.org/api/v3/texts/Genesis%2010?version=english%7CThe%20Contemporary%20Torah%2C%20Jewish%20Publication%20Society%2C%202006&return_format=wrap_all_entities`.

Category anchors are source-confirmed but are not retained by the Core sanitizer because no Core component owns their interaction.

### Render and sanitation boundaries

Sefaria Web inserts processed text HTML with `dangerouslySetInnerHTML`. See [`static/js/ContentText.jsx:23-44`](https://github.com/Sefaria/Sefaria-Project/blob/1f7d0844ca6a9eddc8e48168962aacb09de75bd6/static/js/ContentText.jsx#L23-L44) and [`static/js/ContentText.jsx:93-99`](https://github.com/Sefaria/Sefaria-Project/blob/1f7d0844ca6a9eddc8e48168962aacb09de75bd6/static/js/ContentText.jsx#L93-L99).

The Linker uses DOMPurify for text extracted from the host page, but its popup writes Sefaria API text through `innerHTML` without that sanitation path. See [`static/js/linker.v3/main.js:12-19`](https://github.com/Sefaria/Sefaria-Project/blob/1f7d0844ca6a9eddc8e48168962aacb09de75bd6/static/js/linker.v3/main.js#L12-L19) and [`static/js/linker.v3/popup.js:308-319`](https://github.com/Sefaria/Sefaria-Project/blob/1f7d0844ca6a9eddc8e48168962aacb09de75bd6/static/js/linker.v3/popup.js#L308-L319).

Sefaria's broader `cleanHTML` helper permits many sheet-oriented tags, styles, and `href` without a hostname allowlist. See [`static/js/sefaria/util.js:266-293`](https://github.com/Sefaria/Sefaria-Project/blob/1f7d0844ca6a9eddc8e48168962aacb09de75bd6/static/js/sefaria/util.js#L266-L293). That helper is evidence of current Sefaria behavior, not the reusable component contract. The project intentionally applies a narrower allowlist and exact production-origin checks for third-party embedding.

Sefaria operates both `www.sefaria.org` and the Hebrew production origin `www.sefaria.org.il`. The project accepts relative Sefaria links but serializes them as canonical absolute `https://www.sefaria.org/...` URLs so embedding-page origins cannot change their destinations. It also permits HTTPS links on the apex or `www` host for the two production domains. It does not allow arbitrary Sefaria subdomains or generic HTTPS origins.

### Return-format information loss

The server's `strip_itags` operation removes footnote marker/body pairs, empty `i` elements carrying `data-commentator` or `data-overlay`, and `sup.footnote-marker`, `sup.endFootnote`, and `sup.itag`.

See [`sefaria/model/text.py:1278-1282`](https://github.com/Sefaria/Sefaria-Project/blob/1f7d0844ca6a9eddc8e48168962aacb09de75bd6/sefaria/model/text.py#L1278-L1282) and [`sefaria/helper/normalization.py:346-361`](https://github.com/Sefaria/Sefaria-Project/blob/1f7d0844ca6a9eddc8e48168962aacb09de75bd6/sefaria/helper/normalization.py#L346-L361).

The v3 return format named `strip_only_footnotes` invokes this broader operation. The name therefore understates the removed annotation families.

Sefaria Mobile normally requests `stripItags: true` for main text. See [`Sefaria-Mobile/api.js:263-270`](https://github.com/Sefaria/Sefaria-Mobile/blob/925420dcf7dd00a16f8dc4c4191284792fc3f9fa/api.js#L263-L270).

Live probes showed that `return_format=text_only` removes footnote content, not only tags. It also changes `G<small>OD</small>` to `GOD` in the JPS translation, losing the small-cap distinction for the Tetragrammaton. An empty extracted-note list therefore cannot prove that the source had no notes.

### Vocalization differences

The implementations disagree on U+05C0 PASEQ. The executable comparison and exact outputs are recorded under [Executable PASEQ references](#executable-paseq-references). The project exposes both source-derived policies, and `after-space` is the current default.

Sefaria Web's full vocalization-removal expression and the server's `strip_cantillation(..., strip_vowels=True)` range include U+05C3 SOF PASUQ, while the cantillation-only ranges do not. The local `none` mode therefore removes U+05C3 and `nikkud` preserves it.

### Source-only and intentionally unsupported forms

`u`, `sub`, and `img` are part of the persisted contract but were not found in the selected live Core fixtures. Their status is source-confirmed rather than live-confirmed.

Images are intentionally disabled for Core. The sanitizer preserves escaped `alt` text and discards the image because no current component owns image loading or an image-origin policy.

Block elements are not part of the persisted Version contract. They are treated as legacy or out-of-contract input even though Sefaria's sheet cleaner accepts many block forms.

Generic and category links are intentionally unwrapped. The decision prevents unowned outbound navigation from HTML embedded in a third-party page.

### Text response shape

Targeted live `/api/v3/texts` probes on August 27, 2026 showed that text content lives under each item in `versions`.

`Genesis 1:1` returned a string. `Genesis 1:1-3` returned an array. `Genesis 1:31-2:2` returned nested arrays for the spanning range.

### Recursive text shape and side alignment

Targeted deployed `/api/v3/texts` probes on September 4, 2026 showed that recursive text shape is not determined by `isSpanning`.

`Likutei Moharan 1` returned nested arrays while `isSpanning` was `false`. `Genesis 1:31-2:2` returned nested arrays while `isSpanning` was `true`. A consumer must therefore follow the recursive `text` value itself rather than choosing a flattening rule from `isSpanning`.

The `Genesis 1:31-2:2` response returned `spanningRefs: ["Genesis 1:31", "Genesis 2:1-2"]` for two top-level groups while the text contained three leaf segments. `spanningRefs` labels groups rather than every leaf.

`Zohar, Bereshit 1-5` returned a Hebrew first group containing two strings while the corresponding English first group was an empty array. The two sides can therefore disagree in which position paths exist. Intersection alignment would discard returned source text.

`Tosafot on Shabbat 2a` returned one version shaped as `[[s,s,s],[],[],[s],[],[],[s]]` plus one missing-selector warning. Empty inner arrays occur as holes, and an entire requested side can be absent.

These observations do not establish a general reference-construction algorithm. The payload exposes address types that vary by work, and its group-level references do not identify every leaf. The source-card specification consequently uses positional item identity and does not synthesize leaf references.

### Bilingual version roles

Sefaria Web commit [`52e00f8bef430cba25a091f4443345ee1890e6c8`](https://github.com/Sefaria/Sefaria-Project/tree/52e00f8bef430cba25a091f4443345ee1890e6c8) treats reader sides as source or primary text and translation text, not fixed Hebrew and English families.

[`Hooks.jsx:13`](https://github.com/Sefaria/Sefaria-Project/blob/52e00f8bef430cba25a091f4443345ee1890e6c8/static/js/Hooks.jsx#L13) states that the reader's `hebrew` interface value means the source text. It uses `primaryLang` or `translationLang` as the shown content language.

[`sefaria.js:790-829`](https://github.com/Sefaria/Sefaria-Project/blob/52e00f8bef430cba25a091f4443345ee1890e6c8/static/js/sefaria/sefaria.js#L790-L829) resolves primary and translation versions through `isPrimary`, `isSource`, saved preferences, and the translation-language preference. If no concrete version is found, it uses the reserved `primary` or `translation` selector.

[`sefaria.js:632-647`](https://github.com/Sefaria/Sefaria-Project/blob/52e00f8bef430cba25a091f4443345ee1890e6c8/static/js/sefaria/sefaria.js#L632-L647) sorts serialized version parameters before the request. Query order cannot identify the primary and translation sides.

The pinned [`text_request_adapter.py:70-90`](https://github.com/Sefaria/Sefaria-Project/blob/52e00f8bef430cba25a091f4443345ee1890e6c8/sefaria/model/text_request_adapter.py#L70-L90) evaluates each selector against its own role predicate and optional exact version title. It can return a version with `isPrimary: true` for a `translation|versionTitle` selector when that version is not a source, and it de-duplicates a version selected by both parameters.

On September 3, 2026, the deployed request `Kuzari 1:1?version=primary&version=translation|Yehudah Even Shmuel, 1973` returned `Sefer haKuzari - Project Ben-Yehuda` and `Yehudah Even Shmuel, 1973`. Both versions had `isPrimary: true` and `isSource: false`, with no warnings. `isPrimary` therefore cannot identify one unique side across the complete response. An exact selector must claim its matching version before the opposite bare selector falls back to role flags.

[`text_request_adapter.py:88-92`](https://github.com/Sefaria/Sefaria-Project/blob/52e00f8bef430cba25a091f4443345ee1890e6c8/sefaria/model/text_request_adapter.py#L88-L92) records a missing `(language, versionTitle)` selector only when no version matches it.

[`api/views.py:47-60`](https://github.com/Sefaria/Sefaria-Project/blob/52e00f8bef430cba25a091f4443345ee1890e6c8/api/views.py#L47-L60) converts each missing selector into one warning keyed by its language, or by `language|versionTitle` when the selector carried a version title. The warning describes request selection, not an existing returned version.

The warning key is not the original query value. [`api/views.py:39-45`](https://github.com/Sefaria/Sefaria-Project/blob/52e00f8bef430cba25a091f4443345ee1890e6c8/api/views.py#L39-L45) splits a piped `version` parameter and replaces `_` with a space in the version title before the key is built:

```python
params[1] = params[1].replace('_', ' ')
```

A request for `primary|The_Title` therefore returns the warning key `primary|The Title`. A consumer that matches a warning to its originating selector must apply the same substitution. Exact string equality against the sent value silently fails to match whenever a requested version title contains an underscore.

Sefaria's own reader does not depend on this. It requests the bare `primary` and `translation` selectors, whose keys carry no version title and need no substitution.

### Bilingual layout and alignment

The reader keeps visible languages and bilingual layout as two independent settings. [`ReaderApp.jsx:974-993`](https://github.com/Sefaria/Sefaria-Project/blob/52e00f8bef430cba25a091f4443345ee1890e6c8/static/js/ReaderApp.jsx#L974-L993) defaults `language` to `bilingual` and `biLayout` to `stacked`, and [`LayoutButtons.jsx:36`](https://github.com/Sefaria/Sefaria-Project/blob/52e00f8bef430cba25a091f4443345ee1890e6c8/static/js/LayoutButtons.jsx#L36) writes whichever of the two the current mode owns.

[`ReaderPanel.jsx:637-641`](https://github.com/Sefaria/Sefaria-Project/blob/52e00f8bef430cba25a091f4443345ee1890e6c8/static/js/ReaderPanel.jsx#L637-L641) forces a stacked layout below 500 pixels.

Side-by-side alignment is CSS only. [`s2.css:7056-7110`](https://github.com/Sefaria/Sefaria-Project/blob/52e00f8bef430cba25a091f4443345ee1890e6c8/static/css/s2.css#L7056-L7110) sets each side to half width and floats it, and each segment emits its own clearing element. No script measures or synchronizes the two sides, so unequal lengths need no measurement.

The reader's `heLeft` and `heRight` layout values are labelled in direction terms but implemented as primary-side placement. [`LayoutButtons.jsx:19-31`](https://github.com/Sefaria/Sefaria-Project/blob/52e00f8bef430cba25a091f4443345ee1890e6c8/static/js/LayoutButtons.jsx#L19-L31) treats `heLeft` as primary on the left, while [`constants.js:8-11`](https://github.com/Sefaria/Sefaria-Project/blob/52e00f8bef430cba25a091f4443345ee1890e6c8/static/js/constants.js#L8-L11) labels it as right-to-left text left of left-to-right text. The two agree only when the primary side is right-to-left. This project names the equivalent property by role for that reason.

This evidence supports a text-segment projection that accepts one already-resolved `CoreV3Version`. The bilingual composite owns role resolution, and text segment remains the single owner of segment transformation.

### Current front-end cache

The current front-end text cache grows for the lifetime of the page. It has no eviction and no expiry.

The front end also combines concurrent requests for the same URL.

## Bilingual layout

The measured Sefaria web layout uses neither flex nor grid.

The measured mechanism preserves alignment between unequal Hebrew and English text.

## Linker style isolation

The Linker emits `<style scoped>` at `popup.js:56`.

Current browsers ignore the removed `scoped` attribute. Popup rules and font imports therefore apply to the host page.

Generic selectors can change host elements. Each host also receives imports for Crimson Text, Frank Ruhl Libre, and Heebo.

A shadow root supplies the isolation that the existing markup assumes.

## Linker theme behavior

The popup stylesheet contains fixed foreground and background colors. It has no `prefers-color-scheme` behavior.

A dark host page receives a light popup by default.

Host CSS can override the popup only because the styles leak. This is not a stable theme contract.

## Linker keyboard behavior

The deployed popup:

- sets `role="dialog"`
- moves focus into the popup
- restores focus to the trigger
- closes on Escape
- connects the trigger with `aria-controls`

Its Tab handler calls `preventDefault()` without a new focus target. The handler suppresses Tab instead of cycling focus.

The close control is a `div`. It has no accessible name or keyboard handler.

## Web footnote keyboard behavior

The web reader's `sup.footnote-marker` has a delegated click handler at `TextRange.jsx:229`.

Its style has `:hover` at `s2.css:6551-6559`, but no `:focus`. The marker has no `tabindex`.

## Consumer implementations

Torah Chat teaches reference normalization and URL construction through prompt examples in `src/prompts.ts`.

Its concise-mode handler tells the model not to summarize returned source text in `src/chat-engine.ts`.

These patterns show consumer demand for reference handling and a rendered source surface.

`bisl-torah` has a two-state vowel control and three layout modes. Those choices support separate vocalization controls and an `auto` bilingual layout.

## MCP server observations

At `d409602`, `Sefaria/sefaria-mcp` is a Python and FastMCP service.

The server has approximately 14 tools. It also has SSE routes, OAuth metadata stubs, Prometheus metrics, Docker packaging, and an unpinned FastMCP dependency.

A server copy creates a large maintenance surface.

FastMCP 3.2.4 supports MCP Apps through:

- `@mcp.resource("ui://...")`
- `text/html;profile=mcp-app` resources
- `AppConfig(resourceUri="ui://...")` on tools

This API supports a small additive integration.

## MCP host interaction

A June experiment used LibreChat, a Copilot bridge, and VS Code.

Buttons in the MCP interface window did not work at the end of that experiment. The evidence does not show a component failure.

Host support changes quickly. The Core MCP flow therefore uses a narrow interaction set and names one tested host.

## Connection volume

One measured verse had 957 commentary links.

Rendering every result creates 957 commentary items for this example.
