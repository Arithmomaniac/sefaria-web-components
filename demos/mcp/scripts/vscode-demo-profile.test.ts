import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { afterEach, describe, expect, it } from "vitest";

import {
  clearVscodeDemoRuntimeState,
  createVscodeEnvironment,
  createVscodeLaunchArguments,
  prepareVscodeDemoProfile,
  resolveVscodeDemoProfile,
} from "./vscode-demo-profile.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("VS Code MCP demo profile", () => {
  it("uses one persistent isolated root for user data and extensions", () => {
    const profile = resolveVscodeDemoProfile({
      LOCALAPPDATA: "C:\\Users\\demo\\AppData\\Local",
    });

    expect(profile).toEqual({
      root: path.join("C:\\Users\\demo\\AppData\\Local", "SefariaMcpDemo"),
      userDataDirectory: path.join(
        "C:\\Users\\demo\\AppData\\Local",
        "SefariaMcpDemo",
        "user-data",
      ),
      extensionsDirectory: path.join(
        "C:\\Users\\demo\\AppData\\Local",
        "SefariaMcpDemo",
        "extensions",
      ),
      copilotHomeDirectory: path.join(
        "C:\\Users\\demo\\AppData\\Local",
        "SefariaMcpDemo",
        "copilot-home",
      ),
      sharedDataDirectory: path.join(
        "C:\\Users\\demo\\AppData\\Local",
        "SefariaMcpDemo",
        "shared-data",
      ),
      homeDirectory: path.join(
        "C:\\Users\\demo\\AppData\\Local",
        "SefariaMcpDemo",
        "home",
      ),
    });
  });

  it("writes deterministic settings and an empty user MCP configuration", async () => {
    const root = path.join(
      tmpdir(),
      `sefaria-vscode-profile-${crypto.randomUUID()}`,
    );
    roots.push(root);
    const profile = resolveVscodeDemoProfile({
      VSCODE_MCP_PROFILE_ROOT: root,
    });

    const workspace = "C:\\workspace";
    await prepareVscodeDemoProfile(profile, workspace);

    const settings = JSON.parse(
      await readFile(
        path.join(profile.userDataDirectory, "User", "settings.json"),
        "utf8",
      ),
    ) as Record<string, unknown>;
    const mcp = JSON.parse(
      await readFile(
        path.join(profile.userDataDirectory, "User", "mcp.json"),
        "utf8",
      ),
    ) as Record<string, unknown>;
    const copilotMcp = JSON.parse(
      await readFile(
        path.join(profile.copilotHomeDirectory, "mcp-config.json"),
        "utf8",
      ),
    ) as Record<string, unknown>;
    const permissions = JSON.parse(
      await readFile(
        path.join(profile.copilotHomeDirectory, "permissions-config.json"),
        "utf8",
      ),
    ) as Record<string, unknown>;

    expect(settings).toMatchObject({
      "chat.mcp.apps.enabled": true,
      "chat.mcp.gallery.enabled": false,
      "chat.plugins.enabled": false,
      "chat.promptFilesRecommendations": {
        "sefaria-mcp-reader": true,
      },
      "chat.stickyScroll.enabled": false,
      "chat.viewSessions.enabled": false,
      "extensions.autoUpdate": "off",
      "extensions.ignoreRecommendations": true,
      "update.mode": "none",
      "window.commandCenter": false,
      "window.zoomLevel": 1,
      "workbench.activityBar.location": "hidden",
      "workbench.colorTheme": "Default Light Modern",
      "workbench.startupEditor": "none",
    });
    expect(settings["chat.mcp.discovery.enabled"]).toEqual({
      "claude-desktop": false,
      windsurf: false,
      "cursor-global": false,
      "cursor-workspace": false,
    });
    expect(mcp).toEqual({ servers: {} });
    expect(copilotMcp).toEqual({ mcpServers: {} });
    expect(permissions).toEqual({
      locations: {
        [workspace]: {
          tool_approvals: [
            {
              kind: "mcp",
              serverName: "sefaria-components-demo",
            },
          ],
        },
      },
    });
  });

  it("launches with the isolated user data, extensions, and workspace", () => {
    const root = path.resolve("demo-profile");
    const workspace = path.resolve("workspace");
    const prompt = path.resolve(".github/prompts/sefaria-mcp-reader.prompt.md");
    const profile = resolveVscodeDemoProfile({
      VSCODE_MCP_PROFILE_ROOT: root,
    });

    expect(
      createVscodeLaunchArguments(profile, workspace, {
        debuggingPort: 9333,
        files: [prompt],
        wait: true,
      }),
    ).toEqual([
      "--new-window",
      "--wait",
      "--disable-workspace-trust",
      "--sync=off",
      "--enable-smoke-test-driver",
      "--remote-debugging-port=9333",
      `--user-data-dir=${profile.userDataDirectory}`,
      `--extensions-dir=${profile.extensionsDirectory}`,
      `--shared-data-dir=${profile.sharedDataDirectory}`,
      workspace,
      prompt,
    ]);

    expect(
      createVscodeLaunchArguments(profile, workspace, { wait: true }),
    ).not.toContain("--enable-smoke-test-driver");
  });

  it("isolates Agent Host configuration through COPILOT_HOME", () => {
    const root = path.resolve("demo-profile");
    const profile = resolveVscodeDemoProfile({
      VSCODE_MCP_PROFILE_ROOT: root,
    });

    expect(
      createVscodeEnvironment(profile, {
        ELECTRON_RUN_AS_NODE: "1",
        PATH: "C:\\tools",
        COPILOT_HOME: "C:\\Users\\demo\\.copilot",
        VSCODE_APPDATA: "C:\\wrong",
        VSCODE_PORTABLE: "C:\\wrong-portable",
      }),
    ).toEqual({
      PATH: "C:\\tools",
      COPILOT_HOME: profile.copilotHomeDirectory,
      HOME: profile.homeDirectory,
      USERPROFILE: profile.homeDirectory,
    });
  });

  it("clears MCP and chat runtime state without removing other global state", async () => {
    const root = path.join(
      tmpdir(),
      `sefaria-vscode-profile-${crypto.randomUUID()}`,
    );
    roots.push(root);
    const profile = resolveVscodeDemoProfile({
      VSCODE_MCP_PROFILE_ROOT: root,
    });
    const globalStorage = path.join(
      profile.userDataDirectory,
      "User",
      "globalStorage",
    );
    const workspaceStorage = path.join(
      profile.userDataDirectory,
      "User",
      "workspaceStorage",
    );
    await Promise.all([
      mkdir(globalStorage, { recursive: true }),
      mkdir(workspaceStorage, { recursive: true }),
    ]);
    await Promise.all([
      writeFile(path.join(globalStorage, "agent-host.db"), "stale", "utf8"),
      writeFile(path.join(workspaceStorage, "chat.json"), "stale", "utf8"),
    ]);
    const database = new DatabaseSync(path.join(globalStorage, "state.vscdb"));
    database.exec(
      "CREATE TABLE ItemTable (key TEXT PRIMARY KEY NOT NULL, value BLOB)",
    );
    const insert = database.prepare(
      "INSERT INTO ItemTable (key, value) VALUES (?, ?)",
    );
    insert.run("mcpToolCache", "stale");
    insert.run("mcpInputs", "stale");
    insert.run("authentication", "keep");
    database.close();

    await clearVscodeDemoRuntimeState(profile);

    const updated = new DatabaseSync(path.join(globalStorage, "state.vscdb"), {
      readOnly: true,
    });
    expect(
      updated.prepare("SELECT key FROM ItemTable ORDER BY key").all(),
    ).toEqual([{ key: "authentication" }]);
    updated.close();
    await expect(
      readFile(path.join(globalStorage, "agent-host.db"), "utf8"),
    ).rejects.toMatchObject({ code: "ENOENT" });
    await expect(
      readFile(path.join(workspaceStorage, "chat.json"), "utf8"),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("clears a fresh profile before VS Code creates its state database", async () => {
    const root = path.join(
      tmpdir(),
      `sefaria-vscode-profile-${crypto.randomUUID()}`,
    );
    roots.push(root);
    const profile = resolveVscodeDemoProfile({
      VSCODE_MCP_PROFILE_ROOT: root,
    });
    await prepareVscodeDemoProfile(profile, "C:\\workspace");

    await expect(clearVscodeDemoRuntimeState(profile)).resolves.toBeUndefined();
  });

  it("clears a profile whose state database has no ItemTable yet", async () => {
    const root = path.join(
      tmpdir(),
      `sefaria-vscode-profile-${crypto.randomUUID()}`,
    );
    roots.push(root);
    const profile = resolveVscodeDemoProfile({
      VSCODE_MCP_PROFILE_ROOT: root,
    });
    const globalStorage = path.join(
      profile.userDataDirectory,
      "User",
      "globalStorage",
    );
    await mkdir(globalStorage, { recursive: true });
    new DatabaseSync(path.join(globalStorage, "state.vscdb")).close();

    await expect(clearVscodeDemoRuntimeState(profile)).resolves.toBeUndefined();
  });
});
