export const BASELINE_TEST_INVENTORY_COMMIT =
  "7bc2d258fac2959beb5252ebdbcbddbaccd0c7b7";
export const PRE_RETIREMENT_SHOWCASE_COMMIT =
  "d7e2d59645ebf7427dcff2cbdd78073e2e7df58c";

const RETIRED = new Map([
  [
    "demos/linker/src/detection.test.ts",
    "Automatic prose detection was superseded by authored anchors; native navigation and popup ownership are retained in the linked-article integration.",
  ],
  [
    "demos/mcp/scripts/vscode-video-recorder.test.ts",
    "Presentation recording mechanics were optional capture tooling, not MCP protocol or host behavior.",
  ],
  ["demos/showcase/loop.test.ts", "Booth-loop timing was presentation-only."],
  [
    "demos/showcase/presentation.test.ts",
    "Reveal deck assembly was presentation-only.",
  ],
  [
    "demos/showcase/scripts/build-pages-plan.test.ts",
    "The retired Pages assembly is not part of the local toolkit site.",
  ],
  [
    "demos/showcase/src/presentation-navigation.browser.test.ts",
    "Reveal navigation and iframe activation were presentation-only.",
  ],
  [
    "demos/showcase/src/presentation-navigation.test.ts",
    "Reveal navigation state was presentation-only.",
  ],
  [
    "demos/showcase/src/viewport-guard.browser.test.ts",
    "Large-slide viewport enforcement was presentation-only; maintained examples have responsive browser coverage.",
  ],
  [
    "demos/showcase/src/viewport-guard.test.ts",
    "Large-slide viewport calculations were presentation-only.",
  ],
]);

const REPLACEMENTS = new Map([
  [
    "demos/linker/src/linker.browser.test.ts",
    ["examples/linked-article/src/app.browser.test.ts"],
  ],
  [
    "demos/mcp/scripts/launch-vscode-demo.test.ts",
    ["examples/mcp-app/scripts/launch-vscode-host.test.ts"],
  ],
  [
    "demos/showcase/src/factory-binding.browser.test.tsx",
    ["examples/react-vite/src/app.browser.test.tsx"],
  ],
  [
    "demos/showcase/src/workspace-preview.browser.test.ts",
    ["examples/reader/src/app.browser.test.ts"],
  ],
]);

export function dispositionFor(baselinePath) {
  const retiredReason = RETIRED.get(baselinePath);
  if (retiredReason !== undefined) {
    return { status: "retired", reason: retiredReason, destinations: [] };
  }
  const replacements = REPLACEMENTS.get(baselinePath);
  if (replacements !== undefined) {
    return {
      status: "retained",
      reason: "Behavior retained in the maintained integration.",
      destinations: replacements,
    };
  }

  const destination = baselinePath
    .replace(/^packages\/components\//u, "packages/web-components/")
    .replace(/^demos\/explorer\//u, "examples/explorer/")
    .replace(/^demos\/reader-workspace\//u, "examples/reader/")
    .replace(/^demos\/mcp\/app\//u, "examples/mcp-app/")
    .replace(/^demos\/mcp\/scripts\//u, "examples/mcp-app/scripts/");
  return {
    status: "retained",
    reason:
      destination === baselinePath
        ? "Test remains at its baseline path."
        : "Test migrated with its maintained package or example.",
    destinations: [destination],
  };
}

export const EXPECTED_BASELINE_TEST_COUNT = 73;
export const EXPECTED_PRE_RETIREMENT_SHOWCASE_TEST_COUNT = 9;
export const EXPECTED_RETIRED_TEST_COUNT = RETIRED.size;
