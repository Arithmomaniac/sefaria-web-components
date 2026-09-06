import { mkdir } from "node:fs/promises";
import { execFile, spawn } from "node:child_process";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import {
  chromium,
  type Browser,
  type BrowserContext,
  type Page,
} from "playwright";

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
const output =
  process.env.VSCODE_MCP_SCREENSHOT ??
  path.resolve(workspace, "docs/images/mcp-app-vscode.png");
const failureOutput = path.join(
  os.tmpdir(),
  "sefaria-mcp-app-vscode-failure.png",
);
const keepOpen = process.argv.includes("--keep-open");
const execFileAsync = promisify(execFile);

await prepareVscodeDemoProfile(profile, workspace);
await clearVscodeDemoRuntimeState(profile);
await mkdir(path.dirname(output), { recursive: true });

const debuggingPort = await reservePort();
const code = await launchCodeMinimized(
  executablePath,
  createVscodeLaunchArguments(profile, workspace, {
    debuggingPort,
    wait: true,
  }),
  createVscodeEnvironment(profile),
);
let browser: Browser | undefined;
let page: Page | undefined;
let captured = false;

try {
  browser = await connectToCode(debuggingPort);
  const context = browser.contexts()[0];
  if (context === undefined) {
    throw new Error("VS Code exposed no Playwright browser context.");
  }
  page = await findWorkbenchPage(context);
  await page.waitForTimeout(4_000);
  await runCommand(page, "Chat: Open Chat");

  const input = page
    .locator(
      ".interactive-input-part .monaco-editor, .chat-input-container .monaco-editor",
    )
    .last();
  await input.waitFor({ state: "visible", timeout: 30_000 });
  await input.click();
  await page.keyboard.insertText(
    "Use the sefaria-components-demo get_text tool to show Leviticus 19:18 in both languages.",
  );
  await page.keyboard.press("Enter");

  await waitForSourceCard(page);
  await page.screenshot({ path: output, fullPage: true });
  captured = true;
  console.log(`Captured VS Code MCP App acceptance screenshot: ${output}`);
  if (keepOpen) {
    await code.kill();
    const interactiveCode = await launchCodeMinimized(
      executablePath,
      createVscodeLaunchArguments(profile, workspace, { wait: true }),
      createVscodeEnvironment(profile),
    );
    console.log(
      "VS Code was relaunched without a debugging port and will remain open until you close the demo window.",
    );
    await interactiveCode.waitForExit();
  }
} catch (error) {
  if (page !== undefined) {
    const screenshot = await Promise.allSettled([
      page.screenshot({ path: failureOutput, fullPage: true }),
    ]);
    if (screenshot[0]?.status === "fulfilled") {
      console.error(`VS Code failure screenshot: ${failureOutput}`);
    }
  }
  throw error;
} finally {
  if (!keepOpen || !captured) {
    try {
      await browser?.close();
    } finally {
      await code.kill().catch(() => undefined);
    }
  }
}

async function runCommand(page: Page, command: string): Promise<void> {
  await page.keyboard.press("Control+Shift+P");
  const input = page.locator(".quick-input-box input").last();
  await input.waitFor({ state: "visible", timeout: 15_000 });
  await input.fill(command);
  await input.press("Enter");
}

async function clickIfVisible(page: Page, name: RegExp): Promise<void> {
  const button = page.getByRole("button", { name }).last();
  if (await button.isVisible()) {
    await button.click();
  }
}

async function clickTextIfVisible(page: Page, text: RegExp): Promise<void> {
  const candidate = page.getByText(text).last();
  if (await candidate.isVisible()) {
    await candidate.click();
  }
}

