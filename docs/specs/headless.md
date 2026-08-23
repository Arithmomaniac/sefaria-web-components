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

The package parses, normalizes, compares, and splits Sefaria references.

```ts
parseRef(ref: string, index: BookIndex): ParsedRef | RefError
makeRef(parsed: ParsedRef): string
normRef(ref: string): string
humanRef(ref: string): string
splitRangingRef(ref: string, index: BookIndex): string[]
refContains(outer: string, inner: string, index: BookIndex): boolean
sectionRef(ref: string, index: BookIndex): string
dafToInt(daf: string): number
```

`normRef` returns a URL form such as `Genesis_1.1`. `humanRef` returns a display
form such as `Genesis 1:1`.

`dafToInt("2a")` returns `3`. Its numbering must stay compatible with Sefaria
reference behavior.

### Book index

The caller supplies a `BookIndex`. The package does not read process-global
state.

The Sefaria front end fills `booksDict` during application startup. This side
effect prevents reuse outside that application.

A consumer can build `BookIndex` from `/api/index/titles`. The package does not
need private data.

### Errors

`parseRef` returns a typed `RefError` for an expected parse failure. It does not
throw for invalid user input.

The error distinguishes these cases:

- an unknown book
- malformed sections
- an unsupported structural shape
- an invalid range
- an invalid daf value

### Required cases

- Unknown books.
- Empty and malformed section strings.
- Ranges in one section.
- Spanning ranges such as `Genesis 1:31-2:3`.
- Daf notation and amud suffixes.
- Complex works with different index and book titles.
- Commentary references of any depth, such as `Rashi on Genesis 1:1:1`.
- The special `Sheet 123` form.
- Containment and section operations on ranged references.

### Acceptance criteria

- Every public function is deterministic.
- No function reads global state.
- URL and human forms round-trip for the supported corpus.
- Range splitting preserves canonical order.
- Compatibility results show structural or code-point differences.
- Known differences do not change the stored baseline without review.

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
```

The default host is `https://www.sefaria.org`. A caller can supply `fetch` for
tests or a non-browser host.

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
  sections: number[];
  toSections: number[];
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
- the compatibility result reports known differences
- a clean checkout passes the complete repository check
- the specification matches the behavior
