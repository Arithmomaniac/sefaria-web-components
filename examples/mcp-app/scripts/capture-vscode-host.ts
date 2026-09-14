import {
  copyFile,
  mkdir,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

import { type Browser, type Frame, type Locator, type Page } from "playwright";
import { format } from "prettier";

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
import { launchVscodeProcess } from "./vscode-process.js";
import {
  maintainedCapturePath,
  obsoleteCapturePaths,
} from "./vscode-walkthrough-artifacts.js";

const workspace = path.resolve(import.meta.dirname, "../../..");
const executablePath = resolveVscodeExecutable();
const profile = resolveVscodeDemoProfile();
const output =
  process.env.VSCODE_MCP_SCREENSHOT ??
  path.resolve(workspace, "docs/images/mcp-app-vscode.png");
const captureRequested = process.argv.includes("--capture");
const CONNECTIONS_REFERENCE = "Micah 6:8";
const ACTION_PAUSE_MS = 650;
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

const captureDirectory = path.join(
  workspace,
  ".artifacts",
  "vscode-mcp",
  crypto.randomUUID(),
);
const failureOutput = path.join(captureDirectory, "failure.png");
const resultOutput =
  process.env.VSCODE_MCP_RESULT === undefined
    ? captureRequested
      ? walkthroughOutput()
      : path.join(workspace, ".artifacts", "vscode-mcp", "walkthrough.json")
    : path.resolve(workspace, process.env.VSCODE_MCP_RESULT);
await mkdir(captureDirectory, { recursive: true });
await prepareVscodeDemoProfile(profile, workspace);
await clearVscodeDemoRuntimeState(profile);

const debuggingPort = await reserveVscodeDebuggingPort();
const code = await launchVscodeProcess(
  executablePath,
  createVscodeLaunchArguments(profile, workspace, {
    debuggingPort,
    wait: true,
  }),
  {
    cwd: workspace,
    environment: createVscodeEnvironment(profile),
    scratchDirectory: profile.root,
  },
);
let browser: Browser | undefined;
let page: Page | undefined;

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
  if (captureRequested) {
    await prepareShowcaseLayout(page);
  }
  const seenAppFrames = new Set<Frame>();

  currentStage = "reader-initial";
  await submitPrompt(
    page,
    `Use the sefaria-components-demo get_text tool to show ${CONNECTIONS_REFERENCE} in both languages.`,
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
  await captureStage(readerFrame, "reader-initial");

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
  await captureStage(readerFrame, "connections");
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
  await captureStage(readerFrame, "connections-category");
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
  await captureStage(readerFrame, "connections-page-2");
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
  await captureStage(readerFrame, "connected-source");
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
  await captureStage(readerFrame, "reader-hierarchy");
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
  await captureStage(readerFrame, "chat-export");
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
  await captureStage(readerFrame, "reader-breadcrumb-middle");
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
  await captureStage(readerFrame, "reader-breadcrumb-root");
  completedStages.push(currentStage);

  const result = {
    status: "passed",
    mode: captureRequested ? "capture" : "walkthrough",
    launch: {
      pid: code.pid,
      minimized: true,
      cdpAttached: true,
    },
    completedStages,
    selectedReference,
    hierarchyReferences,
    artifacts,
    deliveryModes,
  };
  const stagedResult = path.join(captureDirectory, "walkthrough.json");
  await writeWalkthroughResult(page, result, stagedResult);
  if (captureRequested) {
    await mkdir(path.dirname(output), { recursive: true });
    for (const [destination, staged] of stagedCaptures) {
      await copyFile(staged, destination);
    }
    await Promise.all(
      obsoleteCapturePaths(output).map((filePath) =>
        rm(filePath, { force: true }),
      ),
    );
  }
  await mkdir(path.dirname(resultOutput), { recursive: true });
  await copyFile(stagedResult, resultOutput);
  await rm(captureDirectory, { recursive: true });
  console.log(`Completed VS Code MCP App walkthrough: ${resultOutput}`);
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
  await writeWalkthroughResult(
    page,
    {
      status: "failed",
      mode: captureRequested ? "capture" : "walkthrough",
      launch: {
        pid: code.pid,
        minimized: true,
        cdpAttached: page !== undefined,
      },
      completedStages,
      failedStage: currentStage,
      selectedReference,
      hierarchyReferences,
      artifacts,
      deliveryModes,
      error: error instanceof Error ? error.message : String(error),
    },
    path.join(captureDirectory, "failure.json"),
  ).catch((diagnosticError: unknown) => {
    console.error("Could not write capture failure details:", diagnosticError);
  });
  console.error(`Unpublished capture diagnostics: ${captureDirectory}`);
  throw error;
} finally {
  try {
    await browser?.close();
  } finally {
    await code.kill().catch(() => undefined);
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
  await send.click();
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
  await button.click();
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

async function captureStage(frame: Frame, name: string): Promise<void> {
  const filePath = maintainedCapturePath(name, output);
  if (!captureRequested || filePath === undefined) return;
  const staged = path.join(captureDirectory, path.basename(filePath));
  const previousZoom = await frame.evaluate(
    () => document.documentElement.style.zoom,
  );
  try {
    await prepareReaderForShowcaseCapture(frame);
    await frameReaderForCapture(frame, name === "reader-initial" ? 180 : 32);
    await writeFile(staged, await captureVscodeViewport(frame.page()));
  } finally {
    await frame.evaluate((zoom) => {
      document.documentElement.style.zoom = zoom;
    }, previousZoom);
  }
  stagedCaptures.set(filePath, staged);
  artifacts[name] = portableArtifactPath(filePath);
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

function walkthroughOutput(): string {
  const extension = path.extname(output);
  const base = extension === "" ? output : output.slice(0, -extension.length);
  return `${base}-walkthrough.json`;
}

async function writeWalkthroughResult(
  page: Page | undefined,
  result: Record<string, unknown>,
  filePath: string,
): Promise<void> {
  const userAgent =
    page === undefined
      ? undefined
      : await page.evaluate(() => navigator.userAgent).catch(() => undefined);
  const vscodeVersion = userAgent?.match(/\bCode\/([\d.]+)/u)?.[1];
  const copilotChatVersion = await resolveBundledCopilotVersion().catch(
    () => undefined,
  );
  if (
    result.status === "passed" &&
    (vscodeVersion === undefined || copilotChatVersion === undefined)
  ) {
    throw new Error(
      "The successful VS Code walkthrough could not determine exact host versions.",
    );
  }
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(
    filePath,
    await format(
      JSON.stringify({
        ...result,
        executable: path.basename(executablePath),
        hostVersions: {
          vscode: vscodeVersion,
          copilotChat: copilotChatVersion,
        },
        userAgent,
      }),
      { parser: "json" },
    ),
    "utf8",
  );
}

async function resolveBundledCopilotVersion(): Promise<string> {
  const installation = path.dirname(executablePath);
  const candidates = [
    path.join(
      installation,
      "resources",
      "app",
      "extensions",
      "copilot",
      "package.json",
    ),
  ];
  for (const entry of await readdir(installation, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    candidates.push(
      path.join(
        installation,
        entry.name,
        "resources",
        "app",
        "extensions",
        "copilot",
        "package.json",
      ),
    );
  }
  for (const candidate of candidates) {
    const source = await readFile(candidate, "utf8").catch(() => undefined);
    if (source === undefined) continue;
    const manifest = JSON.parse(source) as { readonly version?: unknown };
    if (typeof manifest.version === "string") return manifest.version;
  }
  throw new Error("Could not find the bundled GitHub Copilot manifest.");
}

function assertPanel(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
