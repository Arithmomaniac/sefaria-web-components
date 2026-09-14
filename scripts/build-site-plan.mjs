export const EXAMPLE_BUILDS = [
  {
    route: "explorer",
    packageName: "@sefaria-example/explorer",
    pages: [
      "index.html",
      "authored.html",
      "ref-label.html",
      "text-segment.html",
      "bilingual-segment.html",
      "source-card.html",
      "connections.html",
    ],
  },
  {
    route: "reader",
    packageName: "@sefaria-example/reader",
    pages: ["index.html", "controlled.html"],
  },
  {
    route: "vanilla",
    packageName: "@sefaria-example/vanilla-vite",
    pages: ["index.html"],
  },
  {
    route: "react",
    packageName: "@sefaria-example/react-vite",
    pages: ["index.html"],
  },
  {
    route: "linked-article",
    packageName: "@sefaria-example/linked-article",
    pages: ["index.html"],
  },
  {
    route: "mcp-app",
    packageName: "@sefaria-example/mcp-app",
    pages: ["index.html"],
    mcpApp: true,
  },
];

export const SITE_REQUIRED_FILES = [
  "index.html",
  "README.html",
  "learn/01-web-components.html",
  "learn/02-supplied-data.html",
  "learn/03-live-data.html",
  "learn/04-reader.html",
  "learn/05-customization.html",
  "learn/06-host-integration.html",
  "learn/react.html",
  ...EXAMPLE_BUILDS.flatMap(({ route, pages }) =>
    pages.map((page) => `examples/${route}/${page}`),
  ),
];

export function createSiteBuildSteps({ skipTypecheck }) {
  const steps = [];
  if (!skipTypecheck) {
    for (const packageName of [
      "@sefaria/client",
      "@sefaria/text-transform",
      "@sefaria/web-components",
    ]) {
      steps.push({
        kind: "pnpm",
        args: ["--filter", packageName, "build"],
      });
    }
  }
  for (const example of EXAMPLE_BUILDS) {
    if (!skipTypecheck) {
      steps.push({
        kind: "pnpm",
        args: ["--filter", example.packageName, "typecheck"],
      });
    }
    steps.push(
      example.mcpApp
        ? {
            kind: "mcp-app",
            packageName: example.packageName,
            route: example.route,
            build: !skipTypecheck,
          }
        : {
            kind: "vite",
            packageName: example.packageName,
            route: example.route,
          },
    );
  }
  steps.push({ kind: "vitepress" });
  return steps;
}
