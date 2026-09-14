# Sefaria Frontend Toolkit integration handoff

**Status:** Maintained bootstrap handoff for the unpublished toolkit integration branch. This document supersedes the historical transfer-first plan preserved in the session archive; it does not authorize repository transfer, publication, Pages deployment, or a default-branch change.

## Bootstrap objective

Keep `main` as the existing website and deployment source while establishing `feature/avilevin/frontend-toolkit-alpha` as a protected, CI-only integration target for later unpublished toolkit work.

The bootstrap PR changes only branch workflow policy, its executable regression test, and directly related guidance. It does not rename packages, move demos, replace runtime implementations, publish packages, create releases or tags, or change repository settings.

## Current branch policy

- Toolkit implementation PRs target `feature/avilevin/frontend-toolkit-alpha`, never `main`.
- The branch workflow validates pull requests targeting `main` or the toolkit branch and pushes to the toolkit branch.
- The workflow has one stable required `check` job with read-only default repository permissions.
- The workflow does not deploy GitHub Pages, upload a Pages artifact, publish packages, create releases, request OIDC credentials, or respond to tags or manual dispatch.
- The existing `main` workflow and main-only Pages environment remain independent and unchanged.

The policy regression is `tests/workflow-policy.test.ts`. It covers supported pull-request and push refs, rejects tags and manual dispatch, rejects deployment/publication permissions and actions, and prevents a conditional workflow from hiding the required check.

## Later implementation boundaries

Subsequent PRs may establish package artifacts, examples, and documentation/site work only after this integration branch is merged and its protection is verified. All packages and examples remain private until a separately approved release plan exists. Any public-contract or cross-package change must follow the applicable specification, evidence, and review gate.

## Immutable historical archive

The pre-bootstrap source and presentation surfaces are recoverable from [`7bc2d258fac2959beb5252ebdbcbddbaccd0c7b7`](https://github.com/Arithmomaniac/sefaria-web-components/tree/7bc2d258fac2959beb5252ebdbcbddbaccd0c7b7), including the historical [`demos/linker`](https://github.com/Arithmomaniac/sefaria-web-components/tree/7bc2d258fac2959beb5252ebdbcbddbaccd0c7b7/demos/linker), [`demos/mcp`](https://github.com/Arithmomaniac/sefaria-web-components/tree/7bc2d258fac2959beb5252ebdbcbddbaccd0c7b7/demos/mcp), [`demos/showcase`](https://github.com/Arithmomaniac/sefaria-web-components/tree/7bc2d258fac2959beb5252ebdbcbddbaccd0c7b7/demos/showcase), and [historical documentation](https://github.com/Arithmomaniac/sefaria-web-components/tree/7bc2d258fac2959beb5252ebdbcbddbaccd0c7b7/docs).

These links are historical provenance, not current implementation instructions. The current documentation index, development guide, specifications, evidence record, and review guide remain authoritative.

## Deferred work

Repository transfer or rename, official Sefaria identity and policy changes, package publication, trusted publishing, release environments, public GitHub releases, Pages cutover, CDN distribution, framework wrappers, SSR/hydration, generalized domain models, retries, request coalescing, and public MCP hosting remain deferred. Do not describe deferred work as current behavior.
