import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { URL } from "node:url";

import { chromium } from "playwright";

import { classifySiteRequest } from "./site-request-policy.mjs";
import { startSitePreview } from "./site-preview-server.mjs";

const root = path.resolve(import.meta.dirname, "..");
const screenshotDirectory = process.env.SITE_SCREENSHOT_DIR;
const previewServer = await startSitePreview({ root });
const { origin } = previewServer;

try {
  await previewServer.waitUntilReady();
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 900 },
    });
    const textRequests = [];
    const unexpectedRequests = [];
    const fixture = JSON.parse(
      await readFile(
        path.join(root, "examples", "react-vite", "src", "micah-6-8.json"),
        "utf8",
      ),
    );
    const linksFixture = JSON.parse(
      await readFile(
        path.join(
          root,
          "packages",
          "client",
          "test",
          "fixtures",
          "links-connections-preview-2026-09-06.json",
        ),
        "utf8",
      ),
    );
    await page.route("**/*", async (route) => {
      const request = route.request();
      const policy = classifySiteRequest({
        method: request.method(),
        requestUrl: request.url(),
        siteOrigin: origin,
      });
      if (policy === "local") {
        await route.continue();
        return;
      }
      if (policy === "text-fixture" || policy === "links-fixture") {
        textRequests.push(request.url());
        await route.fulfill({
          json: createFixtureResponse(
            request.url(),
            policy,
            fixture,
            linksFixture,
          ),
        });
        return;
      }
      unexpectedRequests.push(`${request.method()} ${request.url()}`);
      await route.abort("blockedbyclient");
    });

    await page.goto(origin, { waitUntil: "networkidle" });
    await assertText(page.locator("h1"), "Sefaria Frontend Toolkit");
    await assertText(page.locator("body"), "Development preview");
    assertEqual(textRequests.length, 0, "landing request count");
    await tabTo(
      page,
      page.getByRole("link", { name: "Skip to content" }),
      "landing skip link",
    );
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
    assertEqual(textRequests.length, 0, "authored lesson request count");

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
      textRequests.length = 0;
      await page.goto(`${origin}/learn/${lesson}.html`, {
        waitUntil: "networkidle",
      });
      assertEqual(
        textRequests.length,
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
        await tabTo(
          page,
          page.getByRole("button", { name: "Load source card" }),
          "source-card load action",
          30,
        );
        await page.locator("#request-state[data-state='data']").waitFor();
        assertEqual(
          textRequests.length,
          1,
          "source-card explicit request count",
        );
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

    textRequests.length = 0;
    await page.goto(`${origin}/learn/react.html`, {
      waitUntil: "networkidle",
    });
    const reactLesson = page.frameLocator(
      'iframe[title="React custom-element integration"]',
    );
    await reactLesson.locator("sefaria-source-card").waitFor();
    await assertText(
      reactLesson.locator("#selected-ref"),
      "Select the rendered segment",
    );
    assertEqual(textRequests.length, 0, "embedded React initial request count");
    await capture(page, "site-react-lesson.png");

    textRequests.length = 0;
    await page.goto(`${origin}/examples/vanilla/index.html`, {
      waitUntil: "networkidle",
    });
    await assertText(
      page.locator("#status"),
      "Rendered supplied Micah 6:8 data with zero requests.",
    );
    assertEqual(
      await page.locator("#status").getAttribute("data-request-count"),
      "0",
      "vanilla supplied-data host request count",
    );
    assertEqual(textRequests.length, 0, "vanilla supplied-data request count");
    await page.locator("#load-fixture").click();
    await page.locator("#status[data-request-count='1']").waitFor();
    await assertText(
      page.locator("#status"),
      "Loaded Micah 6:8 through the public client.",
    );
    assertEqual(
      textRequests.length,
      0,
      "vanilla injected-client network count",
    );

    await page.goto(`${origin}/examples/react/index.html`, {
      waitUntil: "networkidle",
    });
    textRequests.length = 0;
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
    assertEqual(textRequests.length, 1, "React explicit request count");
    const nextHandle = await initialCard.elementHandle();
    assertEqual(
      await initialHandle.evaluate(
        (element, next) => element === next,
        nextHandle,
      ),
      true,
      "React element identity",
    );
    await initialCard
      .getByRole("button", {
        name: "Show connections for Micah 6:8",
      })
      .first()
      .click();
    await page
      .locator("#selected-ref")
      .filter({ hasText: "React received selection: Micah 6:8." })
      .waitFor();
    await capture(page, "site-react.png");

    textRequests.length = 0;
    await page.goto(`${origin}/examples/reader/controlled.html`, {
      waitUntil: "networkidle",
    });
    await page.locator("sefaria-reader").waitFor();
    await page.waitForFunction(() => {
      const status = globalThis.document.querySelector("#status")?.textContent;
      return status !== undefined && !status.startsWith("Opening ");
    });
    const readerStatus = await page.locator("#status").textContent();
    if (!readerStatus?.startsWith("Showing ")) {
      throw new Error(
        `Controlled Reader did not load: ${readerStatus}; ${await page.locator("#host-error").textContent()}; fixtures: ${JSON.stringify(textRequests)}; denied: ${JSON.stringify(unexpectedRequests)}`,
      );
    }
    await tabTo(
      page,
      page.getByRole("button", { name: "Open reader" }),
      "Reader open action",
      10,
    );
    const sourceSelection = page
      .getByRole("button", { name: "Show connections for Micah 6:8" })
      .first();
    if ((await sourceSelection.count()) === 0) {
      const names = await page.getByRole("button").allTextContents();
      throw new Error(
        `Controlled Reader source action is missing; buttons: ${JSON.stringify(names)}`,
      );
    }
    await sourceSelection.click();
    await page
      .getByRole("button", { name: /Commentary/u })
      .first()
      .click();
    await page
      .getByRole("button", {
        name: "Open Rashi on Micah 6:8:1 in context",
      })
      .click();
    await page.waitForFunction(
      () =>
        globalThis.document
          .querySelector("#status")
          ?.textContent?.startsWith("Showing Rashi") === true,
    );
    const breadcrumbs = await page
      .locator("sefaria-reader")
      .evaluate((reader) =>
        reader.viewModel?.breadcrumbs?.map((entry) => entry.label),
      );
    if (!breadcrumbs?.includes("Micah 6")) {
      throw new Error(
        `Reader breadcrumb was not retained: ${JSON.stringify(breadcrumbs)}`,
      );
    }
    const rootBreadcrumb = page
      .getByRole("navigation", { name: "Reader history" })
      .getByRole("button", { name: "Micah 6", exact: true });
    await rootBreadcrumb.waitFor();
    assertEqual(textRequests.length, 5, "Reader navigation request count");
    const beforePaneSwitch = textRequests.length;
    await page.setViewportSize({ width: 600, height: 900 });
    await page.getByRole("button", { name: "Text", exact: true }).click();
    await page
      .getByRole("button", { name: "Connections", exact: true })
      .click();
    assertEqual(
      textRequests.length,
      beforePaneSwitch,
      "Reader display-only request count",
    );
    await rootBreadcrumb.click();
    await assertText(page.locator("#status"), "Showing Micah 6.");
    assertEqual(textRequests.length, 5, "Reader breadcrumb request count");
    await capture(page, "site-reader.png");

    textRequests.length = 0;
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`${origin}/examples/linked-article/`, {
      waitUntil: "networkidle",
    });
    const citation = page.getByRole("link", { name: "Micah 6:8", exact: true });
    await tabTo(page, citation, "linked-article citation", 10);
    await page.keyboard.press("Enter");
    await page.getByRole("button", { name: "Close source preview" }).waitFor();
    assertEqual(textRequests.length, 1, "linked popup request count");
    await capture(page, "site-linked-popup.png");

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
    await tabTo(
      page,
      page.getByRole("link", { name: "Use the Reader", exact: true }),
      "mobile lesson prerequisite link",
      30,
    );
    await capture(page, "site-mobile.png");

    await page.goto(`${origin}/examples/mcp-app/index.html?fixture=1`, {
      waitUntil: "networkidle",
    });
    await assertText(page.locator("body"), "Static fixture preview");
    await tabTo(
      page,
      page.getByRole("button", { name: "Commentary (3)", exact: true }),
      "static MCP preview Commentary action",
      20,
    );
    await capture(page, "site-mcp-fixture.png");
    assertEqual(
      unexpectedRequests.length,
      0,
      `unapproved outbound requests: ${unexpectedRequests.join(", ")}`,
    );
  } finally {
    await browser.close();
  }
} finally {
  await previewServer.close();
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

async function tabTo(page, locator, label, maximumTabs = 15) {
  await locator.waitFor();
  for (let index = 0; index < maximumTabs; index += 1) {
    await page.keyboard.press("Tab");
    if (await locator.evaluate((element) => element.matches(":focus"))) {
      return;
    }
  }
  throw new Error(`Keyboard navigation did not reach ${label}.`);
}

function createFixtureResponse(requestUrl, policy, textFixture, linksFixture) {
  const url = new URL(requestUrl);
  const reference = decodeURIComponent(url.pathname.split("/").at(-1) ?? "");
  if (policy === "text-fixture") {
    if (reference === "Micah 6:8") return textFixture;
    const target = globalThis.structuredClone(textFixture);
    const rashi = reference.startsWith("Rashi");
    const section =
      reference === "Micah 6" || reference === "Rashi on Micah 6:8";
    const sections = rashi
      ? section
        ? ["6", "8"]
        : ["6", "8", "1"]
      : section
        ? ["6"]
        : ["6", "8"];
    Object.assign(target, {
      ref: reference,
      heRef: reference,
      sectionRef: reference,
      heSectionRef: reference,
      book: rashi ? "Rashi on Micah" : "Micah",
      indexTitle: rashi ? "Rashi on Micah" : "Micah",
      heIndexTitle: rashi ? "Rashi on Micah" : "Micah",
      title: reference,
      sections,
      toSections: sections,
      sectionNames: rashi
        ? ["Chapter", "Verse", "Comment"]
        : ["Chapter", "Verse"],
      addressTypes: rashi
        ? ["Integer", "Integer", "Integer"]
        : ["Integer", "Integer"],
      textDepth: rashi ? 3 : 2,
      versions: target.versions.map((version) => ({
        ...version,
        text: section
          ? Array.from({ length: rashi ? 1 : 16 }, (_, index) =>
              rashi
                ? `Fixture text for Rashi on Micah 6:8:${index + 1}`
                : `Fixture text for Micah 6:${index + 1}`,
            )
          : `Fixture text for ${reference}`,
      })),
    });
    return target;
  }
  if (reference !== "Micah 6:8") return [];
  const base = globalThis.structuredClone(
    linksFixture.find((entry) => entry && !("isSheet" in entry)),
  );
  if (!base) throw new Error("Connections fixture has no text entry.");
  Object.assign(base, {
    _id: "site-reader-rashi",
    anchorRef: reference,
    anchorRefExpanded: [reference],
    sourceRef: "Rashi on Micah 6:8:1",
    ref: "Rashi on Micah 6:8:1",
    sourceHeRef: "Rashi on Micah 6:8:1",
    category: "Commentary",
    index_title: "Rashi on Micah",
  });
  return [base];
}
