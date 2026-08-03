## Why

Every client that renders Sefaria text rebuilds the same Hebrew typography work. Research into
eight third-party projects that consume the Sefaria API found eight different implementations of
Hebrew diacritic removal across six codebases. No two are the same. Two of them are in one project.
Sefaria's own web reader, mobile app, and Linker each carry a third, fourth, and fifth variant. The
web and mobile variants disagree on U+05C0 PASEQ. The same verse renders differently on
sefaria.org and in the mobile app today.

A vocalization error or a bidirectional layout error renders as plausible Hebrew. It looks correct.
It survives visual review. For this reason the test harness comes before the components that it
validates, and this change delivers that harness first.

## What Changes

- Add `@sefaria/text-transform`. This package removes Hebrew diacritics, sanitizes HTML fragments,
  and handles footnotes. No DOM access and no network access.
- Add `@sefaria/ref`. This package parses, normalizes, compares, and splits Sefaria reference
  strings. The book list arrives as an injected dependency, not a global.
- Add `@sefaria/client`. Generation comes from Sefaria's first-party OpenAPI 3.0.2 specification at
  `Sefaria-Project/docs/openAPI.json`.
- Add the differential oracle. The harness compares output against sefaria.org character by
  character and publishes a pass rate per component.
- Add the theming token contract. Components emit no color literals. Default values come from
  Sefaria's own light and dark palettes.
- Model diacritic removal as two independent options rather than one three-state mode. Evidence for
  this decision is in `design.md`.

## Capabilities

### New Capabilities

- `text-transform`: Hebrew diacritic removal, HTML sanitization, and footnote handling as pure
  functions.
- `ref-parsing`: Sefaria reference strings parsed, normalized, compared, and split without global
  state.
- `api-client`: A typed, cached client for the small set of Sefaria endpoints that this project
  needs.
- `differential-oracle`: A test harness that compares output against sefaria.org and reports a pass
  rate.
- `theming-tokens`: The CSS custom property contract and its default values for light and dark
  color schemes.

### Modified Capabilities

None. This is the first change in the repository, and `openspec/specs/` is empty.

## Impact

- **New packages**: `packages/text-transform`, `packages/ref`, `packages/client`,
  `packages/tokens`.
- **New tooling**: `tools/oracle`.
- **External dependency**: the live sefaria.org API acts as the oracle. Network failures make the
  oracle unavailable, and the harness must report this state as distinct from a test failure.
- **No DOM code**: this change adds no custom elements. Components arrive in a later change and
  build on these packages.
- **Open questions for Sefaria**: the correct U+05C0 PASEQ behavior, and whether the mobile app
  removes footnotes on purpose.
