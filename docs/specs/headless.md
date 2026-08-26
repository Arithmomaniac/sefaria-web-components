> Created/edited by GitHub Copilot with human review/feedback by avilevin.

# Headless API and data

This specification defines the packages that work without the component library.
These packages are Core scope.

The specification covers:

- `@sefaria/ref`
- `@sefaria/client`
- `@sefaria/model`
- `@sefaria/text-transform`
- the differential compatibility harness

The model, reference, and transform packages do not use the DOM. Only the client
package makes network requests.

## `@sefaria/ref`

### Responsibility

The package parses, formats, compares, and splits Sefaria references without
network access or process-global state.

The caller supplies immutable title and schema data as a selected `BookIndex`.
Absence from that snapshot does not prove that a title is globally invalid.

The [package guide](../../packages/ref/README.md) defines Sefaria Index and
schema-node vocabulary, explains the flattened data model, and provides diagrams
and examples. Exported TypeScript declarations are the canonical field-level API
reference.

```ts
parseRef(ref: string, index: BookIndex): ParsedRef | RefError
makeRef(parsed: ParsedRef): string
normRef(ref: string, index: BookIndex): string | RefError
humanRef(parsed: ParsedRef): string
splitLocalRange(parsed: ParsedRef): readonly ParsedRef[] | RefError
refContains(outer: ParsedRef, inner: ParsedRef): boolean
sectionRef(parsed: ParsedRef): ParsedRef
dafToInt(daf: string): number | RefError
```

`parseRef` is the structured local resolver. `normRef` is a convenience
equivalent to successful `parseRef` followed by `makeRef`.

`makeRef` and `humanRef` format an existing `ParsedRef` as URL and display
strings such as `Genesis.1.1` and `Genesis 1:1`.

`ParsedRef` preserves display labels and separate one-based comparison
coordinates. `dafToInt` retains the zero-based web/mobile contract: `1a` returns
`0`, `2a` returns `2`, and `2b` returns `3`.

### Supported grammar

Core supports:

- canonical English titles
- caller-supplied aliases, including Unicode title strings
- integer-like section labels
- Talmud daf and amud labels
- flattened primary-schema complex leaves
- abbreviated ranges within one schema node
- `Sheet N`, where `N` is a positive sheet ID

Core does not support Hebrew section numerals, alternate structures, Year or
Folio addresses, virtual nodes, dictionary nodes, or cross-node ranges.

`Sheet N` support applies only to parsing and formatting. Sheet content, models,
and rendering remain outside this project's scope.

### Errors

`RefError` is one actionable union:

- `invalid-input` means the syntax is definitely malformed.
- `local-data` means the selected `BookIndex` lacks or contains invalid
  metadata.
- `remote-required` means the input needs grammar or shape data from the client.

No function throws for expected invalid input. No operation returns a
success-shaped fallback, empty list, or partial range when required data is
missing.

### Containment and sections

`refContains` consumes validated refs and compares canonical node ancestry and
one-based coordinates.

A less-specific coordinate prefix contains deeper refs in the same node
hierarchy. Sibling nodes and unrelated books do not contain one another.

Missing node ancestry returns `missing-hierarchy`. The function does not claim
topology-based equality between a section and its complete segment range.

`sectionRef` returns a structured ref with the terminal address level removed. A
section-level input remains unchanged.

### Compatibility with Sefaria clients

Ordinary canonical refs, URL and human formatting, and same-parent ranges follow
Sefaria Web behavior.

The portable contract intentionally differs in these cases:

- An alias resolves to the canonical title supplied by `BookIndex`. Sefaria Web
  can preserve the matched alias.
- Invalid normalization returns a typed error. Sefaria Web can return a fallback
  string with spaces replaced by underscores.
- `splitLocalRange` returns structured refs rather than display strings.
- A cross-parent terminal range returns `remote-shape-required`. Sefaria Web can
  silently return only its first non-spanning part when cached text is absent.
- Daf range expansion preserves every amud in order.
- Containment is structural. The package does not claim Python's database-backed
  equality between a section and its complete segment range.
- Section refs come from schema depth rather than cached API data or string
  truncation.
- Malformed separators, unsupported address systems, and ranges above the
  expansion limit return typed errors rather than best-effort results.

These differences favor explicit failure over plausible incomplete output. The
future remote `client.resolveRef` operation is the authoritative path for valid
Sefaria grammar outside the local subset.

### Local range splitting

`splitLocalRange` preserves the addressed depth for ranges decidable from their
endpoints.

An arithmetic expansion contains at most 10,000 refs. A larger range returns
`range-too-large`.

