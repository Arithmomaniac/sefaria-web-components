import { spawn } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { URL } from "node:url";

import { chromium } from "playwright";

const root = path.resolve(import.meta.dirname, "..");
const port = 4179;
const origin = `http://127.0.0.1:${port}`;
const screenshotDirectory = process.env.SITE_SCREENSHOT_DIR;
const server = startPreview();

try {
  await waitForServer();
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 900 },
    });
    const externalRequests = [];
    page.on("request", (request) => {
      if (request.url().startsWith("https://www.sefaria.org/")) {
        externalRequests.push(request.url());
      }
    });
    const fixture = JSON.parse(
      await readFile(
        path.join(root, "examples", "react-vite", "src", "micah-6-8.json"),
        "utf8",
      ),
    );
    await page.route(
      "https://www.sefaria.org/api/v3/texts/**",
      async (route) => {
        await route.fulfill({ json: fixture });
      },
    );

    await page.goto(origin, { waitUntil: "networkidle" });
    await assertText(page.locator("h1"), "Sefaria Frontend Toolkit");
    await assertText(page.locator("body"), "Development preview");
    assertEqual(externalRequests.length, 0, "landing request count");
    await capture(page, "site-landing.png");

    const learnLink = page.getByRole("link", {
      name: "Learn step by step",
      exact: true,
    });
    await learnLink.waitFor();
    await Promise.all([
      page.waitForURL("**/learn/01-web-components.html"),
      learnLink.click(),
    ]);
    await page
      .getByRole("heading", {
        name: "1. Understand Web Components and toolkit ownership",
      })
      .waitFor();
    const authored = page.frameLocator(
      'iframe[title="Authored request-free component states"]',
    );
    await authored
      .getByRole("heading", { name: "Source card", exact: true })
      .waitFor();
    const authoredSource = await authored
      .locator("[data-repository-source]")
      .getAttribute("href");
    if (
      authoredSource !==
      "https://github.com/Arithmomaniac/sefaria-web-components/blob/feature/avilevin/frontend-toolkit-alpha/examples/explorer/src/authored/source-card.scenarios.ts"
    ) {
      const authoredFrame = page
        .frames()
        .find((frame) => frame.url().includes("/examples/explorer/authored"));
      throw new Error(
        `Unexpected authored source link: ${authoredSource}; frame: ${authoredFrame?.url()}`,
      );
    }
    assertEqual(externalRequests.length, 0, "authored lesson request count");

    const liveLessons = {
      "03-live-data": [
        [
          "open the source-card explorer",
          "/examples/explorer/source-card.html",
        ],
      ],
      "04-reader": [
        ["open the controlled Reader", "/examples/reader/controlled.html"],
        ["open the spatial Reader", "/examples/reader/index.html"],
      ],
    };
    for (const [lesson, links] of Object.entries(liveLessons)) {
      externalRequests.length = 0;
      await page.goto(`${origin}/learn/${lesson}.html`, {
        waitUntil: "networkidle",
      });
      assertEqual(
        externalRequests.length,
        0,
        `${lesson} unsolicited request count`,
      );
      await assertText(page.locator("body"), "Explicit live action");
      for (const [name, expectedPath] of links) {
        const link = page.getByRole("link", { name });
        const href = await link.getAttribute("href");
        assertEqual(
          new URL(href, page.url()).pathname,
          expectedPath,
          `${name} route`,
        );
        assertEqual(
          await link.getAttribute("target"),
          "_self",
          `${name} target`,
        );
      }
      if (lesson === "03-live-data") {
        await Promise.all([
          page.waitForURL("**/examples/explorer/source-card.html"),
          page.getByRole("link", { name: links[0][0] }).click(),
        ]);
        await page.locator("#source-card-form").waitFor();
      }
    }

    await page.goto(`${origin}/examples.html`, { waitUntil: "networkidle" });
    await page.goto(`${origin}/examples/explorer/index.html`, {
      waitUntil: "networkidle",
    });
    for (const [name, expectedPath] of [
      ["Prebuilt Reader", "/examples/reader/controlled.html"],
      ["Custom spatial Reader", "/examples/reader/"],
      ["Authored linked article", "/examples/linked-article/"],
    ]) {
      assertEqual(
        new URL(
          await page.getByRole("link", { name }).getAttribute("href"),
          origin,
        ).pathname,
        expectedPath,
        `${name} route`,
      );
    }

    await page.goto(`${origin}/examples.html`, { waitUntil: "networkidle" });
    const sourceHref = await page
      .getByRole("link", { name: "examples/react-vite" })
      .getAttribute("href");
    if (
      sourceHref !==
      "https://github.com/Arithmomaniac/sefaria-web-components/tree/feature/avilevin/frontend-toolkit-alpha/examples/react-vite"
    ) {
      throw new Error(`Unexpected React source link: ${sourceHref}`);
    }

    await page.goto(`${origin}/examples/react/index.html`, {
      waitUntil: "networkidle",
    });
    await assertText(page.locator("#request-count"), "Host request count: 0");
    const preview = page.locator("#preview");
    const initialCard = page.locator("sefaria-source-card");
    const initialHandle = await initialCard.elementHandle();
    await page.locator("#theme-toggle").click();
    assertEqual(
      await preview.getAttribute("data-theme"),
      "dark",
      "React theme",
    );
    await page.locator("#preview-width").fill("480");
    assertEqual(
      await preview.evaluate((element) => element.style.maxWidth),
      "480px",
      "React preview width",
    );
    await page.locator("#load-live").click();
    await page.waitForFunction(
      () =>
        globalThis.document
          .querySelector("#request-status")
          ?.textContent?.includes("Loaded Micah 6:8.") === true,
    );
    await assertText(page.locator("#request-count"), "Host request count: 1");
    await assertText(page.locator("#request-status"), "Loaded Micah 6:8.");
    const nextHandle = await initialCard.elementHandle();
    assertEqual(
      await initialHandle.evaluate(
        (element, next) => element === next,
        nextHandle,
      ),
      true,
      "React element identity",
    );
    await capture(page, "site-react.png");

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${origin}/learn/05-customization.html`, {
      waitUntil: "networkidle",
    });
    const widths = await page.evaluate(() => ({
      viewport: globalThis.document.documentElement.clientWidth,
      content: globalThis.document.documentElement.scrollWidth,
    }));
    if (widths.content > widths.viewport + 1) {
      throw new Error(
        `Mobile documentation overflows horizontally: ${JSON.stringify(widths)}`,
      );
    }
    await page.keyboard.press("Tab");
    const focusedTag = await page.evaluate(
      () => globalThis.document.activeElement?.tagName,
    );
    if (focusedTag === undefined || focusedTag === "BODY") {
      throw new Error(
        "Keyboard navigation did not reach an interactive control.",
      );
    }
    await capture(page, "site-mobile.png");

    await page.goto(`${origin}/examples/mcp-app/index.html?fixture=1`, {
      waitUntil: "networkidle",
    });
    await assertText(page.locator("body"), "Static fixture preview");
    await capture(page, "site-mcp-fixture.png");
  } finally {
    await browser.close();
  }
} finally {
  server.kill();
}

function startPreview() {
  return spawn(
    process.execPath,
    [
      path.join(root, "node_modules", "vitepress", "bin", "vitepress.js"),
      "preview",
      "docs",
      "--host",
      "127.0.0.1",
      "--port",
      String(port),
    ],
    {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
}

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (server.exitCode !== null) {
      throw new Error(`VitePress preview exited with code ${server.exitCode}.`);
    }
    try {
      const response = await globalThis.fetch(origin);
      if (response.ok) return;
    } catch {
      // The preview server is still starting.
    }
    await new Promise((resolve) => globalThis.setTimeout(resolve, 250));
  }
  throw new Error("VitePress preview did not become ready.");
}

async function assertText(locator, expected) {
  const text = await locator.textContent();
  if (!text?.includes(expected)) {
    throw new Error(
      `Expected ${JSON.stringify(expected)} in ${JSON.stringify(text)}.`,
    );
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(
      `${label}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}.`,
    );
  }
}

async function capture(page, filename) {
  if (!screenshotDirectory) return;
  await mkdir(screenshotDirectory, { recursive: true });
  await page.screenshot({
    path: path.join(screenshotDirectory, filename),
    fullPage: true,
  });
}
