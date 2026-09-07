export const PAGE_DEMOS = [
  ["component-lab", "@sefaria-demo/component-lab"],
  ["ref-label", "@sefaria-demo/ref-label-live-demo"],
  ["text-segment", "@sefaria-demo/text-segment-live-demo"],
  ["bilingual-segment", "@sefaria-demo/bilingual-segment-live-demo"],
  ["source-card", "@sefaria-demo/source-card-live-demo"],
  ["connections", "@sefaria-demo/connections-panel-live-demo"],
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
