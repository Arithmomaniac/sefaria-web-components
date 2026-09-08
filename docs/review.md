> Created/edited by GitHub Copilot with human review/feedback by avilevin.

# Review guide

This guide defines review gates for the delivered architecture and for planned contracts that have not yet been implemented.

## Authority and status

- [ ] The change names the owning specification.
- [ ] The change marks planned behavior as planned until implementation exists.
- [ ] Upstream source links use complete commit SHAs.
- [ ] Deployed fixtures include a capture date or immutable source.
- [ ] Record each source conflict in `docs/evidence.md`.
- [ ] Generated declarations remain the field-level transport reference.
- [ ] Component view models remain the rendering authority.

## OpenAPI pin and overlay

- [ ] The upstream OpenAPI input comes from an explicit Sefaria commit.
- [ ] Each correction identifies the original Sefaria route, handler, response builder, and upstream tests at that commit.
- [ ] Each source link contains the complete commit SHA.
- [ ] A deployed fixture supplements source evidence when runtime data changes the shape.
- [ ] One live response is not the only correction authority.
- [ ] The committed SHA-256 matches the upstream input bytes.
- [ ] Ordinary generation uses no network.
- [ ] Refresh requires an explicit commit and produces a reviewable diff.
- [ ] Every overlay mutation includes an exact JSON Pointer.
- [ ] Every overlay mutation asserts the old value or expected absence.
- [ ] A changed old value fails at the exact JSON path.
- [ ] The error reports expected and actual state.
- [ ] The overlay contains no environment, time, or network dependency.
- [ ] Each correction has evidence and a focused test.
- [ ] Each corrected schema matches the original handler branches and conditional fields.

Review the initial corrections for:

- [ ] the `/api/texts/versions/{index}` response content key
- [ ] `v3AvailableVersionsTextJson`
- [ ] missing required fields
- [ ] recursive v3 text nesting
- [ ] documented Core error responses
- [ ] `ShapeJSON` property and required-name casing

## Generated contracts

- [ ] Temporary corrected Core generation is deterministic.
- [ ] TypeScript `paths`, `components`, operation types, Zod schemas, and runtime validators come from the same temporary corrected Core document.
- [ ] Generated output identifies its source pin.
- [ ] No handwritten file duplicates a complete generated interface.
- [ ] No generated file has a manual-only edit.
- [ ] Regeneration changes no committed file.
- [ ] The repository check fails after a deliberate stale-output change.

## Thin client

- [ ] The public client uses generated operations directly.
- [ ] The client accepts a configurable base URL.
- [ ] The client accepts an injectable `fetch`.
- [ ] The client has no generalized normalized facade.
- [ ] The client cache is per-client, bounded by TTL, entry count, and retained-body bytes, and can be disabled explicitly.
- [ ] Cache hits pass through the same generated response validation as network responses.
- [ ] Documented errors, legitimate negative results, malformed responses, aborts, polling, and submissions are not cached.
- [ ] The cache has no persistence, cross-client sharing, stale fallback, retry, or request coalescing.
- [ ] The client has no retry policy.
- [ ] The client has no request coalescing.
- [ ] The client has no component-specific method.
- [ ] Documented HTTP errors remain typed error payloads.
- [ ] Every JSON success and error response passes its generated validator.
- [ ] An undocumented status rejects as a contract mismatch.
- [ ] A contract mismatch includes the operation, status, structured paths, and original response metadata.
- [ ] Network failures remain rejected Fetch API operations.
- [ ] Aborts preserve abort semantics.
- [ ] No failure becomes a success-shaped object.

## Unknown-boundary validation

- [ ] Unknown MCP, server, fixture, or stored JSON passes a generated validator.
- [ ] Invalid JSON stops before component projection.
- [ ] Every validation error includes a structured JSON path.
- [ ] A test contains more than one invalid nested field.
- [ ] Client response validation and external-boundary validation use the same generated schemas.
- [ ] HTML sanitization remains separate from JSON schema validation.

## Component factories