async function waitForSourceCard(page: Page): Promise<void> {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    await clickTextIfVisible(page, /^Allow in this Workspace$/i);
    await clickTextIfVisible(
      page,
      /^Allow Tools from Sefaria Web Components in this Workspace$/i,
    );
    await clickTextIfVisible(page, /^Allow in this Session$/i);
    await clickIfVisible(page, /^Allow in this Session$/i);
    await clickIfVisible(page, /Allow in This Workspace/i);
    await clickIfVisible(page, /Start Server/i);
    await clickTextIfVisible(page, /Start it now\?/i);

    const cardTextResults = await Promise.allSettled(
      page.frames().map(async (frame) => {
        const card = frame.locator("sefaria-source-card");
        return (await card.count()) === 0
          ? ""
          : await card
              .first()
              .evaluate((element) => element.shadowRoot?.textContent ?? "");
      }),
    );
    const cardTexts = cardTextResults.flatMap((result) =>
      result.status === "fulfilled" ? [result.value] : [],
    );
    if (
      cardTexts.some(
        (text) =>
          text.includes("Leviticus 19:18") &&
          text.includes("Primary text:") &&
          text.includes("Translation:"),
      )
    ) {
      return;
    }

    const signIn = page.getByRole("button", { name: /^Sign In$/i }).last();
    if (Date.now() > deadline - 100_000 && (await signIn.isVisible())) {
      throw new Error(
        `VS Code profile ${profile.userDataDirectory} is not signed in to GitHub Copilot. Run "pnpm setup:mcp:vscode", sign in once, close that window, and retry.`,
      );
    }

    await page.waitForTimeout(1_000);
  }
  throw new Error(
    "VS Code did not render the Sefaria source card within 120 seconds.",
  );
}

interface CodeProcess {
  readonly pid: number;
  kill(): Promise<void>;
  waitForExit(): Promise<void>;
}

async function launchCodeMinimized(
  executable: string,
  arguments_: readonly string[],
  environment: NodeJS.ProcessEnv,
): Promise<CodeProcess> {
  if (process.platform !== "win32") {
    const child = spawn(executable, arguments_, {
      env: environment,
      stdio: "inherit",
    });
    return {
      pid: child.pid ?? 0,
      kill: async () => {
        child.kill();
      },
      waitForExit: async () => {
        if (child.exitCode === null) {
          await new Promise<void>((resolve) =>
            child.once("exit", () => resolve()),
          );
        }
      },
    };
  }

  const launcher = path.join(import.meta.dirname, "launch-vscode-minimized.py");
  const python =
    process.env.VSCODE_DEMO_PYTHON ??
    path.join(
      workspace,
      "demos",
      "mcp",
      "fixture-server",
      ".venv",
      "Scripts",
      "python.exe",
    );
  const { stdout } = await execFileAsync(
    python,
    [launcher, executable, ...arguments_],
    {
      env: environment,
      windowsHide: true,
    },
  );
  const pid = Number.parseInt(stdout.trim(), 10);
  if (!Number.isSafeInteger(pid) || pid <= 0) {
    throw new Error(`Could not determine the minimized VS Code PID: ${stdout}`);
  }
  return {
    pid,
    kill: async () => {
      await closeProcess(pid);
    },
    waitForExit: async () => {
      while (await processExists(pid)) {
        await new Promise((resolve) => setTimeout(resolve, 1_000));
      }
    },
  };
}

async function closeProcess(pid: number): Promise<void> {
  await execFileAsync(
    "powershell.exe",
    [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      `$process = Get-Process -Id ${pid} -ErrorAction SilentlyContinue; if ($null -ne $process) { [void]$process.CloseMainWindow(); if (-not $process.WaitForExit(5000)) { Stop-Process -Id ${pid} } }`,
    ],
    { windowsHide: true },
  ).catch(() => undefined);
}

async function processExists(pid: number): Promise<boolean> {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function reservePort(): Promise<number> {
  for (let port = 9_229; port <= 9_329; port += 1) {
    const server = net.createServer();
    const available = await new Promise<boolean>((resolve) => {
      server.once("error", () => resolve(false));
      server.listen(port, "127.0.0.1", () => resolve(true));
    });
    if (!available) {
      continue;
    }
    await new Promise<void>((resolve, reject) => {
      server.close((error) =>
        error === undefined ? resolve() : reject(error),
      );
    });
    return port;
  }
  throw new Error("Could not reserve a VS Code debugging port from 9229-9329.");
}

async function connectToCode(port: number) {
  const endpoint = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 60_000;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      return await chromium.connectOverCDP(endpoint);
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  throw new Error(`Could not connect Playwright to VS Code at ${endpoint}.`, {
    cause: lastError,
  });
}

async function findWorkbenchPage(context: BrowserContext): Promise<Page> {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    const page = context
      .pages()
      .find((candidate) => candidate.url().includes("workbench/workbench"));
    if (page !== undefined) {
      return page;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(
    `Could not find the VS Code workbench page. Pages: ${context
      .pages()
      .map((page) => page.url())
      .join(", ")}`,
  );
}
