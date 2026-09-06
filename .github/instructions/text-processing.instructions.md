---
description: "Rules for pure text sanitization, vocalization, and footnotes"
applyTo: "packages/text-transform/**,docs/specs/text-processing.md"
---

> Created/edited by GitHub Copilot; pending human review.

# Text-processing Instructions

- Start with the [markup guide](../../docs/guides/text-markup.md) and [upstream documentation coverage](../../docs/evidence.md#upstream-documentation-coverage). Reuse the existing tag taxonomy and source/fixture evidence; investigate a named gap rather than repeating the markup audit.
- Sefaria's documented tag support is not this package's sanitizer policy. Preserve the [local contract](../../docs/specs/text-processing.md) and distinguish documented upstream concepts from additional observations and intentional local differences.
- Keep every public operation deterministic.
- Do not import a client, component element, host API, or browser DOM global.
- Apply vocalization to plain text or parsed text nodes, not raw markup.
- Keep PASEQ behavior explicit in code, tests, and compatibility output.
- Use an explicit HTML allowlist.
- Let options narrow the allowlist, but never expand it.
- Remove active content, event attributes, inline styles, and dangerous URLs.
- Preserve allowed Sefaria text structure and attribution markup.
- Keep footnote marker order stable.
- Add JSDoc to every handwritten exported declaration and every exported interface or class property. Document security boundaries, failures, units, and representation differences at the declaration. Link to the package README for algorithm details.
- Do not treat missing footnote bodies as proof that no footnotes exist.
- Include malformed HTML, hostile fragments, and adversarial Unicode tests.
- Report Unicode differences with code points.
