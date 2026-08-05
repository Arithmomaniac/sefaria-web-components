## Why

Sefaria publishes a script that turns citations on third-party websites into clickable popups. The
popup that this script produces has three properties that a shadow DOM custom element fixes by
construction.

It writes text into the host page with `.innerHTML` and no sanitization.

It holds its colors as literals in an injected stylesheet. For this reason it cannot follow the
color scheme of the page that hosts it, and `linker.v3` holds no `prefers-color-scheme` rule.

It calls `preventDefault()` on the Tab key, which disables keyboard movement rather than trapping
it. Its close control is a `div` element with no accessible name.

This change rebuilds that popup on the component library. It does not replace the deployed script,
and it asks Sefaria to deploy nothing.

The purpose is demonstration. Encapsulation, theming, and keyboard access are not features that this
project adds one at a time. They follow from the rebuild. The popup is the clearest place to show
that, because the current version lacks all three and the surface is small.

## What Changes

- Add `<sefaria-popup>`, a dialog shell built on `<sefaria-source-card>`.
- Run the demonstration against the existing citation detection endpoint and the existing API, so
  that the comparison is fair.
- Show the rebuilt popup and the current popup side by side under both color schemes.
- Record what the rebuild fixes and what it does not fix.

## Capabilities

### New Capabilities

- `citation-popup`: a dialog that shows a source for a detected citation, with a real focus trap, a
  button element for close, and an accessible name.
- `linker-demo`: the demonstration page that runs the rebuilt popup against real citation detection.

### Modified Capabilities

None.

## Impact

- **Package**: `packages/components`. **Demonstration**: `demos/linker`.
- **Depends on**: `source-card`, and `/api/find-refs` from `api-client`.
- **Scope boundary**: this change produces a demonstration. It does not produce a replacement for
  `linker.js`, and it does not start a migration program for the sites that run the current script.
  The count of those sites is not known. The research that produced the 150 figure records that the
  page holding the list renders on the client, and that only a meta description count was
  recoverable.
- **Note on demand**: no third-party project examined in this research builds a citation popup. This
  element serves Linker sites, not the projects that consume the API directly. This change does not
  claim ecosystem demand for it.
- **Risk**: a fair comparison needs the current popup running on a real page. Its behavior can
  change at any time, because Sefaria deploys it.
