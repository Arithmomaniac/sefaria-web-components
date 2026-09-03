import { tmpdir } from "node:os";
import { join } from "node:path";

import { chromium, type Page } from "playwright";
import { createServer } from "vite";

const SCREENSHOT_PATH = join(tmpdir(), "sefaria-text-segment-live-app.png");
const server = await createServer({
  root: "demos/text-segment-live-demo",
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

  for (const preset of [
    "hebrew",
    "english-footnote",
    "hebrew-markup",
    "missing",
    "range",
  ]) {
    await page.locator(`[data-demo-id="${preset}"]`).click();
    await waitForTerminalState(page);
    const result = await readResult(page);
    console.log(
      `${preset}|${result.state}|direction=${result.direction}|footnotes=${result.footnotes}`,
    );
  }

  await page.locator('[data-demo-id="english-footnote"]').click();
  await waitForTerminalState(page);
  const pageProof = await page.evaluate(() => {
    const form = document.querySelector("#text-request-form");
    const presets = document.querySelectorAll("[data-demo-request]");
    const element = document.querySelector("sefaria-text-segment");
    return {
      form: form instanceof HTMLFormElement,
      presetCount: presets.length,
      elementName: element?.localName ?? null,
      shadowRoot: element?.shadowRoot !== null,
    };
  });
  console.log(
    `page|form=${pageProof.form}|presets=${pageProof.presetCount}|element=${pageProof.elementName}|shadowRoot=${pageProof.shadowRoot ? "open" : "missing"}`,
  );
  await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true });
  console.log("png|generated=true|fullPage=true");
} finally {
  await browser.close();
  await server.close();
}

async function waitForTerminalState(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const state = document.querySelector<HTMLElement>("#request-state");
    return (
      state?.dataset.state !== undefined &&
      state.dataset.state !== "initial" &&
      state.dataset.state !== "loading"
    );
  });
}

async function readResult(page: Page): Promise<{
  readonly state: string;
  readonly direction: string;
  readonly footnotes: number | string;
}> {
  return await page.locator("sefaria-text-segment").evaluate((element) => {
    const component = element as HTMLElement & {
      viewModel?: {
        readonly state: string;
        readonly direction?: string;
      };
    };
    return {
      state: component.viewModel?.state ?? "missing",
      direction: component.viewModel?.direction ?? "-",
      footnotes:
        component.shadowRoot?.querySelectorAll(".footnotes li").length ?? "-",
    };
  });
}
