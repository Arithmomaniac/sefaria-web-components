## Why

A reader who opens a verse usually wants to know what other writers say about it. The connections
list is how a reader moves from one text to the texts that discuss it.

Source review found this element in four of the eight third-party projects that render Sefaria text.
That is more than the number that build a citation popup, which is zero.

Two findings make this element cheaper than earlier research suggested. The `/api/link-summary`
endpoint returns categories with their counts and per-book counts, so the browser does not load
every link object to show a summary. A live request for `Genesis 1:1` returns 16 categories in
36 KB.

The endpoint does not do all of the work. It keys books by index title, and the reader interface
groups by collective title. Category order depends on the text type. Commentary comes first, and
Targum takes second place. Some commentators appear with a count of zero. These rules stay in the
client.

## What Changes

- Add `<sefaria-connections-panel>`. It shows categories, then books, then segments.
- Use `/api/link-summary` for counts rather than fetching every link.
- Keep navigation state as a stack, so that a reader can return to the previous level.
- Add serializable reader state, so that a host can save and restore the panel position.
- Extend the MCP App, so that the widget becomes navigable within the chat pane.

## Capabilities

### New Capabilities

- `connections-panel`: categories, books, and segments for a reference, with a navigation stack.
- `reader-state`: the position and history of a reader surface, as a value that a host can save and
  restore.

### Modified Capabilities

- `mcp-app`: add requirements for a navigable widget. A widget that only shows one card needs no
  serialization. A widget that moves between texts does need it.

## Impact

- **Scope**: this is a stretch goal. The first change and the primitives do not depend on it.
- **Depends on**: `bilingual-segment`, `api-client`, and `mcp-app`.
- **Open question**: the earlier research observed 957 commentary links for `Genesis 1:1` through
  the interface. The `/api/link-summary` endpoint reports 1400 for the same reference. The cause is
  probably the deduplication rule that the interface applies. This change must resolve the
  difference before either number appears in a document.
- **Risk**: one verse can carry more than 900 commentary links. Long lists need windowing. The
  virtualized text column is out of scope, so this change must solve list length on its own.
