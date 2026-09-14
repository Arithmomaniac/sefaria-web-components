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

console.log(`Opened the isolated VS Code MCP demo profile.
PID: ${code.pid}
User data: ${profile.userDataDirectory}
Extensions: ${profile.extensionsDirectory}
Copilot home: ${profile.copilotHomeDirectory}
Shared data: ${profile.sharedDataDirectory}
Process home: ${profile.homeDirectory}

If prompted, sign in to GitHub Copilot and confirm the sefaria-components-demo server, then close this VS Code window. Future launch, walkthrough, and capture commands reuse this isolated profile.`);
