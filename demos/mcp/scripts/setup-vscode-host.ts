import { access } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";

import {
  clearVscodeDemoRuntimeState,
  createVscodeEnvironment,
  createVscodeLaunchArguments,
  prepareVscodeDemoProfile,
  resolveVscodeDemoProfile,
  resolveVscodeExecutable,
} from "./vscode-demo-profile.js";

const workspace = path.resolve(import.meta.dirname, "../../..");
const executablePath = resolveVscodeExecutable();
const profile = resolveVscodeDemoProfile();

await access(executablePath);
await prepareVscodeDemoProfile(profile, workspace);
await clearVscodeDemoRuntimeState(profile);

const code = spawn(
  executablePath,
  createVscodeLaunchArguments(profile, workspace),
  {
    detached: true,
    env: createVscodeEnvironment(profile),
    stdio: "ignore",
  },
);
code.unref();

console.log(`Opened the isolated VS Code MCP demo profile.
User data: ${profile.userDataDirectory}
Extensions: ${profile.extensionsDirectory}
Copilot home: ${profile.copilotHomeDirectory}
Shared data: ${profile.sharedDataDirectory}
Process home: ${profile.homeDirectory}

If prompted, sign in to GitHub Copilot and confirm the sefaria-components-demo server, then close this VS Code window. Future capture and demo commands reuse this isolated profile.`);
