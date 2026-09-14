import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { chromium, type Frame, type Page } from "playwright";

import { startLocalEnvironment } from "./local-environment.js";

const linksFixture = JSON.parse(
  await readFile(
    new URL(
      "../../../../packages/client/test/fixtures/links-connections-preview-2026-09-06.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as Array<Record<string, unknown>>;
const textFixture = JSON.parse(
  await readFile(
    new URL(
      "../../../../packages/client/test/fixtures/v3-text-spanning-2026-08-29.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as Record<string, unknown> & {
  versions: Array<Record<string, unknown>>;
};

const requests: string[] = [];
const environment = await startLocalEnvironment({
  fetch: async (input, init) => {
    const url = new URL(
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url,
    );
    requests.push(url.href);
    if (url.pathname.startsWith("/api/v3/texts/")) {
      const reference = decodeURIComponent(
        url.pathname.slice("/api/v3/texts/".length),
      );
      if (reference === "Invalid 1:1") {
        return Response.json({ versions: "wrong" });
      }
      if (reference === "Denied 1:1") {
        return new Response("denied", { status: 503 });
      }
      if (reference === "Slow 1:1") {
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(resolve, 2_000);
          init?.signal?.addEventListener(
            "abort",
            () => {
              clearTimeout(timer);
              reject(new DOMException("Aborted", "AbortError"));
            },
            { once: true },
          );
        });
      }
      return Response.json(textPayload(reference));
    }
    if (url.pathname.startsWith("/api/links/")) {
      return Response.json(linksFixture);
    }
    throw new Error(`Unexpected deterministic request ${url.href}.`);
  },
});

const browser = await chromium.launch({ headless: true });
const browserDiagnostics: string[] = [];
const result = {
  sdk: {
    apps: "1.7.5",
    base: "1.30.0",
  },
  origins: {
    host: environment.hostUrl.origin,
    sandbox: environment.sandboxUrl.origin,
  },
  stages: [] as Array<{ readonly name: string; readonly requests: string[] }>,
};

try {
  await verifyCompiledStdio();
  result.stages.push({ name: "compiled stdio protocol", requests: [] });
  const page = await browser.newPage();
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      browserDiagnostics.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) =>
    browserDiagnostics.push(`pageerror: ${error.message}`),
  );
  await page.goto(new URL("?auto=text", environment.hostUrl).href);
  const app = await waitForAppFrame(page);
  await app.locator("sefaria-reader").waitFor();
  await waitForRequestCount(2);
  assertSequence(requests, [
    ["/api/v3/texts/Micah%206%3A8", null],
    ["/api/links/Micah%206%3A8", "1"],
  ]);
  record("text seed and continuation");

  const beforeLocal = requests.length;
  await dispatchReaderEvent(app, "sefaria-reader-connections-category-change", {
    category: "Commentary",
  });
  await dispatchReaderEvent(app, "sefaria-reader-connections-page-change", {
    page: 0,
  });
  await dispatchReaderEvent(
    app,
    "sefaria-reader-connections-preview-request",
    {},
  );
  await page.waitForTimeout(100);
  if (requests.length !== beforeLocal) {
    throw new Error("Covered local projection unexpectedly called a tool.");
  }
  record("local category page and covered preview");

  const targetRef = await app.locator("sefaria-reader").evaluate((reader) => {
    const model = (
      reader as HTMLElement & {
        viewModel: {
          currentEntryId: string;
          connections?: {
            state: string;
            viewModel?: {
              state: string;
              entries?: Array<{ targetRef: string }>;
            };
          };
        };
      }
    ).viewModel;
    if (
      model.connections?.state !== "component" ||
      model.connections.viewModel?.state !== "data"
    ) {
      throw new Error("Reader connections are unavailable.");
    }
    const target = model.connections.viewModel.entries?.[0]?.targetRef;
    if (!target)
      throw new Error("No deterministic connection target is available.");
    return target;
  });
  const beforeConnection = requests.length;
  await dispatchReaderEvent(app, "sefaria-reader-connection-select", {
    targetRef,
  });
  await waitForRequestCount(beforeConnection + 2);
  await page.waitForTimeout(100);
  const connectionRequests = requests.slice(beforeConnection);
  const sourceRequests = connectionRequests.filter((url) =>
    new URL(url).pathname.startsWith("/api/v3/texts/"),
  ).length;
  const linksRequests = connectionRequests.filter((url) =>
    new URL(url).pathname.startsWith("/api/links/"),
  ).length;
  if (sourceRequests < 1 || sourceRequests > 2 || linksRequests !== 1) {
    throw new Error(
      `Connection qualification sequence was ${JSON.stringify(connectionRequests)}.`,
    );
  }
  record("connection qualification");

  const beforeHistory = requests.length;
  await app.locator("sefaria-reader").evaluate((reader) => {
    const element = reader as HTMLElement & {
      viewModel: {
        currentEntryId: string;
        breadcrumbs: Array<{ entryId: string }>;
      };
    };
    const root = element.viewModel.breadcrumbs[0];
    if (!root) throw new Error("Reader root breadcrumb is missing.");
    element.dispatchEvent(
      new CustomEvent("sefaria-reader-history-activate", {
        detail: {
          originEntryId: element.viewModel.currentEntryId,
          entryId: root.entryId,
        },
      }),
    );
  });
  await page.waitForTimeout(100);
  if (requests.length !== beforeHistory) {
    throw new Error("Retained history unexpectedly called a tool.");
  }
  record("retained history");

  await callFromHost(page, "get_text", "Invalid 1:1");
  await waitForInnerBody(page, "/versions");
  record("invalid payload path");

  await callFromHost(page, "get_text", "Denied 1:1");
  await waitForInnerBody(page, "503");
  record("denied tool call");

  const beforeStale = requests.length;
  await callFromHost(page, "get_text", "Slow 1:1");
  await waitForRequestCount(beforeStale + 1);
  await callFromHost(page, "get_text", "Micah 6:8");
  await waitForRequestCount(beforeStale + 3);
  const currentApp = await waitForAppFrame(page);
  await currentApp.locator("sefaria-reader").waitFor();
  if (
    requests
      .slice(beforeStale)
      .some((request) => new URL(request).pathname.includes("/api/links/Slow"))
  ) {
    throw new Error("The cancelled stale source call continued into links.");
  }
  record("cancellation and stale completion");

  await page.selectOption("#tool-name", "get_links_between_texts");
  await page.fill("#reference", "Micah 6:8");
  const beforeLinksSeed = requests.length;
  await page.click('button[type="submit"]');
  await waitForRequestCount(beforeLinksSeed + 1);
  await page.waitForTimeout(200);
  if (requests.length !== beforeLinksSeed + 1) {
    throw new Error("Links-seeded admission made a continuation request.");
  }
  record("links seed without continuation");

  const artifacts = path.resolve(".artifacts", "mcp-app");
  await mkdir(artifacts, { recursive: true });
  await page.screenshot({
    path: path.join(artifacts, "reference-host.png"),
    fullPage: true,
  });
  await writeFile(
    path.join(artifacts, "browser-e2e.json"),
    `${JSON.stringify({ ...result, requests }, null, 2)}\n`,
  );
  process.stdout.write(`${JSON.stringify({ ...result, requests }, null, 2)}\n`);
} finally {
  await Promise.all([browser.close(), environment.close()]);
}

function record(name: string): void {
  result.stages.push({ name, requests: [...requests] });
}

async function verifyCompiledStdio(): Promise<void> {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [fileURLToPath(new URL("stdio.js", import.meta.url))],
    stderr: "pipe",
  });
  const client = new Client({ name: "stdio-acceptance", version: "0.0.0" });
  await client.connect(transport as Parameters<typeof client.connect>[0]);
  const tools = await client.listTools();
  if (
    tools.tools.map((tool) => tool.name).join(",") !==
    "get_text,get_links_between_texts"
  ) {
    throw new Error("The compiled stdio server did not expose both tools.");
  }
  const resource = await client.readResource({
    uri: "ui://sefaria/source-card.html",
  });
  if (resource.contents[0]?.mimeType !== "text/html;profile=mcp-app") {
    throw new Error(
      "The compiled stdio server did not serve the packaged App.",
    );
  }
  await client.close();
}

