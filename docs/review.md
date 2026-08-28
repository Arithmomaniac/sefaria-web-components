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
- [ ] The committed SHA-256 matches the upstream input bytes.
- [ ] Ordinary generation uses no network.
- [ ] Refresh requires an explicit commit and produces a reviewable diff.
- [ ] Every overlay mutation includes an exact JSON Pointer.
- [ ] Every overlay mutation asserts the old value or expected absence.
- [ ] A changed old value fails at the exact JSON path.
- [ ] The error reports expected and actual state.
- [ ] The overlay contains no environment, time, or network dependency.
- [ ] Each correction has evidence and a focused test.

Review the initial corrections for:

- [ ] the `/api/texts/versions/{index}` response content key
- [ ] `v3AvailableVersionsTextJson`
- [ ] missing required fields
- [ ] recursive v3 text nesting
- [ ] documented Core error responses
- [ ] `ShapeJSON` property and required-name casing

## Generated contracts

- [ ] The corrected OpenAPI artifact is deterministic.
- [ ] TypeScript `paths`, `components`, and operation types come from the corrected artifact.
- [ ] Public corrected JSON Schemas and TypeScript runtime validators come from the corrected artifact.
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
- [ ] Network failures remain rejected Fetch API operations.
- [ ] Aborts preserve abort semantics.
- [ ] No failure becomes a success-shaped object.

## Unknown-boundary validation

- [ ] Unknown MCP, server, fixture, or stored JSON passes a generated validator.
- [ ] Invalid JSON stops before component projection.
- [ ] Every validation error includes a structured JSON path.
- [ ] A test contains more than one invalid nested field.
- [ ] Trusted typed client responses do not receive mandatory duplicate validation.
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
- [ ] The App validates the unknown payload with the public corrected JSON Schema or its generated TypeScript validator.
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
