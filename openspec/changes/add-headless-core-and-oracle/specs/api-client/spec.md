## ADDED Requirements

### Requirement: The client comes from Sefaria's OpenAPI specification

The client SHALL come from the first-party OpenAPI 3.0.2 specification at
`Sefaria-Project/docs/openAPI.json`. The project SHALL NOT hand-write the request and response
types when the specification covers them.

This specification holds 88 schemas and about 58 endpoints, and it powers `developers.sefaria.org`.
Sefaria marks it as work in progress, so the project must test the endpoints that it uses against
live responses.

#### Scenario: Types come from the specification

- **WHEN** a developer builds the client
- **THEN** the request and response types come from `openAPI.json`

#### Scenario: Specification errors are reported

- **WHEN** a live response does not match the specification
- **THEN** the project records the difference and reports it to Sefaria

### Requirement: The client covers a narrow endpoint set

The client SHALL cover these endpoints:

- `/api/v3/texts/{tref}` for text retrieval
- `/api/texts/versions/{index}` for the version list
- `/api/index/titles` for the book list
- `/api/links/{tref}` for links
- `/api/link-summary/{ref}` for grouped link counts
- `/api/bulktext/{refs}` for batched segment retrieval
- `/api/ref/{tref}` for server-side reference validation
- `/api/calendars` for daily and weekly study schedules
- `/api/find-refs` for citation detection

The client SHALL NOT cover the remaining endpoints in the specification.

Four of the eight third-party projects that this research examined call `/api/calendars`. That is
more than call `/api/links`. Daily study is the most common use.

#### Scenario: Covered endpoint

- **WHEN** a caller requests a text by reference
- **THEN** the client calls `/api/v3/texts/{tref}` and returns a typed result

#### Scenario: Book list feeds reference parsing

- **WHEN** a caller needs the book list for `parseRef`
- **THEN** the client supplies it from `/api/index/titles`

### Requirement: The plain text format removes footnote content

The client SHALL document that `return_format=text_only` removes footnote bodies from the response.
The client SHALL report an error when a caller requests plain text and asks to keep footnotes.

Measurement against the live API for `Genesis 18:1` shows this behavior. The default format returns
the footnote marker and the footnote body. The plain text format returns neither. The footnote
content is absent from the response, so no local transform can recover it.

The same measurement shows a second loss. The default format returns `G<small>OD</small>`, which is
how the JPS translation marks the divine name. The plain text format returns `GOD`. This
distinction disappears with no visible sign of loss.

#### Scenario: Plain text with footnotes requested

- **WHEN** a caller requests `return_format=text_only` and asks to keep footnotes
- **THEN** the client reports an error that names the conflict

#### Scenario: Plain text without footnotes

- **WHEN** a caller requests `return_format=text_only` and does not ask for footnotes
- **THEN** the client returns the plain text result

#### Scenario: Default format keeps footnotes

- **WHEN** a caller requests the default format
- **THEN** the response holds the footnote marker and the footnote body

### Requirement: The client caches and coalesces requests

The client SHALL cache responses by request. When two callers request the same resource at the same
time, the client SHALL make one network request.

#### Scenario: Repeated request served from cache

- **WHEN** a caller requests the same reference twice
- **THEN** the client makes one network request

#### Scenario: Concurrent requests coalesce

- **WHEN** two callers request the same reference before the first response arrives
- **THEN** the client makes one network request and gives the result to both callers

### Requirement: The client reports network failures as failures

The client SHALL distinguish a network failure from an empty result.

#### Scenario: Network unavailable

- **WHEN** the network request fails
- **THEN** the client reports a failure that names the cause

#### Scenario: Reference has no links

- **WHEN** the request succeeds and the resource holds no links
- **THEN** the client returns an empty result and reports no failure
