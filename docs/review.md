> Created/edited by GitHub Copilot with human review/feedback by avilevin.

# Review Guide

Use this guide to select the correct review depth. Apply only the sections that
match the changed code.

## Default review

1. Read the linked issue and specification.
2. Make sure that the change satisfies each acceptance criterion.
3. Read the focused tests.
4. Make sure that package imports obey `docs/design.md`.
5. Make sure that the documentation describes current behavior.
6. If code or configuration changes, run `pnpm check`.

## Headless contract review

- Identify the upstream source for each changed rule.
- Make sure that units and coordinate systems have explicit names.
- Make sure that missing data does not appear as invalid input.
- Make sure that pure-looking methods do not perform network requests.
- Make sure that each public representation has one owner.
- Make sure that each test fails with the previous or known-bad behavior.
- Make sure that each test uses the intended production path.
- Use realistic Sefaria title and corpus sizes for performance checks.

## Component review

- Review Hebrew, English, and bilingual direction.
- Review unequal bilingual text lengths and alignment.
- Make sure that rendered text includes its available attribution.
- Review dangerous URLs and hostile HTML.
- Use the keyboard for each interactive control.
- Review visible focus and focus restoration.
- Review narrow and wide layouts.
- Make sure that the shadow root isolates host styles.
- Use a real browser for these checks.

## Integration review

- Inspect the built artifact.
- Make sure that language-specific implementations use the same JSON contract.
- Make sure that package builds contain all required resources.
- Review offline, rate-limit, retry, and abort behavior.
- Make sure that the integration does not copy an upstream service.
- Make sure that producer and consumer versions can differ safely.

## Escalated review

Use normal review by default.

If a multi-model review tool is available, use it for these changes:

- Public API design.
- Unicode or bidirectional text behavior.
- Sanitization or host-page injection.
- Cache or concurrency behavior.
- Persistent identity.
- Release-critical packaging.

If a fresh-context review tool is available, use it for finished artifacts that
must work without their development history.

Do not require tri-review or blind review for every pull request.

## Review evidence

Record these facts in the pull request:

- The linked issue and specification.
- The primary and secondary Sefaria sources.
- Intentional compatibility differences.
- Focused and complete check results.
- Applicable browser, security, or package review.

Do not record human approval until a person gives that approval.