- [ ] Each component subpath owns its request type.
- [ ] Each component subpath owns its view-model union.
- [ ] Each component subpath owns a pure payload factory.
- [ ] Each component subpath owns an async request-and-client factory.
- [ ] The pure factory makes no request and reads no global state.
- [ ] The async factory uses a supplied client.
- [ ] For a captured successful payload, the async result equals the pure result.
- [ ] Missing requested content becomes a component-specific partial or empty state.
- [ ] The factory preserves the data owned by its rendering surface; source-card projection preserves edition attribution.
- [ ] Unsafe HTML passes through `@sefaria/text-transform`.
- [ ] An abort does not become a data state.

### Text segment

- [ ] A language-family selector serializes as one `version` value.
- [ ] An exact edition serializes as one `language|versionTitle` value.
- [ ] Every request uses `return_format=default`.
- [ ] Invalid or reserved selectors make zero requests.
- [ ] Invalid or reserved selectors reject both factories with `TypeError`.
- [ ] Language matching does not depend on response order.
- [ ] More than one matching version is a projection error.
- [ ] `projectTextSegmentVersion` projects an already-selected `CoreV3Version` without language-family reselection.
- [ ] Request-based text-segment projection delegates post-selection work to `projectTextSegmentVersion`.
- [ ] Role-based composites resolve sides before they call `projectTextSegmentVersion`.
- [ ] The resolved-version projection owns sanitization, vocalization, footnotes, direction, and language.
- [ ] Request warnings remain with the selector-owning factory or composite.
- [ ] The resolved-version projection does not assign payload warnings to an existing selected version.
- [ ] A composite maps a missing role and its warning without calling the resolved-version projection.
- [ ] Array-valued text is a projection error rather than a first-child fallback.
- [ ] `null`, blank, and sanitized-empty text produce the empty state.
- [ ] Empty states preserve server warning messages.
- [ ] Direction comes from the selected version even when it differs from language expectations.
- [ ] Static footnote markers and available bodies render without adding interaction.
- [ ] A version source becomes a link only after absolute HTTP(S) validation.

### Bilingual segment

- [ ] One request carries both the `primary` and `translation` selectors.
- [ ] Blank references and blank exact version titles make zero requests.
- [ ] Exact selectors claim their matching role version before bare selectors fall back to `isPrimary` and `isSource`.
- [ ] `isPrimary` is not assumed to be unique across versions returned for both selectors.
- [ ] Reversing the payload `versions` array produces an identical view model.
- [ ] A version that fills neither role is dropped.
- [ ] More than one candidate for either role is a projection error.
- [ ] The resolved-version projection is never called for an absent role.
- [ ] Each side's message comes from the warning whose key matches that side's serialized selector.
- [ ] Warning-key matching substitutes a space for each underscore in a requested version title.
- [ ] One absent side gives the partial state; two give the empty state.
- [ ] A child projection error surfaces as a bilingual error rather than an absent side.
- [ ] `contentLanguage`, `layout`, and `sideOrder` remain independent element properties.
- [ ] `sideOrder` applies by role when either side is absent.
- [ ] One visible side uses the full available inline size.
- [ ] `auto` layout responds to container width in both directions without measurement script.
- [ ] Unequal side lengths share a block start without overlap.

### Source card

- [ ] Segment, flat range, spanning range, and nested non-spanning payloads use the same factory and element.
- [ ] A scalar text value produces one item with the root position.
- [ ] Recursive text is flattened from its own shape rather than from `isSpanning`.
- [ ] Primary and translation leaves align by the union of position paths.
- [ ] A one-sided position remains a partial pair instead of being dropped.
- [ ] Empty inner arrays contribute no blank item.
- [ ] Scalar-array disagreement at one path is a projection error.
- [ ] Card items retain positional identity; refs appear only for the reviewed metadata-backed address capability.
- [ ] The payload-derived header makes no second request.
- [ ] An optional host-supplied `RefLabelViewModel` changes only header rendering.
- [ ] A ten-item card uses one outer request and zero child requests.
- [ ] Async and pure factories are equal for the captured payload.
- [ ] The shared pair renderer produces the bilingual element's established layout behavior.
- [ ] Keyed rendering preserves unchanged item DOM across view-model updates.
- [ ] A realistic large payload projects every leaf without truncation or quadratic scanning.

### Source-card selection

