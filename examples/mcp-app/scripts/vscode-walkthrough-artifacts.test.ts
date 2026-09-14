import { describe, expect, it } from "vitest";

import {
  maintainedCapturePath,
  obsoleteCapturePaths,
} from "./vscode-walkthrough-artifacts.js";

describe("VS Code walkthrough artifacts", () => {
  it("maintains only the initial, hierarchy, and chat-export screenshots", () => {
    const initial = "C:\\captures\\mcp-reader.png";

    expect(maintainedCapturePath("reader-initial", initial)).toBe(initial);
    expect(maintainedCapturePath("reader-hierarchy", initial)).toBe(
      "C:\\captures\\mcp-reader-reader-hierarchy.png",
    );
    expect(maintainedCapturePath("chat-export", initial)).toBe(
      "C:\\captures\\mcp-reader-chat-export.png",
    );
    expect(maintainedCapturePath("connections", initial)).toBeUndefined();
    expect(
      maintainedCapturePath("reader-breadcrumb-root", initial),
    ).toBeUndefined();
    expect(obsoleteCapturePaths(initial)).toEqual([
      "C:\\captures\\mcp-reader-connections.png",
      "C:\\captures\\mcp-reader-category.png",
      "C:\\captures\\mcp-reader-page-2.png",
      "C:\\captures\\mcp-reader-connected-source.png",
      "C:\\captures\\mcp-reader-breadcrumb-middle.png",
      "C:\\captures\\mcp-reader-breadcrumb-root.png",
    ]);
  });
});