| Input class                 | Example            | Local result               |
| --------------------------- | ------------------ | -------------------------- |
| Non-range                   | `Genesis 1:1`      | One ref at the input depth |
| Same-parent terminal range  | `Genesis 1:1-3`    | Segment refs               |
| Same-depth section range    | `Genesis 1-2`      | Section refs               |
| Same-depth daf range        | `Shabbat 15a-16b`  | Daf refs                   |
| Cross-parent terminal range | `Genesis 1:31-2:3` | `remote-shape-required`    |

Complete cross-parent expansion belongs to `client.expandRef`, backed by
`/api/shape/{title}` rather than a text request.

### Required cases

- Unknown books.
- Empty and malformed section strings.
- Known aliases with missing node metadata.
- Ranges in one section.
- Spanning ranges such as `Genesis 1:31-2:3`.
- Section-level ranges such as `Genesis 1-2`.
- Daf notation and amud suffixes.
- Complex works with different index and book titles.
- Commentary references of any depth, such as `Rashi on Genesis 1:1:1`.
- The special `Sheet 123` form.
- Containment and section operations on ranged references.
- Selected snapshots with absent and unloaded titles.
- Cross-parent ranges that require remote shape.

### Acceptance criteria

- Every public function is deterministic.
- No function reads global state.
- No function makes a network request.
- URL and human forms round-trip for the supported corpus.
- Local parsing proves structural validity, not text existence.
- Range splitting preserves canonical order.
- Local range splitting never returns a partial success.
- Targeted pinned fixtures record each intentional difference from web, mobile,
  or server behavior.

## `@sefaria/client`

### Responsibility

The package wraps the public Sefaria API. It returns normalized data and
distinguishes request failures.

```ts
createClient(options: {
  host?: string;
  cache?: CacheAdapter;
  fetch?: typeof fetch;
}): SefariaClient

client.getText(ref: string, options?: {
  versions?: VersionSelector[];
  fillInMissingSegments?: boolean;
  returnFormat?:
    | "default"
    | "text_only"
    | "strip_only_footnotes"
    | "wrap_all_entities";
}): Promise<TextResponse>

client.getVersions(ref: string): Promise<VersionMetadata[]>
client.getLinks(ref: string): Promise<LinkRef[]>
client.resolveRef(ref: string): Promise<ParsedRef>
client.getBookIndex(indexTitle: string): Promise<BookIndex>
client.getBookIndexForRef(ref: string): Promise<BookIndex>
client.getBookIndexes(indexTitles: readonly string[]): Promise<BookIndex>
client.getRefShape(indexTitle: string): Promise<RefShape>
client.expandRef(ref: string): Promise<readonly ParsedRef[]>
```

The default host is `https://www.sefaria.org`. A caller can supply `fetch` for
tests or a non-browser host.

`resolveRef` uses `/api/ref/{tref}`. It converts the server response into the
semantic `ParsedRef` shape.

`resolveRef` does not call `parseRef` first. Local and remote resolution remain
explicit operations.

### Reference metadata and shape

`getBookIndex` fetches `/api/v2/index/{title}` and adapts one canonical Index,
its title variants, primary schema nodes, address types, and ancestry into an
immutable selected `BookIndex`.

`getBookIndexForRef` explicitly composes `resolveRef` and `getBookIndex`.
`getBookIndexes` fetches only caller-selected Index titles and returns one
combined snapshot. The client does not implicitly fetch the whole library.

`getRefShape` fetches `/api/shape/{title}`. `expandRef` combines canonical
resolution with cached shape data to enumerate concrete refs without fetching
text.

Reference resolution, BookIndex metadata, shape, and text use separate cache
keys. None of these methods silently falls back to a different endpoint.

### API version

The client uses `/api/v3/texts` as its primary text endpoint.

The legacy response uses parallel Hebrew and English fields. It can hold only
one version for each side.

The field pairs are:

- `versionTitle` and `heVersionTitle`
- `license` and `heLicense`
- `formatEnAsPoetry` and `formatHeAsPoetry`

The poetry pair does not use the same naming pattern as the other pairs.

The v3 response uses a `versions[]` array. Each item has uniform metadata and an
explicit direction.

Generate raw response types from Sefaria's `docs/openAPI.json`. Prune the raw
types during public type creation.

Contract tests compare the OpenAPI document with deployed behavior. They report
each difference.

### Return formats

`return_format=text_only` loses information. It removes footnote content and not
only the footnote tags.

The format also changes typographic content. For example, `G<small>OD</small>`
becomes `GOD`.

