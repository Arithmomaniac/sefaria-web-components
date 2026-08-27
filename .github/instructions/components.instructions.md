---
description: "Rules for Lit components and browser demonstrations"
applyTo: "packages/components/**,demos/component-lab/**,docs/specs/components.md"
---

> Created/edited by GitHub Copilot with human review/feedback by avilevin.

# Component Instructions

- Consume normalized model types. Do not parse API responses in components.
- Use the direction from each version. Do not infer direction from a language
  code.
- Display all available attribution for rendered text.
- Sanitize HTML before insertion into the DOM.
- Use real interactive controls with accessible names.
- Provide visible focus and keyboard operation.
- Use browser tests for structure, direction, focus, layout changes, and CSS
  token inheritance.
- Use screenshots as review evidence, not as the only acceptance gate.
- Give correct text, direction, and attribution priority over pixel parity.
- Add a component-lab state for each important interaction and edge case.
