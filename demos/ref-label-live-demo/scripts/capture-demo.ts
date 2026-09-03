import { chromium, type Page } from "playwright";
import { createServer } from "vite";

const server = await createServer({
  root: "demos/ref-label-live-demo",
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
  const page = await browser.newPage();
  await page.goto(pageUrl, { waitUntil: "networkidle" });
  await waitForTerminalState(page);

  for (const preset of [
    "segment",
    "range",
    "spanning",
    "commentary",
    "empty",
  ]) {
    await page.locator(`[data-demo-id="${preset}"]`).click();
    await waitForTerminalState(page);
    const result = await page
      .locator("sefaria-ref-label")
      .evaluate((element) => {
        const component = element as HTMLElement & {
          viewModel?: { readonly state: string; readonly url?: string };
        };
        return {
          state: component.viewModel?.state ?? "missing",
          url: component.viewModel?.url ?? "-",
          linked: component.shadowRoot?.querySelector("a") !== null,
        };
      });
    console.log(
      `${preset}|${result.state}|linked=${result.linked}|url=${result.url}`,
    );
  }
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
