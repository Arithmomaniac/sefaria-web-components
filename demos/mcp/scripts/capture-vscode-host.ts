import { mkdir, writeFile } from "node:fs/promises";
import { execFile, spawn } from "node:child_process";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import {
  chromium,
  type Browser,
  type BrowserContext,
  type Frame,
  type Locator,
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
const showcaseOnly = process.env.VSCODE_MCP_SHOWCASE === "1";
const execFileAsync = promisify(execFile);
const CONNECTIONS_REFERENCE = "Micah 6:8";
const artifacts: Record<string, string> = {};
const completedStages: string[] = [];
const deliveryModes: Record<
  string,
  "automatic" | "composer-submitted" | "manual-fallback"
> = {};
let currentStage = "launch";
let selectedReference: string | undefined;

if (showcaseOnly && process.env.VSCODE_MCP_SCREENSHOT === undefined) {
  throw new Error(
    "VSCODE_MCP_SHOWCASE requires VSCODE_MCP_SCREENSHOT so it cannot replace the full acceptance artifacts.",
  );
}

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
  await page.setViewportSize({ width: 1_600, height: 900 });
  await page.waitForTimeout(4_000);
  await runCommand(page, "Chat: Open Chat");
  await clickIfVisible(page, /Maximize Secondary Side Bar/i);
  await page.keyboard.press("Escape");
  if (showcaseOnly) {
    await runCommand(page, "View: Reset Zoom");
    await runCommand(page, "View: Zoom Out");
    await runCommand(page, "View: Zoom Out");
  }
  const seenAppFrames = new Set<Frame>();

  showcaseWalkthrough: {
    currentStage = "source-card";
    await submitPrompt(
      page,
      showcaseOnly
        ? "Using Sefaria, show me Micah 6:8 in Hebrew and English as an interactive source card. Show the card only; do not repeat or analyze the payload afterward."
        : "Use the sefaria-components-demo get_text tool to show Leviticus 19:18 in both languages.",
    );
    const sourceFrame = await waitForNewSourceCard(
      page,
      seenAppFrames,
      showcaseOnly ? "Micah 6:8" : "Leviticus 19:18",
      true,
    );
    await waitForTurnIdle(page);
    await scrollFrameIntoView(sourceFrame);
    await captureStage(page, "source-card", output);
    completedStages.push(currentStage);

    currentStage = "connections-default";
    await submitPrompt(
      page,
      showcaseOnly
        ? `Using Sefaria, show me an interactive connections panel for ${CONNECTIONS_REFERENCE}. Show the panel only; do not repeat or analyze the payload afterward.`
        : `Use the sefaria-components-demo get_links_between_texts tool with only the reference argument ${CONNECTIONS_REFERENCE}. Do not specify with_text.`,
    );
    const connectionsFrame = await waitForNewConnectionsPanel(
      page,
      seenAppFrames,
    );
    await waitForTurnIdle(page);
    let panel = await readPanel(connectionsFrame);
    assertPanel(
      panel.category === "Commentary",
      `Expected Commentary to open first, received ${String(panel.category)}.`,
    );
    assertPanel(panel.previewsIncluded, "Expected Apps-default previews.");
    assertPanel(
      panel.previewCount > 0,
      "Expected at least one rendered connection preview.",
    );
    await scrollFrameIntoView(connectionsFrame);
    await captureStage(page, "connections", stageOutput("connections"));
    completedStages.push(currentStage);

    currentStage = "connections-category";
    const alternate = panel.categories
      .filter((category) => category.id !== "Commentary")
      .sort((left, right) => left.count - right.count)[0];
    assertPanel(
      alternate !== undefined,
      `${CONNECTIONS_REFERENCE} returned no second connection category.`,
    );
    await activateButton(
      connectionsFrame.getByRole("button", {
        name: new RegExp(`^${escapeRegex(alternate!.id)} \\(`),
      }),
    );
    panel = await waitForPanel(
      connectionsFrame,
      (snapshot) => snapshot.category === alternate!.id && snapshot.page === 0,
    );
    await scrollFrameIntoView(connectionsFrame);
    await captureStage(page, "connections-category", stageOutput("category"));
    completedStages.push(currentStage);
    if (showcaseOnly) break showcaseWalkthrough;
    await activateButton(
      connectionsFrame.getByRole("button", { name: /^Commentary \(/ }),
    );
    panel = await waitForPanel(
      connectionsFrame,
      (snapshot) => snapshot.category === "Commentary" && snapshot.page === 0,
    );

    currentStage = "connections-paging";
    const pagingCategory = panel.categories.find(
      (category) => category.count > panel.pageSize,
    );
    assertPanel(
      pagingCategory !== undefined,
      `${CONNECTIONS_REFERENCE} returned no category with more than ${panel.pageSize} connections.`,
    );
    if (pagingCategory!.id !== panel.category) {
      await activateButton(
        connectionsFrame.getByRole("button", {
          name: new RegExp(`^${escapeRegex(pagingCategory!.id)} \\(`),
        }),
      );
      panel = await waitForPanel(
        connectionsFrame,
        (snapshot) =>
          snapshot.category === pagingCategory!.id && snapshot.page === 0,
      );
    }
    const firstPageTargets = panel.targetRefs;
    await activateButton(
      connectionsFrame.getByRole("button", { name: "More" }),
    );
    panel = await waitForPanel(
      connectionsFrame,
      (snapshot) => snapshot.page === 1,
    );
    assertPanel(
      JSON.stringify(panel.targetRefs) !== JSON.stringify(firstPageTargets),
      "The second connections page repeated the first page entries.",
    );
    await captureStage(page, "connections-page-2", stageOutput("page-2"));
    await activateButton(
      connectionsFrame.getByRole("button", { name: "Previous" }),
    );
    panel = await waitForPanel(
      connectionsFrame,
      (snapshot) =>
        snapshot.page === 0 &&
        JSON.stringify(snapshot.targetRefs) ===
          JSON.stringify(firstPageTargets),
    );
    completedStages.push(currentStage);

    currentStage = "connected-source";
    selectedReference = panel.targetRefs[0];
    assertPanel(
      selectedReference !== undefined,
      "The active connections page contained no selectable connection.",
    );
    const openButton = connectionsFrame
      .getByRole("button", {
        name: `Open ${selectedReference} in context`,
      })
      .first();
    await openButton.focus();
    await openButton.press("Enter");
    const sourceFollowUp = `Use get_text with reference "${selectedReference}" and version_language "both" to show the selected source.`;
    deliveryModes["connected-source"] = await completeFollowUp(
      page,
      connectionsFrame,
      sourceFollowUp,
      "connected-source",
    );
    await waitForNewSourceCard(page, seenAppFrames, selectedReference!);
    await waitForTurnIdle(page);
    await captureStage(
      page,
      "connected-source",
      stageOutput("connected-source"),
    );
    completedStages.push(currentStage);

    currentStage = "connections-metadata-only";
    await submitPrompt(
      page,
      `Use the sefaria-components-demo get_links_between_texts tool for ${CONNECTIONS_REFERENCE} with with_text set to "0".`,
    );
    const metadataFrame = await waitForNewConnectionsPanel(page, seenAppFrames);
    await waitForTurnIdle(page);
    panel = await readPanel(metadataFrame);
    assertPanel(
      !panel.previewsIncluded,
      "Explicit with_text=0 unexpectedly included previews.",
    );
    await metadataFrame
      .getByRole("button", { name: "Load previews" })
      .waitFor({ state: "visible" });
    await captureStage(
      page,
      "connections-metadata-only",
      stageOutput("metadata-only"),
    );
    completedStages.push(currentStage);

    currentStage = "connections-load-previews";
    await activateButton(
      metadataFrame.getByRole("button", { name: "Load previews" }),
    );
    const previewFollowUp = `Use get_links_between_texts with reference "${CONNECTIONS_REFERENCE}" and with_text "1" to show connection previews.`;
    deliveryModes["load-previews"] = await completeFollowUp(
      page,
      metadataFrame,
      previewFollowUp,
      "load-previews",
    );
    const previewFrame = await waitForNewConnectionsPanel(
      page,
      seenAppFrames,
      (snapshot) => snapshot.previewsIncluded && snapshot.previewCount > 0,
      "a preview-bearing connections panel",
    );
    await waitForTurnIdle(page);
    panel = await readPanel(previewFrame);
    await captureStage(
      page,
      "connections-loaded-previews",
      stageOutput("loaded-previews"),
    );
    completedStages.push(currentStage);
  }

  await writeWalkthroughResult(page, {
    status: showcaseOnly ? "showcase-capture" : "passed",
    completedStages,
    selectedReference,
    artifacts,
    deliveryModes,
  });
  captured = true;
  console.log(`Captured VS Code MCP App walkthrough: ${walkthroughOutput()}`);
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
  await writeWalkthroughResult(page, {
    status: "failed",
    completedStages,
    failedStage: currentStage,
    selectedReference,
    artifacts,
    deliveryModes,
    error: error instanceof Error ? error.message : String(error),
  }).catch(() => undefined);
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

async function submitPrompt(page: Page, prompt: string): Promise<void> {
  const input = page
    .locator(
      ".interactive-input-part .monaco-editor, .chat-input-container .monaco-editor",
    )
    .last();
  await input.waitFor({ state: "visible", timeout: 30_000 });
  await page.keyboard.press("Escape");
  await input.click({ force: true });
  await page.keyboard.insertText(prompt);
  await clickChatSubmit(page);
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

async function activateButton(button: Locator): Promise<void> {
  await button.evaluate((element) => (element as HTMLButtonElement).click());
}

async function waitForNewSourceCard(
  page: Page,
  seenFrames: Set<Frame>,
  expectedReference: string,
  requireTranslation = false,
): Promise<Frame> {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    await handleHostPrompts(page);
    for (const frame of page.frames()) {
      if (seenFrames.has(frame)) continue;
      try {
        const card = frame.locator("sefaria-source-card");
        if ((await card.count()) === 0) continue;
        const text = await card
          .first()
          .evaluate((element) => element.shadowRoot?.textContent ?? "");
        if (
          text.includes(expectedReference) &&
          text.includes("Primary text:") &&
          (!requireTranslation || text.includes("Translation:"))
        ) {
          seenFrames.add(frame);
          return frame;
        }
      } catch (error) {
        if (isTransientFrameError(error, page)) continue;
        throw error;
      }
    }

    await failIfSignedOut(page, deadline);
    await page.waitForTimeout(1_000);
  }
  throw new Error(
    `VS Code did not render a new source card for ${expectedReference} within 120 seconds.`,
  );
}

async function waitForNewConnectionsPanel(
  page: Page,
  seenFrames: Set<Frame>,
  predicate: (snapshot: PanelSnapshot) => boolean = () => true,
  description = "a connections panel",
): Promise<Frame> {
  const deadline = Date.now() + 120_000;
  let lastSnapshot: PanelSnapshot | undefined;
  while (Date.now() < deadline) {
    await handleHostPrompts(page);
    for (const frame of page.frames()) {
      if (seenFrames.has(frame)) continue;
      try {
        const panel = frame.locator("sefaria-connections-panel");
        if ((await panel.count()) === 0) continue;
        const snapshot = await readPanel(frame);
        if (snapshot.state === "data") {
          seenFrames.add(frame);
          lastSnapshot = snapshot;
          if (predicate(snapshot)) return frame;
        }
      } catch (error) {
        if (isTransientFrameError(error, page)) continue;
        throw error;
      }
    }
    await failIfSignedOut(page, deadline);
    await page.waitForTimeout(1_000);
  }
  throw new Error(
    `VS Code did not render ${description} within 120 seconds. Last panel: ${JSON.stringify(lastSnapshot)}`,
  );
}

function isTransientFrameError(error: unknown, page: Page): boolean {
  if (!(error instanceof Error)) return false;
  if (error.message.includes("Frame was detached")) return true;
  return (
    !page.isClosed() &&
    error.message.includes("Target page, context or browser has been closed")
  );
}

interface PanelSnapshot {
  readonly state: string;
  readonly category: string | null;
  readonly categories: readonly {
    readonly id: string;
    readonly count: number;
  }[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  readonly previewsIncluded: boolean;
  readonly previewCount: number;
  readonly targetRefs: readonly string[];
}

async function readPanel(frame: Frame): Promise<PanelSnapshot> {
  const panel = frame.locator("sefaria-connections-panel").first();
  return panel.evaluate((element) => {
    const component = element as HTMLElement & {
      viewModel?: {
        state: string;
        category?: string | null;
        categories?: readonly { id: string; count: number }[];
        page?: number;
        pageSize?: number;
        total?: number;
        previewsIncluded?: boolean;
        entries?: readonly {
          targetRef: string;
          preview: { state: string };
        }[];
      };
    };
    const viewModel = component.viewModel;
    return {
      state: viewModel?.state ?? "missing",
      category: viewModel?.category ?? null,
      categories: viewModel?.categories ?? [],
      page: viewModel?.page ?? -1,
      pageSize: viewModel?.pageSize ?? 0,
      total: viewModel?.total ?? 0,
      previewsIncluded: viewModel?.previewsIncluded ?? false,
      previewCount:
        viewModel?.entries?.filter(
          (entry) => entry.preview.state === "available",
        ).length ?? 0,
      targetRefs: viewModel?.entries?.map((entry) => entry.targetRef) ?? [],
    };
  });
}

async function waitForPanel(
  frame: Frame,
  predicate: (snapshot: PanelSnapshot) => boolean,
): Promise<PanelSnapshot> {
  const deadline = Date.now() + 15_000;
  let lastSnapshot: PanelSnapshot | undefined;
  while (Date.now() < deadline) {
    const snapshot = await readPanel(frame);
    lastSnapshot = snapshot;
    if (predicate(snapshot)) return snapshot;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(
    `The connections panel did not reach the expected state. Last snapshot: ${JSON.stringify(lastSnapshot)}`,
  );
}

async function waitForTurnIdle(page: Page): Promise<void> {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    await handleHostPrompts(page);
    const send = page.getByRole("button", { name: /^Send/i }).last();
    if (await send.isVisible()) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("VS Code Copilot Chat did not finish the current turn.");
}

async function handleHostPrompts(page: Page): Promise<void> {
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
}

async function failIfSignedOut(page: Page, deadline: number): Promise<void> {
  const signIn = page.getByRole("button", { name: /^Sign In$/i }).last();
  if (Date.now() > deadline - 100_000 && (await signIn.isVisible())) {
    throw new Error(
      `VS Code profile ${profile.userDataDirectory} is not signed in to GitHub Copilot. Run "pnpm setup:mcp:vscode", sign in once, close that window, and retry.`,
    );
  }
}

async function completeFollowUp(
  page: Page,
  appFrame: Frame,
  expectedText: string,
  artifactPrefix: string,
): Promise<"automatic" | "composer-submitted" | "manual-fallback"> {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const renderedText = page.getByText(expectedText, { exact: true }).last();
    if (await renderedText.isVisible()) {
      const composer = renderedText.locator(
        "xpath=ancestor::*[contains(concat(' ', normalize-space(@class), ' '), ' interactive-input-part ') or contains(concat(' ', normalize-space(@class), ' '), ' chat-input-container ')][1]",
      );
      if ((await composer.count()) === 0) {
        return "automatic";
      }
      const artifact = `${artifactPrefix}-composer`;
      await captureStage(page, artifact, stageOutput(artifact));
      await clickChatSubmit(page);
      return "composer-submitted";
    }

    const fallback = appFrame.locator(
      'textarea[aria-label="Follow-up request"]',
    );
    if (
      (await fallback.isVisible()) &&
      (await fallback.inputValue()) === expectedText
    ) {
      const artifact = `${artifactPrefix}-fallback`;
      await captureStage(page, artifact, stageOutput(artifact));
      await submitPrompt(page, expectedText);
      return "manual-fallback";
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(
    "The App neither sent the expected follow-up nor exposed its exact fallback text.",
  );
}

async function clickChatSubmit(page: Page): Promise<void> {
  const send = page
    .locator(
      ".interactive-input-part .action-label.codicon-arrow-up-compact:not(.disabled)",
    )
    .last();
  await send.waitFor({ state: "visible", timeout: 5_000 });
  await send.click();
}

async function captureStage(
  page: Page,
  name: string,
  filePath: string,
): Promise<void> {
  await page.screenshot({ path: filePath, fullPage: true });
  artifacts[name] = portableArtifactPath(filePath);
}

async function scrollFrameIntoView(frame: Frame): Promise<void> {
  const element = await frame.frameElement();
  await element.evaluate((iframe) =>
    (iframe as Element).scrollIntoView({
      block: "center",
      inline: "nearest",
    }),
  );
}

function portableArtifactPath(filePath: string): string {
  const relative = path.relative(workspace, filePath);
  if (!relative.startsWith("..") && !path.isAbsolute(relative)) {
    return relative.replaceAll(path.sep, "/");
  }
  return path.basename(filePath);
}

function stageOutput(suffix: string): string {
  const extension = path.extname(output);
  const base = extension === "" ? output : output.slice(0, -extension.length);
  return `${base}-${suffix}${extension}`;
}

function walkthroughOutput(): string {
  const extension = path.extname(output);
  const base = extension === "" ? output : output.slice(0, -extension.length);
  return `${base}-walkthrough.json`;
}

async function writeWalkthroughResult(
  page: Page | undefined,
  result: Record<string, unknown>,
): Promise<void> {
  const userAgent =
    page === undefined
      ? undefined
      : await page.evaluate(() => navigator.userAgent).catch(() => undefined);
  await writeFile(
    walkthroughOutput(),
    `${JSON.stringify(
      {
        ...result,
        executable: path.basename(executablePath),
        userAgent,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

function assertPanel(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