- [ ] Selection is opt-in and controlled by positional identity.
- [ ] Scalar, range-start, offset, depth-one, Talmud-prefix, and commentary cases use source-backed address metadata.
- [ ] Empty rows do not renumber later rows or replace the requested first target.
- [ ] Spanning targets expose only the first server-provided context; unsupported nested shapes remain renderable and explicitly nonselectable.
- [ ] Malformed consumed offsets preserve text rendering and report structured paths on an unavailable navigation capability.
- [ ] Every supported item receives a short address label from the same metadata as its canonical target; the element does not parse the ref.
- [ ] Visible primary and translation sides receive Hebrew and English address labels respectively, including conventional Hebrew 15 and 16 forms.
- [ ] Address labels follow stacked and side-by-side pair layout, and hiding them preserves a keyboard-accessible selection control without changing event identity.
- [ ] Host property updates emit no event; user controls emit a composed semantic event.
- [ ] The compact address label remains a real keyboard control, while noninteractive row clicks select without intercepting embedded controls or active text selection.
- [ ] Selection controls remain keyboard operable and `revealSelection()` makes no request.

### Connections panel

- [ ] The request uses `getLinks` with explicit text and sheet settings.
- [ ] All text categories have summaries and reusable detail rendering; sheets are excluded.
- [ ] Counts use unique IDs and do not count expanded anchors as separate connections.
- [ ] Identical duplicate IDs collapse and conflicting duplicate IDs fail projection.
- [ ] Category and entry order is stable across payload order.
- [ ] Each page contains at most 20 entries; out-of-range pages remain explicit.
- [ ] Preview states distinguish available, absent, partial, hidden, and not requested.
- [ ] Connected text is bounded by rendered graphemes with balanced safe HTML.
- [ ] Reported edition/license metadata does not claim unsupported fragment attribution.
- [ ] One page with ten preview entries makes one links request and zero child requests.
- [ ] Category/page/preview-display changes over a captured response make zero requests.
- [ ] Connection, category, page, and preview-request events are composed and keyboard reachable.

## Composite request counts

- [ ] The composite async factory owns the outer request.
- [ ] The composite pure factory calls child pure factories.
- [ ] The composite factory does not call child async factories.
- [ ] Child factories do not read a client.
- [ ] A request spy proves one outer request.
- [ ] The same spy proves zero child requests.
- [ ] A ten-child fixture produces ten child view models from one captured payload.

## Request-free elements

- [ ] The element accepts one component-specific view model.
- [ ] Other element properties are visual or interactive.
- [ ] The element accepts no reference.
- [ ] The element accepts no raw JSON or generated API payload.
- [ ] The element accepts no client, base URL, host, or `fetch`.
- [ ] The element imports no client at runtime.
- [ ] The element calls no async factory.
- [ ] A browser test fails if any request occurs.
- [ ] Every state the component supports comes from the view model.
- [ ] Layout and interaction remain element properties.

## Interaction-triggered data

- [ ] An element emits a semantic composed event for a user action.
- [ ] The event contains no client or raw payload.
- [ ] The host selects the captured-payload, server-provided, client, or unavailable path explicitly.
- [ ] The captured-data owner declares that the payload covers the requested target.
- [ ] An empty pure-factory result does not establish captured-payload coverage.
- [ ] Captured and server-provided data call the pure factory without a request.
- [ ] Client mode supplies loading state and calls one async factory operation.
- [ ] The integration shows missing host capability outside the target element.
- [ ] The integration does not invent an unsupported component state.
- [ ] A newer action aborts the older operation when possible.
- [ ] An obsolete result cannot replace the current view model.
- [ ] The async factory does not own task history, retries, or active selection.
- [ ] Task state and component view-model state do not render the same surface independently.
- [ ] For a component data path, the target element receives loading and terminal view models from the host.

## MCP integration

- [ ] `structuredContent` contains a corrected API payload.
- [ ] Namespaced tool-result metadata contains only fixed operation identity, a documented status, and the exact request reference.
- [ ] Invalid metadata stops before payload validation.
- [ ] The App validates the unknown payload with the generated TypeScript validator.
- [ ] The App reports structured paths for invalid payloads.
- [ ] The App calls the same pure factory as client mode.
- [ ] The App supplies only a view model to the element.
- [ ] The first render makes zero requests.
- [ ] One tool result includes useful text content for hosts without App rendering.
- [ ] The server preserves network and undocumented HTTP failures as tool failures.
- [ ] Automated repository checks mock the server transport and remain offline.
- [ ] The server sends no component HTML.
- [ ] The implementation adds no hydration path.
- [ ] The writer, validator, App, and fixture migrate atomically.
- [ ] Remove the alternate private wire format in that change.
- [ ] No dual-reader compatibility path remains.

