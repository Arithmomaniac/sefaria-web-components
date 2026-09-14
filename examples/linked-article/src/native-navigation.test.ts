import { createServer as createNetServer } from "node:net";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";
import { createServer } from "vite";
import { expect, test } from "vitest";

test("keeps native Sefaria navigation when JavaScript is disabled", async () => {
  const tempDirectory = await mkdtemp(join(tmpdir(), "linked-article-"));
  const port = await reserveLoopbackPort();
  const root = fileURLToPath(new URL("..", import.meta.url));
  const server = await createServer({
    root,
    cacheDir: join(tempDirectory, "vite-cache"),
    server: { host: "127.0.0.1", port, strictPort: true },
  });
  const browser = await chromium.launch({ headless: true });

  try {
    await server.listen();
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.route("https://www.sefaria.org/**", async (route) => {
      await route.fulfill({
        contentType: "text/html",
        body: "<title>Sefaria destination</title>",
      });
    });
    await page.goto(`http://127.0.0.1:${port}/`);
    await page.getByRole("link", { name: "Micah 6:8" }).click();

    await expect
      .poll(() => page.url())
      .toBe("https://www.sefaria.org/Micah.6.8");
    expect(await page.locator("sefaria-popup").count()).toBe(0);
    await context.close();
  } finally {
    await browser.close();
    await server.close();
    await rm(tempDirectory, { recursive: true, force: true });
  }
}, 30_000);

async function reserveLoopbackPort(): Promise<number> {
  const server = createNetServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error === undefined ? resolve() : reject(error)));
  });
  if (address === null || typeof address === "string") {
    throw new Error("Unable to reserve a loopback port.");
  }
  return address.port;
}
