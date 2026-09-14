import { describe, expect, it } from "vitest";

import {
  dispositionFor,
  EXPECTED_BASELINE_TEST_COUNT,
  EXPECTED_PRE_RETIREMENT_SHOWCASE_TEST_COUNT,
  EXPECTED_RETIRED_TEST_COUNT,
} from "../scripts/test-disposition.mjs";

describe("immutable test disposition", () => {
  it("pins the old inventories and explicit retirement count", () => {
    expect(EXPECTED_BASELINE_TEST_COUNT).toBe(73);
    expect(EXPECTED_PRE_RETIREMENT_SHOWCASE_TEST_COUNT).toBe(9);
    expect(EXPECTED_RETIRED_TEST_COUNT).toBe(9);
  });

  it("maps package and example migrations precisely", () => {
    expect(
      dispositionFor("packages/components/src/source-card.test.ts"),
    ).toMatchObject({
      status: "retained",
      destinations: ["packages/web-components/src/source-card.test.ts"],
    });
    expect(
      dispositionFor("demos/explorer/src/source-card/app.browser.test.ts"),
    ).toMatchObject({
      status: "retained",
      destinations: ["examples/explorer/src/source-card/app.browser.test.ts"],
    });
    expect(
      dispositionFor("demos/mcp/scripts/launch-vscode-demo.test.ts"),
    ).toMatchObject({
      status: "retained",
      destinations: ["examples/mcp-app/scripts/launch-vscode-host.test.ts"],
    });
  });

  it("distinguishes replaced teaching behavior from presentation-only retirement", () => {
    expect(
      dispositionFor("demos/showcase/src/factory-binding.browser.test.tsx"),
    ).toMatchObject({
      status: "retained",
      destinations: ["examples/react-vite/src/app.browser.test.tsx"],
    });
    expect(dispositionFor("demos/showcase/loop.test.ts")).toMatchObject({
      status: "retired",
      destinations: [],
    });
    expect(
      dispositionFor("demos/linker/src/detection.test.ts").reason,
    ).toContain("authored anchors");
  });
});
