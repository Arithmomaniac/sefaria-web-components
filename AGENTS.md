> Created/edited by GitHub Copilot with human review/feedback by avilevin.

# Contributor Instructions

These instructions apply to all repository changes. Read the instructions for
each changed path in `.github/instructions`.

## Use the correct authority

1. Treat the repository specifications as the intended behavior.
2. Use Sefaria Web as the primary implementation source.
3. Use Sefaria Mobile as the secondary implementation source.
4. Use Python and server behavior when the clients omit required behavior.
5. Use a targeted live API request to make sure that deployed behavior agrees.
6. Use downstream consumers as evidence of need, not as behavior authority.

If a source conflicts with a specification, resolve the contract before you
change production code. Record the source difference in `docs/evidence.md`.

Use commit-pinned links for upstream source evidence. Refetch mutable issues,
branches, and APIs before you rely on them.

## Classify each port

Classify Sefaria-derived behavior before you select its package:

| Source behavior                       | Repository treatment                                            |
| ------------------------------------- | --------------------------------------------------------------- |
| Pure helper                           | Port the behavior and add characterization tests                |
| Global-state helper                   | Inject the minimum immutable data                               |
| Cache-derived or API-derived behavior | Put the request and cache in `@sefaria/client`                  |
| DOM behavior                          | Put the behavior in a component and use browser tests           |
| Server or database behavior           | Use explicit remote resolution or define a bounded local subset |

Do not recreate hidden application state in a new abstraction. Do not add a
handoff type without a concrete producer and consumer.

## Keep one owner for each concern

- `@sefaria/ref` owns pure reference contracts and local operations.
- `@sefaria/model` owns normalized public data.
- `@sefaria/client` owns HTTP requests and remote caches.
- `@sefaria/text-transform` owns pure text changes.
- The component package owns DOM behavior.
- The integration packages consume built artifacts and public contracts.

A lower layer must not import a higher layer. A local-looking method must not
perform a hidden network request.

## Prove changed behavior

Write a failing test before you change behavior. Add a deterministic test for
each named edge case.

Make sure that each test uses the intended production path. Do not accept proof
from a fallback, cache hit, mock default, or bypass.

Add a test that fails with the previous or known-bad behavior. Use realistic
Sefaria data sizes for synchronous code.

Add a limit to operations that can expand with data size. Run focused checks
during development.

If code or configuration changes, run `pnpm check` before review.

## Put information in one place

- Specifications contain normative behavior and acceptance criteria.
- Package READMEs contain concepts, diagrams, examples, and usage.
- `docs/design.md` contains stable ownership and dependency boundaries.
- `docs/evidence.md` contains observations and source provenance.
- GitHub issues and the Project contain delivery status.
- JSDoc contains public field meanings, units, failures, and important
  differences.

Mark planned APIs as planned. Do not claim human review unless a person reviewed
the content.

## Select the review depth

Use normal review for ordinary changes.

If the tool is available, use tri-review for high-risk contracts, Unicode
behavior, security boundaries, caches, or package artifacts.

If the tool is available, use blind review when a finished artifact must work
without its development history.
