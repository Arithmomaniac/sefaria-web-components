import net from "node:net";

import {
  chromium,
  type BrowserContext,
  type Locator,
  type Page,
} from "playwright";

export async function reserveVscodeDebuggingPort(): Promise<number> {
  for (let port = 9_229; port <= 9_329; port += 1) {
    const server = net.createServer();
    const available = await new Promise<boolean>((resolve) => {
      server.once("error", () => resolve(false));
      server.listen(port, "127.0.0.1", () => resolve(true));
    });
    if (!available) continue;
    await new Promise<void>((resolve, reject) => {
      server.close((error) =>
        error === undefined ? resolve() : reject(error),
      );
    });
    return port;
  }
  throw new Error("Could not reserve a VS Code debugging port from 9229-9329.");
}

export async function connectToVscode(port: number) {
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

export async function findVscodeWorkbench(
  context: BrowserContext,
): Promise<Page> {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    const page = context
      .pages()
      .find((candidate) => candidate.url().includes("workbench/workbench"));
    if (page !== undefined) return page;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(
    `Could not find the VS Code workbench page. Pages: ${context
      .pages()
      .map((page) => page.url())
      .join(", ")}`,
  );
}

export async function openVscodeChat(page: Page): Promise<void> {
  const input = chatInput(page);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await page.keyboard.press("Control+Alt+I");
    try {
      await input.waitFor({ state: "visible", timeout: 30_000 });
      return;
    } catch (error) {
      if (!(error instanceof Error) || error.name !== "TimeoutError")
        throw error;
      await page.waitForTimeout(5_000);
    }
  }
  throw new Error("VS Code Copilot Chat did not open within 100 seconds.");
}

export async function selectExclusiveVscodeChatToolGroup(
  page: Page,
  serverName: string,
): Promise<void> {
  const button = page
    .locator(
      '[aria-label*="Configure Tools"], [title*="Configure Tools"], [aria-label*="Tools"]',
    )
    .last();
  await button.waitFor({ state: "visible", timeout: 30_000 });
  await button.click();
  const picker = page.locator(".quick-input-widget").last();
  await picker.waitFor({ state: "visible", timeout: 10_000 });
  const builtInRow = picker
    .locator(".monaco-list-row")
    .filter({ hasText: /^Built-In/ })
    .first();
  await builtInRow.waitFor({ state: "visible", timeout: 10_000 });
  await setToolGroupSelected(builtInRow, false, "Built-In");
  const serverRow = picker
    .locator(".monaco-list-row")
    .filter({ hasText: serverName })
    .last();
  await serverRow.waitFor({ state: "visible", timeout: 10_000 });
  await setToolGroupSelected(serverRow, true, serverName);
  await picker
    .getByText("1 Selected", { exact: true })
    .waitFor({ state: "visible", timeout: 10_000 });
  await picker.getByRole("button", { name: "OK" }).click();
}

function chatInput(page: Page): Locator {
  return page
    .locator(
      ".interactive-input-part .monaco-editor, .chat-input-container .monaco-editor",
    )
    .last();
}

async function setToolGroupSelected(
  row: Locator,
  selected: boolean,
  label: string,
): Promise<void> {
  const checkbox = row
    .locator('[role="checkbox"], .monaco-custom-toggle')
    .first();
  const expected = String(selected);
  if ((await checkbox.getAttribute("aria-checked")) !== expected) {
    await checkbox.click();
    await checkbox.waitFor({ state: "visible" });
    if ((await checkbox.getAttribute("aria-checked")) !== expected) {
      throw new Error(
        `The ${label} tool group could not be ${selected ? "enabled" : "disabled"}.`,
      );
    }
  }
}
