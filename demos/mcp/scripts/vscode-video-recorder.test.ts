import { afterEach, describe, expect, it, vi } from "vitest";

import { createFfmpegConcatManifest } from "./vscode-video-recorder.js";

describe("VS Code video recorder", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.doUnmock("node:fs/promises");
  });

  it("rejects recording without an explicit screenshot destination before launch", async () => {
    vi.stubEnv("VSCODE_MCP_VIDEO", "demo.mp4");
    vi.stubEnv("VSCODE_MCP_SCREENSHOT", undefined);
    vi.stubEnv("VSCODE_MCP_SHOWCASE", undefined);
    const mkdtemp = vi.fn(() => {
      throw new Error(
        "Capture reached the filesystem before validating output.",
      );
    });
    vi.doMock("node:fs/promises", async (importOriginal) => ({
      ...(await importOriginal<typeof FileSystem>()),
      mkdtemp,
    }));

    await expect(import("./capture-vscode-host.js")).rejects.toThrow(
      /VSCODE_MCP_VIDEO requires VSCODE_MCP_SCREENSHOT/,
    );
    expect(mkdtemp).not.toHaveBeenCalled();
  });

  it("preserves screencast timing and repeats the final frame", () => {
    expect(
      createFfmpegConcatManifest([
        { filePath: "C:\\frames\\000001.jpg", timestamp: 10 },
        { filePath: "C:\\frames\\000002.jpg", timestamp: 10.5 },
        { filePath: "C:\\frames\\000003.jpg", timestamp: 12 },
      ]),
    ).toBe(`file 'C:/frames/000001.jpg'
duration 0.500
file 'C:/frames/000002.jpg'
duration 1.500
file 'C:/frames/000003.jpg'
duration 2.000
file 'C:/frames/000003.jpg'
`);
  });
});
import type * as FileSystem from "node:fs/promises";
