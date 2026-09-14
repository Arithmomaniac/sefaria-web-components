import { expect, it } from "vitest";

import {
  createVscodeLaunchArguments,
  resolveVscodeDemoProfile,
} from "./vscode-demo-profile.js";

it("keeps launch-only free of CDP and smoke-test switches", () => {
  const profile = resolveVscodeDemoProfile({
    VSCODE_MCP_PROFILE_ROOT: "C:\\isolated profile",
  });
  const arguments_ = createVscodeLaunchArguments(
    profile,
    "C:\\workspace with spaces",
  );

  expect(arguments_).not.toContain("--enable-smoke-test-driver");
  expect(arguments_.some((value) => value.includes("remote-debugging"))).toBe(
    false,
  );
  expect(arguments_.at(-1)).toBe("C:\\workspace with spaces");
});
