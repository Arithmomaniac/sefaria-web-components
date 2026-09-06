import { access, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

export interface VscodeDemoProfile {
  readonly root: string;
  readonly userDataDirectory: string;
  readonly extensionsDirectory: string;
  readonly copilotHomeDirectory: string;
  readonly sharedDataDirectory: string;
  readonly homeDirectory: string;
}

interface VscodeLaunchOptions {
  readonly debuggingPort?: number;
  readonly wait?: boolean;
}

const settings = {
  "chat.mcp.apps.enabled": true,
  "chat.mcp.discovery.enabled": {
    "claude-desktop": false,
    windsurf: false,
    "cursor-global": false,
    "cursor-workspace": false,
  },
  "chat.mcp.gallery.enabled": false,
  "chat.plugins.enabled": false,
  "extensions.autoCheckUpdates": false,
  "extensions.autoUpdate": "off",
  "extensions.ignoreRecommendations": true,
  "telemetry.telemetryLevel": "off",
  "update.mode": "none",
  "window.restoreWindows": "none",
  "workbench.startupEditor": "none",
} as const;

export function resolveVscodeDemoProfile(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): VscodeDemoProfile {
  const explicitUserData = environment.VSCODE_USER_DATA_DIR;
  const root =
    environment.VSCODE_MCP_PROFILE_ROOT ??
    (explicitUserData === undefined
      ? path.join(
          environment.LOCALAPPDATA ??
            path.join(os.homedir(), ".local", "share"),
          "SefariaMcpDemo",
        )
      : path.dirname(explicitUserData));

  return {
    root,
    userDataDirectory: explicitUserData ?? path.join(root, "user-data"),
    extensionsDirectory:
      environment.VSCODE_EXTENSIONS_DIR ?? path.join(root, "extensions"),
    copilotHomeDirectory: path.join(root, "copilot-home"),
    sharedDataDirectory: path.join(root, "shared-data"),
    homeDirectory: path.join(root, "home"),
  };
}

export async function prepareVscodeDemoProfile(
  profile: VscodeDemoProfile,
  workspace: string,
): Promise<void> {
  const userDirectory = path.join(profile.userDataDirectory, "User");
  await Promise.all([
    mkdir(userDirectory, { recursive: true }),
    mkdir(profile.extensionsDirectory, { recursive: true }),
    mkdir(profile.copilotHomeDirectory, { recursive: true }),
    mkdir(profile.sharedDataDirectory, { recursive: true }),
    mkdir(profile.homeDirectory, { recursive: true }),
  ]);
  await Promise.all([
    writeFile(
      path.join(userDirectory, "settings.json"),
      `${JSON.stringify(settings, null, 2)}\n`,
      "utf8",
    ),
    writeFile(
      path.join(userDirectory, "mcp.json"),
      `${JSON.stringify({ servers: {} }, null, 2)}\n`,
      "utf8",
    ),
    writeFile(
      path.join(profile.copilotHomeDirectory, "mcp-config.json"),
      `${JSON.stringify({ mcpServers: {} }, null, 2)}\n`,
      "utf8",
    ),
    writeFile(
      path.join(profile.copilotHomeDirectory, "permissions-config.json"),
      `${JSON.stringify(
        {
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
        },
        null,
        2,
      )}\n`,
      "utf8",
    ),
  ]);
}

export function createVscodeEnvironment(
  profile: VscodeDemoProfile,
  environment: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  const isolatedEnvironment: NodeJS.ProcessEnv = {
    ...environment,
    COPILOT_HOME: profile.copilotHomeDirectory,
    HOME: profile.homeDirectory,
    USERPROFILE: profile.homeDirectory,
  };
  delete isolatedEnvironment.VSCODE_APPDATA;
  delete isolatedEnvironment.VSCODE_PORTABLE;
  delete isolatedEnvironment.ELECTRON_RUN_AS_NODE;
  return isolatedEnvironment;
}

export async function clearVscodeDemoRuntimeState(
  profile: VscodeDemoProfile,
): Promise<void> {
  const userDirectory = path.join(profile.userDataDirectory, "User");
  const globalStorageDirectory = path.join(userDirectory, "globalStorage");
  await Promise.all([
    rm(path.join(userDirectory, "workspaceStorage"), {
      recursive: true,
      force: true,
    }),
    rm(path.join(globalStorageDirectory, "agent-host.db"), { force: true }),
    rm(path.join(globalStorageDirectory, "agent-host.db-shm"), { force: true }),
    rm(path.join(globalStorageDirectory, "agent-host.db-wal"), { force: true }),
    rm(path.join(globalStorageDirectory, "agent-host-config.json"), {
      force: true,
    }),
  ]);

  const stateDatabasePath = path.join(globalStorageDirectory, "state.vscdb");
  try {
    await access(stateDatabasePath);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return;
    }
    throw error;
  }

  const database = new DatabaseSync(stateDatabasePath);
  try {
    const itemTable = database
      .prepare(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'ItemTable'",
      )
      .get();
    if (itemTable !== undefined) {
      database
        .prepare(
          "DELETE FROM ItemTable WHERE key IN ('mcpInputs', 'mcpToolCache')",
        )
        .run();
    }
  } finally {
    database.close();
  }
}

export function createVscodeLaunchArguments(
  profile: VscodeDemoProfile,
  workspace: string,
  options: VscodeLaunchOptions = {},
): string[] {
  const arguments_ = ["--new-window"];
  if (options.wait === true) {
    arguments_.push("--wait");
  }
  arguments_.push("--disable-workspace-trust");
  arguments_.push("--sync=off");
  if (options.debuggingPort !== undefined) {
    arguments_.push("--enable-smoke-test-driver");
    arguments_.push(`--remote-debugging-port=${options.debuggingPort}`);
  }
  arguments_.push(
    `--user-data-dir=${profile.userDataDirectory}`,
    `--extensions-dir=${profile.extensionsDirectory}`,
    `--shared-data-dir=${profile.sharedDataDirectory}`,
    workspace,
  );
  return arguments_;
}

export function resolveVscodeExecutable(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): string {
  return (
    environment.VSCODE_EXECUTABLE_PATH ??
    path.join(
      environment.LOCALAPPDATA ?? "",
      "Programs",
      "Microsoft VS Code",
      "Code.exe",
    )
  );
}
