# Contributor Instructions

These instructions apply to all repository changes. Read each applicable file in `.github/instructions` before you edit a matching path.

## Architecture status

The specifications define the planned architecture.

Mark every unimplemented contract as planned. Do not describe an unimplemented contract as current behavior.

## Use the correct authority

Use this order:

1. Treat the repository specifications as intended behavior.
2. Inspect the original Sefaria route, handler, response builder, and tests at the pinned commit before an OpenAPI correction.
3. Use the pinned OpenAPI input as the documented-contract evidence.
4. Use deployed fixtures when source does not show runtime payload behavior.
5. Treat the corrected OpenAPI artifact as transport-payload authority.
6. Treat each component view model as rendering-data authority.
7. Use downstream consumers as evidence of need, not behavior authority.

If evidence conflicts with a specification, record the observation in `docs/evidence.md`. Then change the owning specification or reviewed overlay before production code.

Use complete commit SHAs in upstream source links. Refetch mutable sources before you rely on them.

Do not infer an OpenAPI correction from one response sample. Record the pinned route, handler, response builder, upstream tests, and deployed fixture for that correction.

## State high-risk changes before implementation

Before a high-risk contract change, state:

- the source authority
- the data owner
- the exact failure
- one executable counterexample

High-risk changes include public API contracts, OpenAPI corrections, generated output, component view models, unknown JSON, partial data, request ownership, and integration payloads.

## Keep one owner for each concern

- `@sefaria/client` owns the pinned OpenAPI input, checksum, overlay, corrected artifact, generated contracts, public corrected schemas, validators, and thin client.
- `@sefaria/text-transform` owns pure sanitization, vocalization, and footnote operations.
- Non-DOM `@sefaria/components` subpaths own component request types, view models, pure factories, and async factories.
- Component elements own layout, interaction, accessibility, theming, and DOM rendering.
- Integrations own host input, boundary validation, client creation, cancellation, and factory calls.
- Specifications own intended behavior.
- `docs/evidence.md` owns observations and source provenance.

Do not create a generalized domain-model package.

Do not add offline reference parsing without a concrete production consumer and a new design decision.

## Preserve transport semantics

Consume corrected generated API contracts directly.

Keep the public client thin. Do not add a generalized facade, default cache, retries, request coalescing, or component-specific methods.

Preserve `openapi-fetch` and Fetch API semantics. Documented HTTP errors remain typed error payloads.

Do not convert a network failure or abort into a success-shaped object.

Validate unknown JSON at MCP, server, fixture, stored-data, or user-input boundaries. Do not validate every trusted typed client result by default.

Report structured JSON paths before projection.

## Keep elements request-free

An element can accept one component-specific view model and visual or interaction properties.

An element must not accept a reference, raw JSON, generated API payload, client, base URL, host, request parameters, or `fetch`.

An element must not make a request or call an async factory.

If an interaction changes requested data, emit an event. The host calls a factory and supplies a new view model.

## Compose through pure factories

A composite async factory owns its outer request. It calls child pure factories with captured payload data.

Do not call child async factories from a composite.

Ten child views from one response must use one outer request and zero child requests.

For a captured successful payload, an async factory result must equal its pure factory result.

## Handle server-provided data

Server-provided means corrected API-shaped JSON. Validate it and call the same pure factory as client mode.

Do not add component HTML server rendering or hydration.

MCP `structuredContent` carries a corrected API payload.

Replace an alternate private wire format atomically. Do not add a dual-reader period.

## Prove changed behavior

Write a failing test before you change behavior. Add a deterministic test for each named edge case.

Use the intended production path. Do not accept proof from a fallback, cache hit, mock default, or bypass.

Test pure and async factory equivalence with a captured payload.

Test exact request counts. Include the ten-child, one-request composite case.

Test stale generated output and every overlay old-state assertion.

Test each corrected schema against the pinned Sefaria implementation and its upstream tests.

Use realistic Sefaria payload sizes for synchronous code. Add a limit to work that can expand with payload size.

If code or configuration changes, run `pnpm check` before review.

## Put information in one place

- Put normative behavior and acceptance rules in `docs/specs`.
- Put stable ownership and dependency boundaries in `docs/design.md`.
- Put source observations and provenance in `docs/evidence.md`.
- Put setup and current-versus-planned workflows in `docs/development.md`.
- Put review gates in `docs/review.md`.
- Put field-level API definitions in generated declarations.
- Put delivery status in GitHub issues.

Do not duplicate complete generated interfaces in specifications or READMEs.

Do not put a mutable issue or delivery DAG in normative documents.

Do not claim human review unless a person reviewed the content.

## Select review depth

Use normal review for ordinary changes.

Use tri-review for high-risk contracts, OpenAPI overlays, generated artifacts, Unicode behavior, unknown boundaries, or cross-package request ownership.

Use blind review when a finished artifact must work without its development history.
