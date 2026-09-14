import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { chromium, type Frame, type Page } from "playwright";

import { startLocalEnvironment } from "./local-environment.js";

interface RecordedRequest {
  readonly method: string;
  readonly origin: string;
  readonly url: string;
}

interface ReaderState {
  readonly currentEntryId: string;
  readonly label: string;
  readonly category: string | null;
  readonly page: number;
  readonly total: number;
  readonly targetRefs: readonly string[];
}

const linksFixture = JSON.parse(
  await readFile(
    new URL(
      "../../../../packages/client/test/fixtures/links-connections-preview-2026-09-06.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as Array<Record<string, unknown>>;
const deterministicLinksFixture = expandLinksFixture(linksFixture);
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

const requests: RecordedRequest[] = [];
const deterministicFetch = createDeterministicFetch(requests);
verifyExactSequenceRejectsDuplicates();
await verifyDeterministicFetchRejectsUnexpectedRequests(deterministicFetch);
const environment = await startLocalEnvironment({
  fetch: deterministicFetch,
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
  stages: [] as Array<{
    readonly name: string;
    readonly requests: readonly RecordedRequest[];
  }>,
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
  await waitForExactRequestCount(requests, 2);
  assertSequence(requests, [
    ["/api/v3/texts/Micah%206%3A8", null],
    ["/api/links/Micah%206%3A8", "1"],
  ]);
  record("text seed and continuation", 0);

  const beforeLocal = requests.length;
  const initialReaderState = await readReaderState(app);
  if (initialReaderState.category !== null || initialReaderState.page !== 0) {
    throw new Error(
      `Expected the initial connection projection to be the overview on page 0, received ${JSON.stringify(initialReaderState)}.`,
    );
  }
  await app.getByRole("button", { name: /^Commentary \(\d+\)$/ }).click();
  await waitForReaderState(app, {
    category: "Commentary",
    page: 0,
    total: 25,
  });
  await app.getByRole("button", { name: "More", exact: true }).click();
  const pagedReaderState = await waitForReaderState(app, {
    category: "Commentary",
    page: 1,
    total: 25,
  });
  if (pagedReaderState.targetRefs.length === 0) {
    throw new Error("Expected the second Commentary page to contain entries.");
  }
  await dispatchReaderEvent(
    app,
    "sefaria-reader-connections-preview-request",
    {},
  );
  await page.waitForTimeout(100);
  if (requests.length !== beforeLocal) {
    throw new Error("Covered local projection unexpectedly called a tool.");
  }
  record("local category page and covered preview", beforeLocal);

  const targetRef = pagedReaderState.targetRefs[0];
  if (!targetRef) {
    throw new Error("Expected a deterministic second-page connection target.");
  }
  const beforeConnection = requests.length;
  await app
    .getByRole("button", {
      name: `Open ${targetRef} in context`,
      exact: true,
    })
    .click();
  await waitForReaderState(app, { label: targetRef });
  await waitForExactRequestCount(requests, beforeConnection + 2);
  assertSequence(requests.slice(beforeConnection), [
    [`/api/v3/texts/${encodeURIComponent(targetRef)}`, null],
    [`/api/links/${encodeURIComponent(targetRef)}`, "1"],
  ]);
  record("connection qualification", beforeConnection);

  const childState = await readReaderState(app);
  const beforeBack = requests.length;
  await app.getByRole("button", { name: "Back", exact: true }).click();
  const rootAfterBack = await waitForReaderState(app, {
    currentEntryId: initialReaderState.currentEntryId,
  });
  if (rootAfterBack.label !== initialReaderState.label) {
    throw new Error(
      `Expected Back to restore ${initialReaderState.label}, received ${rootAfterBack.label}.`,
    );
  }
  assertNoRequestSince(beforeBack, "Back");
  record("local back", beforeBack);

  if (rootAfterBack.category !== "Commentary") {
    await app.getByRole("button", { name: /^Commentary \(\d+\)$/ }).click();
    await waitForReaderState(app, { category: "Commentary", page: 0 });
  }
  if ((await readReaderState(app)).page === 0) {
    await app.getByRole("button", { name: "More", exact: true }).click();
    await waitForReaderState(app, { category: "Commentary", page: 1 });
  }
  const beforeSecondConnection = requests.length;
  await app
    .getByRole("button", {
      name: `Open ${targetRef} in context`,
      exact: true,
    })
    .click();
  await waitForReaderState(app, { label: targetRef });
  await waitForExactRequestCount(requests, beforeSecondConnection + 2);
  assertSequence(requests.slice(beforeSecondConnection), [
    [`/api/v3/texts/${encodeURIComponent(targetRef)}`, null],
    [`/api/links/${encodeURIComponent(targetRef)}`, "1"],
  ]);
  record("history setup connection", beforeSecondConnection);

  const beforeHistory = requests.length;
  await app.locator('nav[aria-label="Reader history"] button').first().click();
  const rootAfterHistory = await waitForReaderState(app, {
    currentEntryId: initialReaderState.currentEntryId,
  });
  if (
    childState.currentEntryId === rootAfterHistory.currentEntryId ||
    rootAfterHistory.label !== initialReaderState.label
  ) {
    throw new Error(
      `Expected retained history to change from ${childState.currentEntryId} to ${initialReaderState.currentEntryId}.`,
    );
  }
  assertNoRequestSince(beforeHistory, "Retained history");
  record("retained history", beforeHistory);

  const beforeInvalid = requests.length;
  await callFromHost(page, "get_text", "Invalid 1:1");
  await waitForInnerBody(page, "/versions");
  await waitForExactRequestCount(requests, beforeInvalid + 1);
  record("invalid payload path", beforeInvalid);

  const beforeDenied = requests.length;
  await callFromHost(page, "get_text", "Denied 1:1");
  await waitForInnerBody(page, "503");
  await waitForExactRequestCount(requests, beforeDenied + 1);
  record("denied tool call", beforeDenied);

  const beforeStale = requests.length;
  await callFromHost(page, "get_text", "Slow 1:1");
  await waitForRequestCount(beforeStale + 1);
  await callFromHost(page, "get_text", "Micah 6:8");
  await waitForExactRequestCount(requests, beforeStale + 3);
  const currentApp = await waitForAppFrame(page);
  await currentApp.locator("sefaria-reader").waitFor();
  if (
    requests
      .slice(beforeStale)
      .some((request) =>
        new URL(request.url).pathname.includes("/api/links/Slow"),
      )
  ) {
    throw new Error("The cancelled stale source call continued into links.");
  }
  record("cancellation and stale completion", beforeStale);

  await page.selectOption("#tool-name", "get_links_between_texts");
  await page.fill("#reference", "Micah 6:8");
  const beforeLinksSeed = requests.length;
  await page.click('button[type="submit"]');
  await waitForExactRequestCount(requests, beforeLinksSeed + 1);
  assertSequence(requests.slice(beforeLinksSeed), [
    ["/api/links/Micah%206%3A8", "1"],
  ]);
  record("links seed without continuation", beforeLinksSeed);

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

function record(name: string, start: number): void {
  result.stages.push({ name, requests: requests.slice(start) });
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

async function waitForExactRequestCount(
  actual: readonly RecordedRequest[],
  expected: number,
): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (actual.length > expected) {
      throw new Error(
        `Expected exactly ${expected} deterministic requests, observed ${actual.length}.`,
      );
    }
    if (actual.length === expected) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      if (actual.length === expected) return;
      throw new Error(
        `Expected exactly ${expected} deterministic requests after settling, observed ${actual.length}.`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(
    `Expected exactly ${expected} deterministic requests, observed ${actual.length}.`,
  );
}

function assertSequence(
  actual: readonly RecordedRequest[],
  expected: ReadonlyArray<readonly [string, string | null]>,
): void {
  const normalized = actual.map((item) => {
    const url = new URL(item.url);
    return [url.pathname, url.searchParams.get("with_text")] as const;
  });
  if (JSON.stringify(normalized) !== JSON.stringify(expected)) {
    throw new Error(
      `Expected request sequence ${JSON.stringify(expected)}, received ${JSON.stringify(normalized)}.`,
    );
  }
}

function verifyExactSequenceRejectsDuplicates(): void {
  const expected = [
    ["/api/v3/texts/Micah%206%3A8", null],
    ["/api/links/Micah%206%3A8", "1"],
  ] as const;
  const source = {
    method: "GET",
    origin: "https://www.sefaria.org",
    url: textUrl("Micah 6:8"),
  };
  const continuation = {
    method: "GET",
    origin: "https://www.sefaria.org",
    url: linksUrl("Micah 6:8", "1"),
  };
  let rejected = false;
  try {
    assertSequence([source, continuation, continuation], expected);
  } catch {
    rejected = true;
  }
  if (!rejected) {
    throw new Error(
      "The exact-sequence assertion admitted a duplicate trailing request.",
    );
  }
}

function assertNoRequestSince(start: number, action: string): void {
  if (requests.length !== start) {
    throw new Error(`${action} unexpectedly called a tool.`);
  }
}

async function readReaderState(frame: Frame): Promise<ReaderState> {
  return frame.locator("sefaria-reader").evaluate((reader) => {
    const model = (
      reader as HTMLElement & {
        viewModel: {
          currentEntryId: string;
          label: string;
          connections?: {
            state: string;
            viewModel?: {
              state: string;
              category: string | null;
              page: number;
              total: number;
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
    return {
      currentEntryId: model.currentEntryId,
      label: model.label,
      category: model.connections.viewModel.category,
      page: model.connections.viewModel.page,
      total: model.connections.viewModel.total,
      targetRefs:
        model.connections.viewModel.entries?.map((entry) => entry.targetRef) ??
        [],
    };
  });
}

async function waitForReaderState(
  frame: Frame,
  expected: Partial<
    Pick<
      ReaderState,
      "currentEntryId" | "label" | "category" | "page" | "total"
    >
  >,
): Promise<ReaderState> {
  let state: ReaderState | undefined;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      state = await readReaderState(frame);
      const matches = Object.entries(expected).every(
        ([key, value]) => state?.[key as keyof ReaderState] === value,
      );
      if (matches) return state;
    } catch {
      // The Reader can briefly expose a loading projection between host calls.
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(
    `Expected Reader state ${JSON.stringify(expected)}, received ${JSON.stringify(state)}.`,
  );
}

function createDeterministicFetch(log: RecordedRequest[]): typeof fetch {
  const supportedReferences = new Set([
    "Micah 6:8",
    "Invalid 1:1",
    "Denied 1:1",
    "Slow 1:1",
    ...deterministicLinksFixture.flatMap((link) =>
      typeof link.ref === "string" ? [link.ref] : [],
    ),
  ]);
  const deterministicFetch = async (
    input: string | URL | Request,
    init?: RequestInit,
  ): Promise<Response> => {
    const url = new URL(
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url,
    );
    const method = (
      init?.method ?? (input instanceof Request ? input.method : "GET")
    ).toUpperCase();
    if (method !== "GET") {
      throw new Error(`Unexpected deterministic method ${method}.`);
    }
    if (url.origin !== "https://www.sefaria.org") {
      throw new Error(`Unexpected deterministic origin ${url.origin}.`);
    }

    const textPrefix = "/api/v3/texts/";
    const linksPrefix = "/api/links/";
    let reference: string;
    if (url.pathname.startsWith(textPrefix)) {
      reference = decodeURIComponent(url.pathname.slice(textPrefix.length));
      assertExactQuery(
        url,
        "version=primary&version=translation&return_format=default",
      );
    } else if (url.pathname.startsWith(linksPrefix)) {
      reference = decodeURIComponent(url.pathname.slice(linksPrefix.length));
      assertExactQuery(url, "with_text=1&with_sheet_links=0");
    } else {
      throw new Error(`Unexpected deterministic path ${url.pathname}.`);
    }
    if (!supportedReferences.has(reference)) {
      throw new Error(`Unexpected deterministic reference ${reference}.`);
    }

    log.push({ method, origin: url.origin, url: url.href });
    if (url.pathname.startsWith(textPrefix)) {
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
    return Response.json(deterministicLinksFixture);
  };
  return deterministicFetch as typeof fetch;
}

function assertExactQuery(url: URL, expected: string): void {
  if (url.searchParams.toString() !== expected) {
    throw new Error(
      `Unexpected deterministic query ${url.search}; expected ?${expected}.`,
    );
  }
}

async function verifyDeterministicFetchRejectsUnexpectedRequests(
  fetchImpl: typeof fetch,
): Promise<void> {
  const text = textUrl("Micah 6:8");
  const probes: ReadonlyArray<
    readonly [string, string | URL, RequestInit | undefined]
  > = [
    ["method", text, { method: "POST" }],
    ["origin", text.replace("www.sefaria.org", "example.test"), undefined],
    ["reference", textUrl("Genesis 1:1"), undefined],
    [
      "text query",
      "https://www.sefaria.org/api/v3/texts/Micah%206%3A8?version=primary&return_format=default",
      undefined,
    ],
    ["links query", `${linksUrl("Micah 6:8", "1")}&unexpected=1`, undefined],
  ];
  for (const [name, input, init] of probes) {
    let rejected = false;
    try {
      await fetchImpl(input, init);
    } catch {
      rejected = true;
    }
    if (!rejected) {
      throw new Error(
        `The deterministic fetch admitted an unsupported ${name}.`,
      );
    }
  }
}

function expandLinksFixture(
  source: Array<Record<string, unknown>>,
): Array<Record<string, unknown>> {
  const commentary = source.find((link) => link.category === "Commentary");
  if (!commentary) {
    throw new Error("The deterministic links fixture lacks Commentary.");
  }
  const nonCommentary = source.filter((link) => link.category !== "Commentary");
  const expandedCommentary = Array.from({ length: 25 }, (_, index) => {
    const number = index + 1;
    const reference = `Rashi on Genesis 1:1:${number}`;
    return {
      ...structuredClone(commentary),
      _id: `deterministic-commentary-${number}`,
      commentaryNum: number,
      ref: reference,
      sourceRef: reference,
    };
  });
  return [...nonCommentary, ...expandedCommentary];
}

function textUrl(reference: string): string {
  return `https://www.sefaria.org/api/v3/texts/${encodeURIComponent(reference)}?version=primary&version=translation&return_format=default`;
}

function linksUrl(reference: string, withText: "0" | "1"): string {
  return `https://www.sefaria.org/api/links/${encodeURIComponent(reference)}?with_text=${withText}&with_sheet_links=0`;
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
