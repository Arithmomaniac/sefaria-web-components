import { access } from "node:fs/promises";
import path from "node:path";

import {
  clearVscodeDemoRuntimeState,
  createVscodeEnvironment,
  createVscodeLaunchArguments,
  prepareVscodeDemoProfile,
  resolveVscodeDemoProfile,
  resolveVscodeExecutable,
} from "./vscode-demo-profile.js";
import { launchVscodeProcess } from "./vscode-process.js";

const workspace = path.resolve(import.meta.dirname, "../../..");
const executablePath = resolveVscodeExecutable();
const profile = resolveVscodeDemoProfile();
await access(executablePath);
await prepareVscodeDemoProfile(profile, workspace);
await clearVscodeDemoRuntimeState(profile);
const code = await launchVscodeProcess(
  executablePath,
  createVscodeLaunchArguments(profile, workspace),
  {
    cwd: workspace,
    environment: createVscodeEnvironment(profile),
    scratchDirectory: profile.root,
  },
);

console.log(`Opened the isolated VS Code MCP workspace minimized.
PID: ${code.pid}
User data: ${profile.userDataDirectory}

This launch-only command does not enable a debugging port, attach CDP,
drive the UI, submit a prompt, or call a tool.`);