async function waitForAppFrame(page: Page): Promise<Frame> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    for (const frame of page.frames()) {
      if ((await frame.locator("sefaria-reader").count()) > 0) return frame;
    }
    await page.waitForTimeout(50);
  }
  const status = await page
    .locator("#status")
    .textContent()
    .catch(() => null);
  const frames = page.frames().map((frame) => frame.url());
  const bodies = await Promise.all(
    page.frames().map((frame) =>
      frame
        .locator("body")
        .innerText()
        .catch(() => "<unavailable>"),
    ),
  );
  throw new Error(
    `The packaged App did not initialize in the sandbox. Status: ${status}. Frames: ${JSON.stringify(frames)}. Bodies: ${JSON.stringify(bodies)}. ${browserDiagnostics.join(" | ")}`,
  );
}

async function dispatchReaderEvent(
  frame: Frame,
  name: string,
  detail: Record<string, unknown>,
): Promise<void> {
  await frame.locator("sefaria-reader").evaluate(
    (reader, event) => {
      const element = reader as HTMLElement & {
        viewModel: { currentEntryId: string };
      };
      element.dispatchEvent(
        new CustomEvent(event.name, {
          detail: {
            originEntryId: element.viewModel.currentEntryId,
            ...event.detail,
          },
        }),
      );
    },
    { name, detail },
  );
}