A request that needs footnotes must use structured HTML. The client must not
claim that a removed footnote is available.

The normalized request metadata includes the selected format. A component can
then reject an impossible footnote option.

### Cache

The default cache is a bounded least-recently-used cache. A caller can supply a
different `CacheAdapter`.

Long-lived embeds must not use an unbounded text cache. Concurrent identical
requests share one in-flight promise.

A successful request writes one cache entry. A failed request does not create a
success-shaped cache entry.

### Failures

The client keeps these outcomes separate:

- an invalid reference
- a missing text
- partial language availability
- a network failure
- a rate limit
- an aborted request

The client does not retry without a report. A retry policy reports each attempt
and the final failure.

### Required cases

- A source version with no translation.
- A translation with partial attribution.
- A spanning reference.
- An empty API result.
- Concurrent identical calls.
- Cache eviction.
- Offline and intermittent network behavior.
- Aborted requests.
- Each supported `returnFormat` value.

### Acceptance criteria

- The public response uses normalized model types.
- The package performs no rendering.
- The default cache has a tested bound.
- Identical concurrent calls use one network request.
- Invalid refs, missing refs, and network failures stay distinct.
- Contract tests report each OpenAPI mismatch.
- Tests do not depend on an unreported live-response change.

## `@sefaria/model`

### Core types

```ts
interface Segment {
  ref: string;
  text: string;
  lang: string;
  direction: "ltr" | "rtl";
  versionTitle: string;
}

interface Version {
  versionTitle: string;
  language: string;
  actualLanguage?: string;
  languageFamilyName?: string;
  direction: "ltr" | "rtl";
  isSource?: boolean;
  isPrimary?: boolean;
  license?: string;
  versionSource?: string;
  versionUrl?: string;
  versionNotes?: string;
  digitizedBySefaria?: boolean;
  shortVersionTitle?: string;
  formatAsPoetry?: boolean;
  hasManuallyWrappedRefs?: boolean;
}

interface LinkRef {
  ref: string;
  heRef?: string;
  category?: string;
  commentator?: string;
  order?: number;
  sourceHasEn?: boolean;
}

interface TextResponse {
  ref: string;
  heRef?: string;
  sections: string[];
  toSections: string[];
  sectionRef?: string;
  next?: string;
  prev?: string;
  isSpanning: boolean;
  versions: Version[];
}
```

Raw generated types can contain more fields. Public normalized types stay small
and stable.

### Source-card data

`@sefaria/model` owns the normalized source-card contract.

```ts
interface SourceCardTextBlock {
  content: string;
  language: string;
  direction: "ltr" | "rtl";
  versionTitle: string;
  shortVersionTitle?: string;
  license?: string;
  versionSource?: string;
  versionUrl?: string;
  versionNotes?: string;
  digitizedBySefaria?: boolean;
}

interface SourceCardSegment {
  ref: string;
  source?: SourceCardTextBlock;
  translations: SourceCardTextBlock[];
}

interface SourceCardData {
  ref: string;
  heRef?: string;
  segments: SourceCardSegment[];
}
```

The language-neutral schema is
`packages/model/contracts/source-card.schema.json`. Browser and Python
integrations use the same schema.

### Direction

Direction belongs to each version. A client must not infer direction from a
language code.

This rule supports transliteration and languages with a different script
direction.

### Attribution

The normalizer preserves all available attribution.

Attribution includes:

- `versionTitle`
- `shortVersionTitle`
- `license`
- `versionSource`
- `versionUrl`
- `versionNotes`
- `digitizedBySefaria`

A component that renders text also renders its available attribution. Core
components do not have an attribution-suppression option.

### Required cases

- Missing and partial version metadata.
- More than two versions.
- Complex text structures.
- Spanning references.
- One-language responses.
- A version with an unexpected direction.

### Acceptance criteria

- Normalizers do not fetch or render.
- Normalization preserves available attribution.
- Direction comes from version data.
- Unknown raw fields do not corrupt known fields.
- Invalid required fields produce a typed error.
- The TypeScript guard and JSON Schema accept the same contract.

## Vocalization

### Contract

```ts
type VocalizationMode = "taamim_and_nikkud" | "nikkud" | "none";

applyVocalization(
  text: string,
  mode: VocalizationMode,
  options?: {
    paseq?: "always" | "after-space";
  },
): string
```

Each named mode is a preset over separate taamim and nikkud controls. Internal
code keeps the controls separate.

This model supports Sefaria's three-state ladder and simpler two-state vowel
controls.

### PASEQ

