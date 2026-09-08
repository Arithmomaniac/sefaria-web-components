import { copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { execFile, spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { type Browser, type Frame, type Locator, type Page } from "playwright";

import {
  clearVscodeDemoRuntimeState,
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
import {
  captureVscodeViewport,
  frameReaderForCapture,
  prepareReaderForShowcaseCapture,
  prepareShowcaseLayout,
  revealLocatorForDemoClick,
} from "./vscode-capture-layout.js";
import {
  installDemoCursor,
  moveDemoCursor,
  positionDemoCursor,
  pulseDemoCursor,
} from "./vscode-demo-cursor.js";
import { VscodeVideoRecorder } from "./vscode-video-recorder.js";

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
const videoOutput =
  process.env.VSCODE_MCP_VIDEO === undefined
    ? undefined
    : path.resolve(workspace, process.env.VSCODE_MCP_VIDEO);
const keepOpen = process.argv.includes("--keep-open");
const showcaseOnly = process.env.VSCODE_MCP_SHOWCASE === "1";
const execFileAsync = promisify(execFile);
const CONNECTIONS_REFERENCE = "Micah 6:8";
const ACTION_PAUSE_MS = 650;
const VIDEO_STAGE_PAUSE_MS = 750;
const artifacts: Record<string, string> = {};
const stagedCaptures = new Map<string, string>();
const completedStages: string[] = [];
const deliveryModes: Record<
  string,
  | "automatic"
  | "composer-submitted"
  | "host-message"
  | "manual-fallback"
  | "same-app-tool"
> = {};
let currentStage = "launch";
let selectedReference: string | undefined;
const hierarchyReferences: string[] = [CONNECTIONS_REFERENCE];

if (showcaseOnly && process.env.VSCODE_MCP_SCREENSHOT === undefined) {
  throw new Error(
    "VSCODE_MCP_SHOWCASE requires VSCODE_MCP_SCREENSHOT so it cannot replace the full acceptance artifacts.",
  );
}
if (
  videoOutput !== undefined &&
  process.env.VSCODE_MCP_SCREENSHOT === undefined
) {
  throw new Error(
    "VSCODE_MCP_VIDEO requires VSCODE_MCP_SCREENSHOT so recording cannot replace the documentation captures by default.",
  );
}

const captureDirectory = await mkdtemp(
  path.join(os.tmpdir(), "sefaria-capture-"),
);
await prepareVscodeDemoProfile(profile, workspace);
await clearVscodeDemoRuntimeState(profile);
await mkdir(path.dirname(output), { recursive: true });

const debuggingPort = await reserveVscodeDebuggingPort();
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
let videoRecorder: VscodeVideoRecorder | undefined;
let captured = false;

try {
  browser = await connectToVscode(debuggingPort);
  const context = browser.contexts()[0];
  if (context === undefined) {
    throw new Error("VS Code exposed no Playwright browser context.");
  }
  page = await findVscodeWorkbench(context);
  await page.waitForTimeout(10_000);
  await openVscodeChat(page);
  await clickIfVisible(page, /Maximize Secondary Side Bar/i);
  await page.keyboard.press("Escape");
  await selectExclusiveVscodeChatToolGroup(page, "sefaria-components-demo");
  if (showcaseOnly || videoOutput !== undefined) {
    await prepareShowcaseLayout(page);
  }
  if (videoOutput !== undefined) {
    await installDemoCursor(page);
    await positionDemoCursor(chatInput(page));
    videoRecorder = await VscodeVideoRecorder.start(page, videoOutput);
  }
  const seenAppFrames = new Set<Frame>();

  currentStage = "reader-initial";
  await submitPrompt(
    page,
    showcaseOnly
      ? `Show me ${CONNECTIONS_REFERENCE} in Hebrew and English as an interactive Sefaria reader.`
      : `Use the sefaria-components-demo get_text tool to show ${CONNECTIONS_REFERENCE} in both languages.`,
  );
  const readerFrame = await waitForNewSourceCard(
    page,
    seenAppFrames,
    CONNECTIONS_REFERENCE,
    true,
  );
  await waitForTurnIdle(page);
  let panel = await waitForPanel(
    readerFrame,
    (snapshot) =>
      snapshot.state === "data" &&
      snapshot.previewsIncluded &&
      snapshot.categories.length > 0,
  );
  if (videoRecorder !== undefined) {
    await revealLocatorForDemoClick(
      readerFrame.getByRole("button", {
        name: `Send ${CONNECTIONS_REFERENCE} to chat`,
      }),
    );
  }
  await captureStage(readerFrame, "reader-initial", output);

  await showConnectionsPane(readerFrame);
  await activateButton(
    readerFrame.getByRole("button", { name: /^Commentary \(/ }),
  );
  panel = await waitForPanel(
    readerFrame,
    (snapshot) =>
      snapshot.category === "Commentary" && snapshot.previewCount > 0,
  );
  assertPanel(
    panel.category === "Commentary",
    `Expected Commentary after selection, received ${String(panel.category)}.`,
  );
  assertPanel(panel.previewsIncluded, "Expected Apps-default previews.");
  assertPanel(
    panel.previewCount > 0,
    "Expected at least one rendered connection preview.",
  );
  await captureStage(readerFrame, "connections", stageOutput("connections"));
  completedStages.push(currentStage);

  currentStage = "connections-category";
  const alternate = panel.categories.find(
    (category) => category.id !== "Commentary",
  );
  assertPanel(
    alternate !== undefined,
    `${CONNECTIONS_REFERENCE} returned no second connection category.`,
  );
  await activateButton(
    readerFrame.getByRole("button", {
      name: new RegExp(`^${escapeRegex(alternate!.id)} \\(`),
    }),
  );
  panel = await waitForPanel(
    readerFrame,
    (snapshot) => snapshot.category === alternate!.id && snapshot.page === 0,
  );
  await captureStage(
    readerFrame,
    "connections-category",
    stageOutput("category"),
  );
  completedStages.push(currentStage);

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
      readerFrame.getByRole("button", {
        name: new RegExp(`^${escapeRegex(pagingCategory!.id)} \\(`),
      }),
    );
    panel = await waitForPanel(
      readerFrame,
      (snapshot) =>
        snapshot.category === pagingCategory!.id && snapshot.page === 0,
    );
  }
  const firstPageTargets = panel.targetRefs;
  await activateButton(readerFrame.getByRole("button", { name: "More" }));
  panel = await waitForPanel(readerFrame, (snapshot) => snapshot.page === 1);
  assertPanel(
    JSON.stringify(panel.targetRefs) !== JSON.stringify(firstPageTargets),
    "The second connections page repeated the first page entries.",
  );
  await captureStage(readerFrame, "connections-page-2", stageOutput("page-2"));
  await activateButton(readerFrame.getByRole("button", { name: "Previous" }));
  panel = await waitForPanel(
    readerFrame,
    (snapshot) =>
      snapshot.page === 0 &&
      JSON.stringify(snapshot.targetRefs) === JSON.stringify(firstPageTargets),
  );
  completedStages.push(currentStage);

  currentStage = "connected-source";
  selectedReference = panel.targetRefs[0];
  assertPanel(
    selectedReference !== undefined,
    "The active connections page contained no selectable connection.",
  );
  const openButton = readerFrame
    .getByRole("button", {
      name: `Open ${selectedReference} in context`,
    })
    .first();
  await activateButton(openButton);
  await waitForSourceCard(readerFrame, selectedReference!);
  await waitForPanel(
    readerFrame,
    (snapshot) => snapshot.state === "data" && snapshot.page === 0,
  );
  deliveryModes["connected-source"] = "same-app-tool";
  await captureStage(
    readerFrame,
    "connected-source",
    stageOutput("connected-source"),
  );
  completedStages.push(currentStage);

  hierarchyReferences.push(selectedReference);
  currentStage = "reader-hierarchy";
  panel = await waitForPanel(
    readerFrame,
    (snapshot) => snapshot.state === "data" && snapshot.categories.length > 0,
  );
  await showConnectionsPane(readerFrame);
  const childCategory = panel.categories[0];
  assertPanel(
    childCategory !== undefined,
    `${selectedReference} returned no connection category for a second reader hop.`,
  );
  await activateButton(
    readerFrame.getByRole("button", {
      name: new RegExp(`^${escapeRegex(childCategory.id)} \\(`),
    }),
  );
  panel = await waitForPanel(
    readerFrame,
    (snapshot) =>
      snapshot.category === childCategory.id && snapshot.targetRefs.length > 0,
  );
  const grandchildReference = panel.targetRefs[0];
  assertPanel(
    grandchildReference !== undefined,
    `${selectedReference} returned no selectable connection for a second reader hop.`,
  );
  await activateButton(
    readerFrame
      .getByRole("button", {
        name: `Open ${grandchildReference} in context`,
      })
      .first(),
  );
  await waitForSourceCard(readerFrame, grandchildReference);
  hierarchyReferences.push(grandchildReference);
  const hierarchy = await waitForReader(
    readerFrame,
    (snapshot) =>
      snapshot.selectedRef === grandchildReference &&
      snapshot.breadcrumbs.length >= 3,
  );
  deliveryModes["reader-hierarchy"] = "same-app-tool";
  await waitForPanel(
    readerFrame,
    (snapshot) => snapshot.state === "data" || snapshot.state === "empty",
  );
  await captureStage(
    readerFrame,
    "reader-hierarchy",
    stageOutput("reader-hierarchy"),
  );
  completedStages.push(currentStage);

  currentStage = "reader-chat-export";
  await activateButton(
    readerFrame.getByRole("button", {
      name: `Send ${grandchildReference} to chat`,
    }),
  );
  await waitForComposerText(
    page,
    `Use get_text with reference "${grandchildReference}"`,
  );
  deliveryModes["chat-export"] = "host-message";
  await captureStage(readerFrame, "chat-export", stageOutput("chat-export"));
  await clearComposer(page);
  completedStages.push(currentStage);

  currentStage = "reader-breadcrumb-middle";
  const middle = hierarchy.breadcrumbs.at(-2);
  assertPanel(
    middle !== undefined,
    "The reader hierarchy has no middle entry.",
  );
  await activateButton(
    readerFrame.getByRole("button", { name: middle.label, exact: true }),
  );
  await waitForReader(
    readerFrame,
    (snapshot) => snapshot.selectedRef === selectedReference,
  );
  await captureStage(
    readerFrame,
    "reader-breadcrumb-middle",
    stageOutput("breadcrumb-middle"),
  );
  completedStages.push(currentStage);

  currentStage = "reader-breadcrumb-root";
  const rootBreadcrumb = hierarchy.breadcrumbs[0];
  assertPanel(
    rootBreadcrumb !== undefined,
    "The reader hierarchy has no root.",
  );
  await activateButton(
    readerFrame.getByRole("button", {
      name: rootBreadcrumb.label,
      exact: true,
    }),
  );
  await waitForReader(
    readerFrame,
    (snapshot) => snapshot.selectedRef === CONNECTIONS_REFERENCE,
  );
  await captureStage(
    readerFrame,
    "reader-breadcrumb-root",
    stageOutput("breadcrumb-root"),
  );
  completedStages.push(currentStage);

  if (videoRecorder !== undefined) {
    await page.waitForTimeout(800);
    await videoRecorder.stop();
    videoRecorder = undefined;
    console.log(`Recorded VS Code MCP App walkthrough: ${videoOutput}`);
  }

  for (const [destination, staged] of stagedCaptures) {
    await copyFile(staged, destination);
  }
  await writeWalkthroughResult(page, {
    status: showcaseOnly ? "showcase-capture" : "passed",
    completedStages,
    selectedReference,
    hierarchyReferences,
    artifacts,
    deliveryModes,
  });
  captured = true;
  await rm(captureDirectory, { recursive: true });
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
      captureVscodeViewport(page).then((image) =>
        writeFile(failureOutput, image),
      ),
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
    hierarchyReferences,
    artifacts,
    deliveryModes,
    error: error instanceof Error ? error.message : String(error),
  }).catch((diagnosticError: unknown) => {
    console.error("Could not write capture failure details:", diagnosticError);
  });
  console.error(`Unpublished capture diagnostics: ${captureDirectory}`);
  throw error;
} finally {
  await videoRecorder?.discard().catch(() => undefined);
  if (!keepOpen || !captured) {
    try {
      await browser?.close();
    } finally {
      await code.kill().catch(() => undefined);
    }
  }
}