async function callFromHost(
  page: Page,
  tool: "get_text" | "get_links_between_texts",
  tref: string,
): Promise<void> {
  await page.selectOption("#tool-name", tool);
  await page.fill("#reference", tref);
  await page.click('button[type="submit"]');
}

async function waitForInnerBody(page: Page, expected: string): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    for (const frame of page.frames()) {
      const body = await frame
        .locator("body")
        .innerText()
        .catch(() => "");
      if (body.includes(expected)) return;
    }
    await page.waitForTimeout(50);
  }
  throw new Error(`No App frame rendered ${JSON.stringify(expected)}.`);
}

async function waitForRequestCount(expected: number): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (requests.length >= expected) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(
    `Expected ${expected} deterministic requests, observed ${requests.length}.`,
  );
}

function assertSequence(
  actual: readonly string[],
  expected: ReadonlyArray<readonly [string, string | null]>,
): void {
  const normalized = actual.slice(0, expected.length).map((item) => {
    const url = new URL(item);
    return [url.pathname, url.searchParams.get("with_text")] as const;
  });
  if (JSON.stringify(normalized) !== JSON.stringify(expected)) {
    throw new Error(
      `Expected request sequence ${JSON.stringify(expected)}, received ${JSON.stringify(normalized)}.`,
    );
  }
}

function textPayload(reference: string) {
  const payload = structuredClone(textFixture);
  const sectionRef = reference;
  const book = sectionRef.split(" ")[0] ?? "Micah";
  const coordinates = reference.match(/(\d+)(?::(\d+))?$/);
  const sections = coordinates
    ? [coordinates[1]!, ...(coordinates[2] ? [coordinates[2]] : [])]
    : ["1"];
  return {
    ...payload,
    ref: reference,
    heRef: reference,
    sections,
    toSections: sections,
    sectionRef,
    heSectionRef: sectionRef,
    firstAvailableSectionRef: reference,
    isSpanning: false,
    spanningRefs: [],
    next: null,
    prev: null,
    title: sectionRef,
    book,
    heTitle: book,
    indexTitle: book,
    heIndexTitle: book,
    titleVariants: [book],
    heTitleVariants: [book],
    versions: payload.versions.map((version) => ({
      ...version,
      versionTitle: "Deterministic bounded source",
      text: coordinates?.[2]
        ? `Deterministic text for ${reference}.`
        : [`Deterministic text for ${reference}.`],
    })),
  };
}
