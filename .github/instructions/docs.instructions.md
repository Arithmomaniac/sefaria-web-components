---
description: "Rules for repository documentation"
applyTo: "**/*.md"
---

> Created/edited by GitHub Copilot; pending human review.

# Documentation Instructions

- Put normative behavior and acceptance rules in `docs/specs`.
- Put stable ownership and dependency rules in `docs/design.md`.
- Put observed behavior and source provenance in `docs/evidence.md`.
- Put current and planned workflows in `docs/development.md`.
- Put review gates in `docs/review.md`.
- Use complete commit SHAs for upstream source links.
- Check current upstream documentation before claiming a behavior is undocumented. Record the reviewed page, date, and scope in `docs/evidence.md`; absence from a limited review is not proof of absence.
- Present our guides as explanations of upstream concepts plus local handling, not as discoveries of concepts already documented by Sefaria. Preserve historical provenance when later documentation changes a coverage assessment.
- Mark behavior as current, planned, observed, or superseded.
- Treat corrected generated declarations as the field-level API reference.
- Do not duplicate complete generated interfaces in specifications or READMEs.
- Make component view models the rendering-data authority.
- Make diagrams identify external payloads, runtime dependencies, type-only dependencies, factory orchestration, and DOM rendering.
- Distinguish current implementation paths from planned paths.
- Do not put a mutable issue or delivery DAG in normative documents.
- Link only to current documents.
- Keep prose paragraphs on one source line.
- Do not claim human review unless a person reviewed the content.
