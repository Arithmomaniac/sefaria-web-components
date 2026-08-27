---
description: "Rules for repository documentation"
applyTo: "**/*.md"
---

> Created/edited by GitHub Copilot with human review/feedback by avilevin.

# Documentation Instructions

- Put normative behavior in `docs/specs`.
- Put stable ownership and dependency rules in `docs/design.md`.
- Put observed behavior and source links in `docs/evidence.md`.
- Put concepts, diagrams, examples, and usage in package READMEs.
- Define Sefaria terms before you use them, or link to the package definition.
- Use commit-pinned links for upstream source code.
- Mark behavior as current, planned, observed, or proposed.
- Do not duplicate a complete public interface in a specification and a package
  README.
- Make sure that diagrams distinguish implemented paths from planned paths.
- Do not claim human review unless a person reviewed the content.