## Linker integration

- [ ] The built embed and bookmarklet load the same classic script.
- [ ] Detection makes one POST and bounded GET polls with no tracking metadata.
- [ ] Generic async task output is validated as a find-refs result before use.
- [ ] Existing links, excluded elements, and foreign DOM remain untouched.
- [ ] Inline citation fragments preserve their host elements and listeners.
- [ ] Unicode code-point offsets are converted before DOM ranges are created.
- [ ] Rescan and destroy remove only Linker-owned wrappers and abort stale work.
- [ ] Each popup activation makes one v3 request; the popup element makes none.
- [ ] CSP, mixed-content, CORS, and restricted-page limitations are documented.

## Text processing

- [ ] Vocalization runs on text content, not raw markup.
- [ ] PASEQ behavior is explicit in tests.
- [ ] Sanitization uses an explicit allowlist.
- [ ] Options can narrow but not expand the allowlist.
- [ ] Event attributes, active content, styles, and dangerous URLs do not survive.
- [ ] Footnote extraction preserves marker order.
- [ ] Missing footnote bodies do not appear as a confirmed empty list.
- [ ] Unicode failures report code points.
- [ ] The package imports no client, element, or browser DOM global.

## DOM and accessibility

- [ ] Each public element uses an open shadow root.
- [ ] Components emit no global style.
- [ ] Custom properties use the `--sefaria-*` prefix.
- [ ] Direction comes from view-model data.
- [ ] Text segments contain no repeated edition attribution.
- [ ] A source card renders each visible resolved edition's attribution once outside its item collection.
- [ ] `hideAttributions` defaults to false, and enabling it changes rendering without discarding view-model attribution.
- [ ] A source card links the edition title for a validated HTTP(S) `versionSourceUrl` and keeps other source text inert.
- [ ] The Linker popup displays source-card attribution.
- [ ] Interactive controls use native elements and accessible names.
- [ ] Focus is visible.
- [ ] Modal popups cycle Tab and Shift+Tab.
- [ ] Escape closes a popup and focus returns to the trigger.
- [ ] Events cross the shadow boundary when hosts must handle them.

## Documentation

- [ ] Normative behavior is in `docs/specs`.
- [ ] Stable ownership is in `docs/design.md`.
- [ ] Observations and provenance are in `docs/evidence.md`.
- [ ] Current and planned behavior are distinct.
- [ ] Diagrams identify external payloads, runtime dependencies, type-only dependencies, orchestration, and DOM rendering.
- [ ] Normative documents contain no mutable issue or delivery DAG.
- [ ] No document claims human review without actual review.
- [ ] Markdown prose is not hard-wrapped.
- [ ] Links target current documents.

## TypeScript toolchain

- [ ] `pnpm lint` uses only the explicitly configured native Oxlint rules; it does not inherit new default categories.
- [ ] TypeScript typechecking remains a separate compiler command.
- [ ] The workspace compiler resolves to TypeScript 7.0.2.
- [ ] Only `packages/client` resolves TypeScript 6.0.3 for `@hey-api/openapi-ts`, and its build/typecheck scripts invoke the workspace-root compiler.
- [ ] The API-documentation check removes prior output before declaration emission.
- [ ] The API-documentation check includes handwritten package source and client scripts, excludes generated declarations, and fails on missing expected output.
- [ ] Exported declarations, exported interface properties, and public class properties retain JSDoc in emitted declarations.
- [ ] Compiler-emitted private fields do not require documentation.
- [ ] The toolchain regression tests prove type-import, explicit-`any`, JavaScript undefined-name, duplicate-parameter, and legacy-octal failures.

## Final commands

Run the current complete check after code or configuration changes:

```powershell
pnpm check
```

After the OpenAPI workflow exists, the complete check must include the offline generation and stale-output check.

For documentation-only changes, run the repository Prettier command and `git diff --check`.
