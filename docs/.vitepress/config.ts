import path from "node:path";

import { defineConfig } from "vitepress";

const repository = "https://github.com/Arithmomaniac/sefaria-web-components";
const branch = "feature/avilevin/frontend-toolkit-alpha";
const repositoryRoot = path.resolve(import.meta.dirname, "..", "..");

export default defineConfig({
  title: "Sefaria Frontend Toolkit",
  description:
    "Development documentation and local examples for the unpublished Sefaria Frontend Toolkit.",
  cleanUrls: false,
  ignoreDeadLinks: [
    /^\/examples\//,
    /^\.\.\/images\/reader-navigation(?:\.html)?$/,
  ],
  lastUpdated: true,
  outDir: path.join(repositoryRoot, "dist", "site"),
  vite: {
    publicDir: path.join(repositoryRoot, "dist", "site-public"),
  },
  themeConfig: {
    nav: [
      { text: "Learn", link: "/learn/01-web-components.md" },
      { text: "Reader", link: "/learn/04-reader.md" },
      { text: "Examples", link: "/examples.md" },
      { text: "Reference", link: "/reference/custom-elements.md" },
    ],
    sidebar: [
      {
        text: "Learn step by step",
        items: [
          {
            text: "1. Web Components and ownership",
            link: "/learn/01-web-components.md",
          },
          {
            text: "2. Render supplied data",
            link: "/learn/02-supplied-data.md",
          },
          {
            text: "3. Load and interact",
            link: "/learn/03-live-data.md",
          },
          { text: "React path", link: "/learn/react.md" },
          { text: "4. Use the Reader", link: "/learn/04-reader.md" },
          {
            text: "5. Customize or go headless",
            link: "/learn/05-customization.md",
          },
          {
            text: "6. Integrate with a host",
            link: "/learn/06-host-integration.md",
          },
        ],
      },
      {
        text: "Reference and contribution",
        items: [
          { text: "Documentation home", link: "/README.md" },
          { text: "Examples", link: "/examples.md" },
          { text: "Development", link: "/development.md" },
          { text: "Design", link: "/design.md" },
          { text: "Component metadata", link: "/reference/custom-elements.md" },
          { text: "Public exports", link: "/reference/public-exports.md" },
        ],
      },
    ],
    editLink: {
      pattern: `${repository}/edit/${branch}/docs/:path`,
      text: "Edit this page on GitHub",
    },
    socialLinks: [{ icon: "github", link: repository }],
    footer: {
      message: "Development preview for private, unpublished toolkit packages.",
      copyright: "GPL-3.0",
    },
  },
});
