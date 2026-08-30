---
description: "Rules for MCP and Linker integrations"
applyTo: "demos/mcp/**,demos/linker-userscript/**,docs/specs/integrations.md"
---

# Integration Instructions

- Integrate through built artifacts and public contracts.
- Do not copy the Sefaria Web application, mobile application, Linker, or MCP server.
- Let integrations accept references, host input, clients, and cancellation controls.
- Call non-DOM component factories outside elements.
- Give elements only view models and visual or interaction properties.
- Put a corrected API payload in MCP `structuredContent`.
- Validate unknown MCP or server JSON with a public corrected `@sefaria/client` schema or generated validator.
- Report structured JSON paths before projection.
- Call the same pure factory in server-provided and client modes.
- Make the first MCP render use zero requests.
- Do not add component HTML server rendering or hydration.
- Replace an alternate private wire format atomically.
- Do not add a dual-reader compatibility path.
- Keep host-page CSS isolated.
- Use explicit origin allowlists and userscript match rules.
- Do not use a match rule for all sites.
- Test real tool, resource, package, host, request-count, and cancellation boundaries.
- Keep fixture data representative, fixed, and source-pinned or dated.
- State host limitations separately from component failures.
