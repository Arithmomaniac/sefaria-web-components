---
description: "Rules for the corrected OpenAPI supply chain and thin client"
applyTo: "packages/client/**,docs/specs/client.md"
---

# Client Instructions

- Pin the upstream OpenAPI input to a complete Sefaria commit SHA.
- Commit a checksum for the exact upstream input bytes.
- Inspect the original route, handler, response builder, and tests at the pinned Sefaria commit before each correction.
- Record commit-pinned source links and a deployed fixture for each correction.
- Do not use one live response as the only correction authority.
- Keep ordinary generation offline from committed inputs.
- Make refresh an explicit network operation with an explicit commit.
- Make every overlay mutation assert its old value or expected absence at an exact JSON Pointer.
- Stop at the first stale assertion and report its path, expected state, and actual state.
- Generate the corrected OpenAPI artifact before TypeScript contracts, corrected public schemas, or runtime validators.
- Fail the repository check when any generated output is stale.
- Publish corrected generated `paths`, `components`, and operation types directly.
- Publish language-neutral corrected JSON Schemas and TypeScript runtime validators for unknown JSON boundaries.
- Do not require duplicate validation for trusted typed client responses.
- Keep the public client as a thin `openapi-fetch` wrapper.
- Accept a configurable base URL and injectable `fetch`.
- Preserve documented HTTP error payloads and Fetch API network or abort failures.
- Do not add a generalized facade, normalized model, default cache, retry, coalescing, or component method.
- Cover the six Core endpoints from `docs/specs/client.md`.
- Use fixed commit-pinned or dated fixtures for contract tests.
- Test corrected schemas against the original Sefaria implementation and upstream endpoint tests.
