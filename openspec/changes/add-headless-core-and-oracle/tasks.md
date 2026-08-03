## 1. Repository setup

- [ ] 1.1 Create the workspace layout with `packages/`, `tools/`, and `demos/`.
- [ ] 1.2 Add TypeScript, the test runner, and the linter.
- [ ] 1.3 Add a lint rule that rejects color literals in component styles.
- [ ] 1.4 Add the build and test scripts to the root package file.
- [ ] 1.5 Add continuous integration that runs the build, the linter, and the tests.

## 2. Reference parsing

- [ ] 2.1 Create the `packages/ref` package.
- [ ] 2.2 Write failing tests for every scenario in the `ref-parsing` spec.
- [ ] 2.3 Implement `parseRef`. Accept the book list as an argument.
- [ ] 2.4 Implement the URL form and the display form.
- [ ] 2.5 Implement `splitRangingRef`.
- [ ] 2.6 Implement Talmud page conversion for numeric comparison.
- [ ] 2.7 Implement `refContains`.
- [ ] 2.8 Make sure that no function reads a global object.

## 3. API client

- [ ] 3.1 Create the `packages/client` package.
- [ ] 3.2 Download `openAPI.json` from `Sefaria-Project` and record the commit.
- [ ] 3.3 Prune the specification to the nine endpoints in the `api-client` spec.
- [ ] 3.4 Generate the request and response types from the pruned specification.
- [ ] 3.5 Test each of the nine endpoints against a live response.
- [ ] 3.6 If a live response differs from the specification, record the difference for Sefaria.
- [ ] 3.7 Implement the response cache.
- [ ] 3.8 Implement request coalescing for concurrent identical requests.
- [ ] 3.9 Implement the error for plain text format with footnotes requested.
- [ ] 3.10 Make sure that a network failure reports differently from an empty result.
- [ ] 3.11 Supply the book list from `/api/index/titles` to the reference parser.

## 4. Differential oracle

- [ ] 4.1 Create the `tools/oracle` package.
- [ ] 4.2 Build the corpus. Sample across Tanakh, Mishnah, Talmud, commentary, poetry, and footnotes.
- [ ] 4.3 Record the reference and the category for each corpus entry.
- [ ] 4.4 Implement retrieval of expected results from sefaria.org.
- [ ] 4.5 Cache expected results on disk so that repeated runs need no network.
- [ ] 4.6 Implement character level comparison.
- [ ] 4.7 Implement code point level failure reporting. Name the code point, its position, and both values.
- [ ] 4.8 Implement the known divergence list. Hold marked cases out of the pass rate.
- [ ] 4.9 Mark the PASEQ cases as known divergences.
- [ ] 4.10 Implement pass rate output for each validated package.
- [ ] 4.11 Report an unavailable state when the site is unreachable.
- [ ] 4.12 Record which layers the oracle does not cover.
- [ ] 4.13 Make sure that the harness accepts output from an implementation outside this project.

## 5. Text transform

- [ ] 5.1 Create the `packages/text-transform` package.
- [ ] 5.2 Write failing tests for every scenario in the `text-transform` spec.
- [ ] 5.3 Implement diacritic removal with two independent options.
- [ ] 5.4 Implement the PASEQ option. Default to `after-space`.
- [ ] 5.5 Implement the compatibility helper for Sefaria's three mode names.
- [ ] 5.6 Test the helper output against each matching Sefaria implementation.
- [ ] 5.7 Implement `sanitize` with the element and attribute allowlist.
- [ ] 5.8 Test sanitization against nested markup and unbalanced markup.
- [ ] 5.9 Implement the three footnote options.
- [ ] 5.10 Make sure that diacritic removal runs on text content, not on raw markup.
- [ ] 5.11 Make sure that no function accesses the DOM or the network.
- [ ] 5.12 Run the oracle against this package and record the pass rate.

## 6. Theming tokens

- [ ] 6.1 Create the `packages/tokens` directory. Do not add a published package.
- [ ] 6.2 Extract the light palette values from `ThemeWhite.js`.
- [ ] 6.3 Extract the dark palette values from `ThemeBlack.js`.
- [ ] 6.4 Write the stylesheet that holds the nine tokens and their defaults.
- [ ] 6.5 Resolve the defaults through `prefers-color-scheme`.
- [ ] 6.6 Record the Sefaria palette entry that each default comes from.
- [ ] 6.7 Write the mapping guide for a host with its own design system.

## 7. Publication and handover

- [ ] 7.1 Publish the pass rate for each validated package in the repository.
- [ ] 7.2 Write the list of differences between the OpenAPI specification and live responses.
- [ ] 7.3 Write the question to Sefaria about the plain text format and footnote loss.
- [ ] 7.4 Write the question to Sefaria about the correct PASEQ behavior.
- [ ] 7.5 Resolve the difference between the 957 and 1400 link counts for `Genesis 1:1`.
- [ ] 7.6 Update the repository readme to match the delivered scope.
