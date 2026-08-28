---
description: "Rules for pure text sanitization, vocalization, and footnotes"
applyTo: "packages/text-transform/**,docs/specs/text-processing.md"
---

# Text-processing Instructions

- Keep every public operation deterministic.
- Do not import a client, component element, host API, or browser DOM global.
- Apply vocalization to plain text or parsed text nodes, not raw markup.
- Keep PASEQ behavior explicit in code, tests, and compatibility output.
- Use an explicit HTML allowlist.
- Let options narrow the allowlist, but never expand it.
- Remove active content, event attributes, inline styles, and dangerous URLs.
- Preserve allowed Sefaria text structure and attribution markup.
- Keep footnote marker order stable.
- Do not treat missing footnote bodies as proof that no footnotes exist.
- Include malformed HTML, hostile fragments, and adversarial Unicode tests.
- Report Unicode differences with code points.
