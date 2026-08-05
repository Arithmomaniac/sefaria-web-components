## Why

A reader who follows a commentary from a verse usually wants to come back. Movement between texts,
and back again, is what separates a reading surface from a card.

This is the largest stretch goal in the project, and the project can end without it.

## What Changes

- Add movement back and forward through reader history.
- Return reader state to the chat session, so that a reader can carry a position into a question.
- Accept state from the chat session, so that the model can return a reader to a place.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `reader-state`: add history, rather than position alone. Add the rules for restoring a position
  that a host supplied.
- `mcp-app`: add the round trip between widget state and the chat session.

## Impact

- **Scope**: this is the largest stretch goal. Treat every other change as higher priority.
- **Depends on**: `connections-panel` and `reader-state`, which are themselves a stretch goal.
- **Not in scope even here**: a full reading surface, a virtualized text column, and Talmud page
  layout. These stay out of the project.
- **Risk**: the round trip needs host support that this project does not control, and prior work
  found that interactive elements inside a widget did not always work.
