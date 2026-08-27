---
description: "Rules for MCP and Linker integrations"
applyTo: "demos/mcp/**,demos/linker-userscript/**,docs/specs/services.md"
---

> Created/edited by GitHub Copilot with human review/feedback by avilevin.

# Integration Instructions

- Integrate through built artifacts and JSON contracts.
- Do not copy the Sefaria Web application or MCP server.
- Make sure that built wheels and packages contain their required resources.
- Keep host-page CSS isolated.
- Use explicit origin allowlists and userscript match rules.
- Do not use a match rule for all sites.
- Test the real tool, resource, package, and host boundaries.
- Keep fixture data representative and fixed.
- State host limitations separately from component failures.
