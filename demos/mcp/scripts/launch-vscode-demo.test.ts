import { ChildProcess } from "node:child_process";

import { afterEach, expect, it, vi } from "vitest";

afterEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
  vi.doUnmock("node:child_process");
  vi.doUnmock("node:fs/promises");
  vi.doUnmock("./vscode-demo-profile.js");
  vi.doUnmock("./vscode-host-automation.js");
});

it.each(["connection", "workbench"])(
  "cleans up a failed %s launch",
  async (failure) => {
    const child = new ChildProcess();
    const kill = vi.spyOn(child, "kill").mockReturnValue(true);
    const close = vi.fn().mockResolvedValue(undefined);
    const error = new Error(`Failed ${failure}`);
    vi.doMock("node:child_process", () => ({
      spawn: () => {
        queueMicrotask(() => child.emit("spawn"));
        return child;
      },
    }));
    vi.doMock("node:fs/promises", () => ({
      access: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock("./vscode-demo-profile.js", () => ({
      resolveVscodeExecutable: () => "Code",
      resolveVscodeDemoProfile: () => ({}),
      prepareVscodeDemoProfile: vi.fn().mockResolvedValue(undefined),
      createVscodeLaunchArguments: () => [],
      createVscodeEnvironment: () => ({}),
    }));
    vi.doMock("./vscode-host-automation.js", () => ({
      reserveVscodeDebuggingPort: async () => 9229,
      connectToVscode: async () => {
        if (failure === "connection") throw error;
        return { contexts: () => [{}], close };
      },
      findVscodeWorkbench: async () => {
        throw error;
      },
      openVscodeChat: vi.fn(),
      selectExclusiveVscodeChatToolGroup: vi.fn(),
    }));

    await expect(import("./launch-vscode-demo.js")).rejects.toBe(error);

    expect(kill).toHaveBeenCalledOnce();
    expect(close).toHaveBeenCalledTimes(failure === "workbench" ? 1 : 0);
  },
);
