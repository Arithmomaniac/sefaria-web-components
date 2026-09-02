> Created/edited by GitHub Copilot; pending human review.

# Review guide

This guide defines review gates for the planned architecture.

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
- [ ] The client has no default cache.
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

- [ ] The private fixture package owns only test requests, view-model oracles, failures, browser scenarios, and harness mechanics.
- [ ] Client payload fixtures are imported only through `@sefaria/client/test-fixtures`.
- [ ] The main client and component entry points export no fixture code.
- [ ] Every deployed payload records its exact URL, capture date, HTTP status, and reduction.
- [ ] Every unknown payload passes the matching generated validator before projection.
- [ ] Contract examples remain outside the deployed fixture manifest and identify their generated schema path.
- [ ] Derived payloads identify the parent payload and exact derivation.
- [ ] Request fixtures contain only generated `path` and applicable `query` fields.
- [ ] A documented error trigger outside a generated request union is marked transport-only and is not presented as a reproducible component request.
- [ ] Projection, documented HTTP error, rejection, and render-only scenarios remain distinct.
- [ ] Partial, empty, error, and rejection examples have executable state distinctions.
- [ ] Committed transformed text agrees with `@sefaria/text-transform` without generating the oracle at test runtime.
- [ ] Each fixture-local view-model type names its production replacement owner.
- [ ] Browser fixtures keep direction in view models and layout or interaction in element properties.
- [ ] Browser containers use 320 or 960 CSS pixels within a 1024 by 768 viewport.
- [ ] Browser measurement waits for the font-ready gate and uses generic local fonts with network access denied.
- [ ] One CSS-pixel tolerance applies only to CSS-controlled geometry; font-dependent geometry uses relational assertions.
- [ ] Blocking assertion identifiers and informational screenshot names remain separate.
- [ ] The component lab imports the single fixture catalog and marks unimplemented components as planned.

## Production component factories

- [ ] Each component subpath owns its request type.
- [ ] Each component subpath owns its view-model union.
- [ ] Each component subpath owns a pure payload factory.
- [ ] Each component subpath owns an async request-and-client factory.
- [ ] The pure factory makes no request and reads no global state.
- [ ] The async factory uses a supplied client.
- [ ] For a captured successful payload, the async result equals the pure result.
- [ ] Missing requested content becomes a component-specific partial or empty state.
- [ ] The factory preserves required direction and attribution.
- [ ] Unsafe HTML passes through `@sefaria/text-transform`.
- [ ] An abort does not become a data state.

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
- [ ] Loading, data, partial, empty, and error states come from the view model.
- [ ] Layout and interaction remain element properties.

## MCP integration

- [ ] `structuredContent` contains a corrected API payload.
- [ ] The App validates the unknown payload with the generated TypeScript validator.
- [ ] The App reports structured paths for invalid payloads.
- [ ] The App calls the same pure factory as client mode.
- [ ] The App supplies only a view model to the element.
- [ ] The first render makes zero requests.
- [ ] The server sends no component HTML.
- [ ] The implementation adds no hydration path.
- [ ] The writer, validator, App, and fixture migrate atomically.
- [ ] Remove the alternate private wire format in that change.
- [ ] No dual-reader compatibility path remains.

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
- [ ] Text includes available attribution.
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

## Final commands

Run the current complete check after code or configuration changes:

```powershell
pnpm check
```

After the OpenAPI workflow exists, the complete check must include the offline generation and stale-output check.

For documentation-only changes, run the repository Prettier command and `git diff --check`.
