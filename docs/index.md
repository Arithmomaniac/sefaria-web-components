---
layout: home
title: Sefaria Frontend Toolkit

hero:
  name: Sefaria Frontend Toolkit
  text: Build Jewish text and learning experiences without rebuilding the reading UI
  tagline: Sefaria supplies a free digital library and APIs. This private development preview supplies reusable Reader behavior, browser-standard components, and headless tools.
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
    details: Bind the supplied controller to the controlled Reader. You do not need to implement its navigation before showing a useful result.
  - title: Choose the depth you need
    details: Use the Reader, smaller Web Components from vanilla JavaScript or React, or only the client, factories, and text transforms.
  - title: Keep data access explicit
    details: Elements display view models and emit events. The host chooses direct client access, supplied data, or host-mediated tools such as MCP.
---

> Created/edited by GitHub Copilot; pending human review.

## Development preview

Sefaria provides the text library and data source. This toolkit provides reusable frontend building blocks for developers creating niche interfaces and digital Jewish learning experiences; it is not a migration of or replacement for Sefaria's own website. This local site is an additional view of the repository's maintained Markdown and examples. The [repository documentation home](README.md) remains the best GitHub-native index, and the [root README](https://github.com/Arithmomaniac/sefaria-web-components/blob/feature/avilevin/frontend-toolkit-alpha/README.md) remains the short first-run entry point.

Run `pnpm dev:site` for a local development server or `pnpm build:site` followed by `pnpm preview:site` for the production artifact. Neither command deploys a site.