async function submitPrompt(page: Page, prompt: string): Promise<void> {
  const input = chatInput(page);
  await input.waitFor({ state: "visible", timeout: 30_000 });
  await page.keyboard.press("Escape");
  await input.click({ force: true });
  await page.keyboard.insertText(prompt);
  await pauseBetweenActions(page);
  await clickChatSubmit(page);
  await pauseBetweenActions(page);
}

function chatInput(page: Page): Locator {
  return page
    .locator(
      ".interactive-input-part .monaco-editor, .chat-input-container .monaco-editor",
    )
    .last();
}

async function waitForComposerText(
  page: Page,
  expected: string,
): Promise<void> {
  const input = chatInput(page);
  await input.waitFor({ state: "visible", timeout: 30_000 });
  await input
    .locator(".view-lines")
    .filter({ hasText: expected })
    .waitFor({ state: "visible", timeout: 30_000 });
}

async function clearComposer(page: Page): Promise<void> {
  const input = chatInput(page);
  await input.click();
  await page.keyboard.press("Control+A");
  await pauseBetweenActions(page);
  await page.keyboard.press("Backspace");
  await pauseBetweenActions(page);
}

async function clickChatSubmit(page: Page): Promise<void> {
  const send = page
    .locator(
      ".interactive-input-part .action-label.codicon-arrow-up-compact:not(.disabled)",
    )
    .last();
  await send.waitFor({ state: "visible", timeout: 5_000 });
  if (videoRecorder !== undefined) {
    await moveDemoCursor(send);
  }
  await send.click();
  if (videoRecorder !== undefined) {
    await pulseDemoCursor(page);
  }
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
  await revealLocatorForDemoClick(button);
  if (videoRecorder !== undefined) {
    await moveDemoCursor(button);
  }
  await button.click();
  if (videoRecorder !== undefined) {
    await pulseDemoCursor(button.page());
  }
  await pauseBetweenActions(button.page());
}

