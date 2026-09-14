> Created/edited by GitHub Copilot with human review/feedback by avilevin.

# Component explorer

Run the explorer from the repository root:

```powershell
pnpm --filter @sefaria-example/explorer dev
```

Start with [the authored workbench](authored.html) to inspect deterministic loading, data, partial, empty, error, one-sided, range, selection, and Reader-history states. Its controls update stable query parameters for component, scenario, theme, width, and optional diagnostics; it never requests data.

The live pages require an explicit action and call the public client plus the named async factory. They keep transport errors visible, do not replace failures with fixture success, and pass request-free elements only view models and display properties:

- [Text segment](text-segment.html): `@sefaria/web-components/text-segment`
- [Bilingual segment](bilingual-segment.html): `@sefaria/web-components/bilingual-segment`
- [Reference label](ref-label.html): `@sefaria/web-components/ref-label`
- [Source card](source-card.html): `@sefaria/web-components/source-card`
- [Contextual connections reader](connections.html): source-card and connections-panel factories and events

The connections page is the richest event/request diagnostic host: try source selection, connection navigation, category and page changes, preview toggles, cancellation, and retries while watching the separate text and links counts.