The web reader and Linker always remove U+05C0 PASEQ. The mobile code removes
PASEQ only after whitespace. It also removes that whitespace.

The package exposes both behaviors. The provisional default is `after-space`.

The compatibility report identifies this default as a known difference until
Sefaria identifies canonical behavior.

### Required cases

- Empty text.
- Text with no Hebrew.
- Each named mode.
- PASEQ with and without preceding whitespace.
- Combining marks in an unexpected order.
- Text that is already unpointed.
- Hebrew with English, punctuation, and numbers.

Apply the transform to parsed text nodes. Do not apply it to raw markup because
the transform can corrupt attributes.

### Acceptance criteria

- The function is deterministic and has no global state.
- Each mode removes only its specified code-point classes.
- PASEQ behavior is explicit.
- Difference reports show Unicode code points.

## Sanitization

### Contract

```ts
sanitize(
  html: string,
  options?: {
    allowFootnotes?: boolean;
    allowRefLinks?: boolean;
    allowNamedEntities?: boolean;
  },
): string
```

### Allowlist

Allow these elements:

`b`, `strong`, `i`, `em`, `big`, `small`, `sup`, `br`, `span`, and `a`.

Allow `class` only for fixed Sefaria markup classes. Allow only the required
`data-*` attributes.

Remove:

- `style`
- every `on*` event attribute
- scripts and active content
- disallowed elements and attributes
- links outside approved Sefaria origins

An option can remove footnotes, reference links, or named-entity markup. An
option cannot expand the base trust boundary.

### Required cases

- Unbalanced tags.
- Nested real-text markup, such as `b` inside `big`.
- Entity-encoded Hebrew.
- Empty content spans.
- Poetry spans.
- Paragraph-marker spans.
- Dangerous URLs.
- Event handlers and inline styles.

### Acceptance criteria

- Sanitization uses an explicit allowlist.
- The same input and options produce the same output.
- Dangerous attributes do not survive.
- Allowed text and structural spans survive.
- Tests include malformed and hostile fragments.

## Footnotes

### Contract

```ts
extractFootnotes(html: string): {
  body: string;
  notes: Array<{
    id: string;
    marker: string;
    content: string;
  }>;
}
```

`body` keeps markers and removes note bodies. `notes` contains the separated
note content.

The component presentation values are:

```text
hidden | inline | end | none
```

`hidden` keeps accessible note data without visible note bodies. `none` removes
the note presentation after an explicit caller choice.

### Fetch coupling

Footnote presentation depends on the fetch format.

`text_only` and the mobile `stripItags` path remove note bodies before
rendering. A caller cannot request `inline` or `end` after that loss.

The owning component reports this configuration error. It does not show an empty
note list without an explanation.

### Interaction

An interactive marker is a real button. The button has an accessible name,
visible focus, and keyboard activation.

### Required cases

- Nested markup inside a note.
- Several notes in one segment.
- Letter and non-numeric markers.
- The `endFootnote` variant.
- Notes on one side of a bilingual pair.
- Missing note bodies.

### Acceptance criteria

- The body and notes preserve allowed markup.
- Marker order is stable.
- IDs are unique in one rendered range.
- Invalid format and presentation combinations produce a clear error.
- Keyboard tests cover each interactive marker.

## Compatibility harness

The differential harness lives in `tests/compatibility`. It compares portable
behavior with current Sefaria behavior.

The harness is test infrastructure. It is not a product package.

Build the harness before the components that depend on its results.

### Corpus

The corpus samples behavior categories instead of one large book.

It includes:

- Tanakh with full cantillation
- Mishnah
- Talmud and daf notation
- commentary with nested references
- poetry
- spanning references
- bilingual and one-language responses
- text with footnotes
- PASEQ examples
- complex works

A small diverse corpus gives more information than many similar verses.

### Comparison

Compare pure transforms character by character.

A failure report includes:

- the input reference
- expected and actual text
- the first different index
- Unicode code points near each difference
- the tested mode and options

Report an unavailable source separately from a failed comparison.

Cache expected responses for repeatable runs. A baseline refresh uses an
explicit command and a reviewable diff.

### Pass rates

Publish a numeric pass rate for each capability in the compatibility report.
Publish a component result for weaker evidence too.

Known intentional differences do not count as passes or failures. Report them
separately and remove them from the denominator.

### Headless completion

The completion requirements for a headless Core capability are:

- its public contract is implemented
- each named edge case has a test
- targeted pinned fixtures report known differences
- a clean checkout passes the complete repository check
- the specification matches the behavior

The representative compatibility report belongs to the later compatibility task.
An implementation issue does not depend on that report to close.
