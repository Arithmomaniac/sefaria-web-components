export const PAGE_DEMOS = [
  ["explorer", "@sefaria-demo/explorer"],
  ["reader-workspace", "@sefaria-demo/reader-workspace"],
];

export const LEGACY_DEMO_REDIRECTS = [
  ["component-lab", "authored.html"],
  ["ref-label", "ref-label.html"],
  ["text-segment", "text-segment.html"],
  ["bilingual-segment", "bilingual-segment.html"],
  ["source-card", "source-card.html"],
  ["connections", "connections.html"],
];

export function createBuildCommands({ linkerUrl, skipTypecheck }) {
  const command = (packageName, buildArgs, bundleArgs, environment = {}) => ({
    args: [
      "--filter",
      packageName,
      ...(skipTypecheck ? ["exec", ...bundleArgs] : ["build", ...buildArgs]),
    ],
    environment,
  });

  return [
    command("@sefaria-demo/showcase", [], ["vite", "build"]),
    ...PAGE_DEMOS.map(([, packageName]) =>
      command(packageName, ["--base=./"], ["vite", "build", "--base=./"]),
    ),
    command("@sefaria-demo/linker", [], ["node", "build.mjs"], {
      SEFARIA_LINKER_ARTIFACT_URL: linkerUrl,
    }),
  ];
}
