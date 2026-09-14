---
layout: home
title: Sefaria Frontend Toolkit

hero:
  name: Sefaria Frontend Toolkit
  text: Compose reading experiences from validated data and request-free components
  tagline: Development preview for private, unpublished packages. Run the complete examples locally; no deployment or registry release is implied.
  actions:
    - theme: brand
      text: Learn step by step
      link: /learn/01-web-components.md
    - theme: alt
      text: Use the Reader
      link: /learn/04-reader.md
    - theme: alt
      text: Browse examples
      link: /examples.md

features:
  - title: Start with a complete surface
    details: Use the controlled Reader when its navigation model fits. Choose lower-level components only when your host needs to own more composition.
  - title: Keep requests in the host
    details: Clients and async factories load data. Pure factories project supplied payloads. Elements receive view models and never fetch.
  - title: Use the same maintained examples
    details: The site embeds isolated builds of the repository's vanilla, React, Reader, explorer, article, and MCP examples.
---

> Created/edited by GitHub Copilot; pending human review.

## Development preview

This local site is an additional view of the repository's maintained Markdown and examples. The [repository documentation home](README.md) remains the best GitHub-native index, and the [root README](https://github.com/Arithmomaniac/sefaria-web-components/blob/feature/avilevin/frontend-toolkit-alpha/README.md) remains the short first-run entry point.

Run `pnpm dev:site` for a local development server or `pnpm build:site` followed by `pnpm preview:site` for the production artifact. Neither command deploys a site.
