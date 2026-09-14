export const PAGE_DEMOS = [
  ["explorer", "@sefaria-example/explorer"],
  ["reader-workspace", "@sefaria-example/reader"],
  ["linker", "@sefaria-example/linked-article"],
];

export const LEGACY_DEMO_REDIRECTS = [
  ["component-lab", "authored.html"],
  ["ref-label", "ref-label.html"],
  ["text-segment", "text-segment.html"],
  ["bilingual-segment", "bilingual-segment.html"],
  ["source-card", "source-card.html"],
  ["connections", "connections.html"],
];

export function createBuildCommands({ skipTypecheck }) {
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
  ];
}
