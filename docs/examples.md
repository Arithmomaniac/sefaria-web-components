> Created/edited by GitHub Copilot; pending human review.

# Interactive examples

These previews are isolated builds of the maintained private examples. They are not alternate implementations inside VitePress. Landing and supplied-data routes are deterministic; live Sefaria requests occur only after an explicit action on a page that offers them.

| Example | Local preview | Maintained source |
| --- | --- | --- |
| Authored component states | [Open preview](/examples/explorer/authored.html) | [`examples/explorer/src/authored`](https://github.com/Arithmomaniac/sefaria-web-components/tree/feature/avilevin/frontend-toolkit-alpha/examples/explorer/src/authored) |
| Live component explorer | [Open preview](/examples/explorer/index.html) | [`examples/explorer`](https://github.com/Arithmomaniac/sefaria-web-components/tree/feature/avilevin/frontend-toolkit-alpha/examples/explorer) |
| Controlled and spatial Reader | [Open preview](/examples/reader/controlled.html?tref=Micah%206%3A8) | [`examples/reader`](https://github.com/Arithmomaniac/sefaria-web-components/tree/feature/avilevin/frontend-toolkit-alpha/examples/reader) |
| Vanilla supplied-data consumer | [Open preview](/examples/vanilla/index.html) | [`examples/vanilla-vite`](https://github.com/Arithmomaniac/sefaria-web-components/tree/feature/avilevin/frontend-toolkit-alpha/examples/vanilla-vite) |
| React consumer | [Open preview](/examples/react/index.html) | [`examples/react-vite`](https://github.com/Arithmomaniac/sefaria-web-components/tree/feature/avilevin/frontend-toolkit-alpha/examples/react-vite) |
| Authored linked article | [Open preview](/examples/linked-article/index.html) | [`examples/linked-article`](https://github.com/Arithmomaniac/sefaria-web-components/tree/feature/avilevin/frontend-toolkit-alpha/examples/linked-article) |
| MCP App fixture preview | [Open preview](/examples/mcp-app/index.html?fixture=1) | [`examples/mcp-app`](https://github.com/Arithmomaniac/sefaria-web-components/tree/feature/avilevin/frontend-toolkit-alpha/examples/mcp-app) |

The MCP fixture route proves deterministic App rendering only. Run `pnpm dev:mcp` for the compiled Node server, separate host and sandbox origins, AppBridge calls, and protocol-level request-count proof.