async function showConnectionsPane(frame: Frame): Promise<void> {
  const button = frame.getByRole("button", {
    name: "Connections",
    exact: true,
  });
  if (await button.isVisible()) {
    await activateButton(button);
  }
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

async function waitForSourceCard(
  frame: Frame,
  expectedReference: string,
  requireTranslation = false,
): Promise<void> {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    const snapshot = await readReader(frame);
    if (snapshot !== undefined) {
      if (
        snapshot.selectedRef === expectedReference &&
        snapshot.sourceViewState === "data" &&
        (!requireTranslation || snapshot.hasTranslation)
      ) {
        return;
      }
    }
    const card = frame.locator("sefaria-source-card").first();
    if ((await card.count()) > 0) {
      const text = await card.evaluate(
        (element) => element.shadowRoot?.textContent ?? "",
      );
      if (
        text.includes(expectedReference) &&
        text.includes("Primary text:") &&
        (!requireTranslation || text.includes("Translation:"))
      ) {
        return;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(
    `The reader did not render source content for ${expectedReference} within 120 seconds.`,
  );
}

interface ReaderSnapshot {
  readonly selectedRef: string | undefined;
  readonly sourceViewState: string | undefined;
  readonly hasTranslation: boolean;
  readonly breadcrumbs: readonly {
    readonly label: string;
    readonly current: boolean;
  }[];
}

async function readReader(frame: Frame): Promise<ReaderSnapshot | undefined> {
  const reader = frame.locator("sefaria-reader").first();
  if ((await reader.count()) === 0) return undefined;
  return reader.evaluate((element) => {
    const component = element as HTMLElement & {
      viewModel?: {
        selectedTarget?: { ref?: string };
        breadcrumbs?: readonly {
          label: string;
          current: boolean;
        }[];
        source?: {
          viewModel?: {
            state?: string;
            items?: readonly {
              translation?: { state?: string };
            }[];
          };
        };
      };
    };
    const viewModel = component.viewModel;
    return {
      selectedRef: viewModel?.selectedTarget?.ref,
      sourceViewState: viewModel?.source?.viewModel?.state,
      hasTranslation:
        viewModel?.source?.viewModel?.items?.some(
          (item) => item.translation?.state === "text",
        ) ?? false,
      breadcrumbs: viewModel?.breadcrumbs ?? [],
    };
  });
}

async function waitForReader(
  frame: Frame,
  predicate: (snapshot: ReaderSnapshot) => boolean,
): Promise<ReaderSnapshot> {
  const deadline = Date.now() + 120_000;
  let lastSnapshot: ReaderSnapshot | undefined;
  while (Date.now() < deadline) {
    const snapshot = await readReader(frame);
    lastSnapshot = snapshot;
    if (snapshot !== undefined && predicate(snapshot)) return snapshot;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(
    `The reader did not reach the expected history state. Last snapshot: ${JSON.stringify(lastSnapshot)}`,
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

async function captureStage(
  frame: Frame,
  name: string,
  filePath: string,
): Promise<void> {
  const staged = path.join(captureDirectory, path.basename(filePath));
  if (showcaseOnly) await prepareReaderForShowcaseCapture(frame);
  if (videoRecorder === undefined) {
    await frameReaderForCapture(
      frame,
      showcaseOnly && name === "reader-initial" ? 180 : 32,
    );
  }
  await writeFile(staged, await captureVscodeViewport(frame.page()));
  stagedCaptures.set(filePath, staged);
  artifacts[name] = portableArtifactPath(filePath);
  if (videoRecorder !== undefined) {
    await frame.page().waitForTimeout(VIDEO_STAGE_PAUSE_MS);
  }
}

async function pauseBetweenActions(page: Page): Promise<void> {
  await page.waitForTimeout(ACTION_PAUSE_MS);
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
  const normalizedSuffix =
    base.endsWith("-reader") && suffix.startsWith("reader-")
      ? suffix.slice("reader-".length)
      : suffix;
  return `${base}-${normalizedSuffix}${extension}`;
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
    result.status === "failed"
      ? path.join(captureDirectory, "failure.json")
      : walkthroughOutput(),
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
