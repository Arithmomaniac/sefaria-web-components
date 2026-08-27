---
description: "Rules for headless packages and compatibility tests"
applyTo: "packages/ref/**,packages/client/**,packages/model/**,packages/text-transform/**,tests/compatibility/**,docs/specs/headless.md"
---

> Created/edited by GitHub Copilot with human review/feedback by avilevin.

# Headless Instructions

- Keep `@sefaria/ref`, `@sefaria/model`, and `@sefaria/text-transform` free of
  DOM and network APIs.
- Put all HTTP requests in `@sefaria/client`.
- Keep pure functions independent of client caches.
- Keep display labels separate from comparison coordinates.
- Distinguish malformed input, missing local data, and remote-required behavior.
- Read Sefaria Web first. Then read Sefaria Mobile and the applicable server
  code.
- Put broad corpus qualification in issue #14.
- Use generated raw API types only at the client boundary.
- Keep normalized public types small and stable.
- Use production-scale title counts in synchronous performance tests.
- Use adversarial Unicode and malformed HTML in applicable tests.
