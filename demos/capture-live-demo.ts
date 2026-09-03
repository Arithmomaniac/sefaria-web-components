import { chromium, type Page } from "playwright";
import { createServer } from "vite";

/** Shared browser setup for one live-demo capture script. */
export interface CaptureLiveDemoOptions {
  readonly root: string;
  readonly presets: readonly string[];
  readonly capturePreset: (page: Page, preset: string) => Promise<string>;
  readonly afterPresets?: (page: Page) => Promise<void>;
}

/** Runs all configured live-demo presets against a temporary Vite server. */
export async function captureLiveDemo(
  options: CaptureLiveDemoOptions,
): Promise<void> {
  const server = await createServer({
    root: options.root,
    logLevel: "silent",
    server: { host: "127.0.0.1", port: 0 },
  });
  await server.listen();
  const pageUrl = server.resolvedUrls?.local[0];
  if (!pageUrl) {
    await server.close();
    throw new Error("Vite did not expose the live demo URL.");
  }

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    });
    await page.goto(pageUrl, { waitUntil: "networkidle" });
    await waitForTerminalState(page);

    for (const preset of options.presets) {
      await page.locator(`[data-demo-id="${preset}"]`).click();
      await waitForTerminalState(page);
      console.log(await options.capturePreset(page, preset));
    }

    await options.afterPresets?.(page);
  } finally {
    await browser.close();
    await server.close();
  }
}

/** Waits until the mounted demo reports a terminal host state. */
export async function waitForTerminalState(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const state = document.querySelector<HTMLElement>("#request-state");
    return (
      state?.dataset.state !== undefined &&
      state.dataset.state !== "initial" &&
      state.dataset.state !== "loading"
    );
  });
}
