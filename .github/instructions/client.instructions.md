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
- Generate the temporary corrected Core document before TypeScript contracts, Zod schemas, or runtime validators.
- Fail the repository check when any generated output is stale.
- Publish corrected generated `paths`, `components`, and operation types directly.
- Publish generated Zod schemas and TypeScript runtime validators for unknown JSON boundaries.
- Validate every JSON response from the public client.
- Reject a contract mismatch with the operation, status, and structured JSON paths.
- Preserve the original `Response` metadata on a contract mismatch.
- Keep the public client as a thin configured `@hey-api/client-fetch` capability used by the generated SDK.
- Accept a configurable base URL and injectable `fetch`.
- Preserve documented HTTP error payloads and Fetch API network or abort failures.
- Add JSDoc to every handwritten exported declaration and every exported interface or class property. Document field meanings, failures, and important behavior at the declaration. Link to the package README for longer explanations.
- Do not add a generalized facade, normalized model, default cache, retry, coalescing, or component method.
- Cover the six Core endpoints from `docs/specs/client.md`.
- Add a correction only after source review or runtime validation identifies a mismatch.
- Use fixed commit-pinned or dated fixtures for contract tests.
- Test corrected schemas against the original Sefaria implementation and upstream endpoint tests.
