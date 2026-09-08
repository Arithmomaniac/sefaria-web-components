import { once } from "node:events";
import { access } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";

import type { Browser } from "playwright";

import {
  createVscodeEnvironment,
  createVscodeLaunchArguments,
  prepareVscodeDemoProfile,
  resolveVscodeDemoProfile,
  resolveVscodeExecutable,
} from "./vscode-demo-profile.js";
import {
  connectToVscode,
  findVscodeWorkbench,
  openVscodeChat,
  reserveVscodeDebuggingPort,
  selectExclusiveVscodeChatToolGroup,
} from "./vscode-host-automation.js";
import { prepareShowcaseLayout } from "./vscode-capture-layout.js";

const workspace = path.resolve(import.meta.dirname, "../../..");
const executablePath = resolveVscodeExecutable();
const profile = resolveVscodeDemoProfile();
await access(executablePath);
await prepareVscodeDemoProfile(profile, workspace);

const debuggingPort = await reserveVscodeDebuggingPort();
const code = spawn(
  executablePath,
  createVscodeLaunchArguments(profile, workspace, {
    debuggingPort,
    wait: true,
  }),
  {
    cwd: workspace,
    env: createVscodeEnvironment(profile),
    stdio: "ignore",
  },
);
let browser: Browser | undefined;
try {
  await once(code, "spawn");
  browser = await connectToVscode(debuggingPort);
  const context = browser.contexts()[0];
  if (context === undefined) {
    throw new Error("VS Code exposed no Playwright browser context.");
  }
  const page = await findVscodeWorkbench(context);
  await page.waitForTimeout(10_000);
  await openVscodeChat(page);
  await page.keyboard.press("Escape");
  await selectExclusiveVscodeChatToolGroup(page, "sefaria-components-demo");
  await prepareShowcaseLayout(page);
  const send = page.getByRole("button", { name: /^Send/i }).last();
  await send.waitFor({ state: "visible", timeout: 30_000 });
  if (await send.isEnabled()) {
    throw new Error("The VS Code demo Chat composer was not empty.");
  }

  console.log(`Opened the presentation-ready VS Code MCP demo with an empty Chat composer.

The Sefaria demo tool group is selected and the Chat view matches the capture layout. Enter your own request or use /sefaria-mcp-reader when you want to run it. The launcher does not type, submit a prompt, or call any demo tools.

Close the VS Code demo window to return to this terminal. If this isolated profile prompts you to sign in, use the Sign In control in that window.`);

  await once(code, "exit");
} finally {
  try {
    await browser?.close();
  } finally {
    if (code.exitCode === null && code.signalCode === null) {
      code.kill();
    }
  }
}
