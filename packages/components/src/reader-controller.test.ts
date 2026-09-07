import {
  createSefariaClient,
  zCoreLinkResponse,
  zCoreV3TextsResponse,
  type CoreLinkObject,
  type CoreLinkResponse,
  type CoreV3TextsResponse,
} from "@sefaria/client";
import { describe, expect, it, vi } from "vitest";

import linksFixture from "../../client/test/fixtures/links-connections-preview-2026-09-06.json";
import sectionFixture from "../../client/test/fixtures/v3-connections-genesis-section-2026-09-06.json";
import targetFixture from "../../client/test/fixtures/v3-connections-genesis-target-2026-09-06.json";
import {
  createReaderConnectionsContent,
  createReaderSourceContent,
  type ReaderSourceContent,
} from "./reader-session.js";
import type { SourceCardRequest } from "./source-card.js";
import {
  createReaderController,
  loadReaderController,
  type ReaderControllerDataSource,
  type ReaderControllerError,
} from "./reader-controller.js";

const contextualTarget = zCoreV3TextsResponse.parse(
  targetFixture,
) as CoreV3TextsResponse;
const contextualSection = zCoreV3TextsResponse.parse(
  sectionFixture,
) as CoreV3TextsResponse;
const parsedLinks = zCoreLinkResponse.parse(linksFixture) as CoreLinkResponse;
if (
  !Array.isArray(parsedLinks) ||
  !parsedLinks[0] ||
  "isSheet" in parsedLinks[0]
) {
  throw new TypeError("Expected one text-link fixture.");
}
const baseLink: CoreLinkObject = parsedLinks[0];

describe("reader controller initialization", () => {
  it("uses source-card defaults, qualifies context once, and selects the exact returned row", async () => {
    const requests: URL[] = [];
    const client = createSefariaClient({
      cache: false,
      fetch: async (input) => {
        const request = input instanceof Request ? input : new Request(input);
        const url = new URL(request.url);
        requests.push(url);
        if (decodeURIComponent(url.pathname) === "/api/v3/texts/Genesis 1:2") {
          return Response.json(contextualTarget);
        }
        if (decodeURIComponent(url.pathname) === "/api/v3/texts/Genesis 1") {
          return Response.json(contextualSection);
        }
        if (decodeURIComponent(url.pathname) === "/api/links/Genesis 1:2") {
          return Response.json(parsedLinks);
        }
        throw new Error(`Unexpected request: ${url.pathname}`);
      },
    });

    const controller = await loadReaderController(
      { tref: "Genesis 1:2" },
      client,
    );

    expect(controller.snapshot.reader.selectedTarget?.ref).toBe("Genesis 1:2");
    expect(controller.snapshot.reader.source?.viewModel).toMatchObject({
      state: "data",
      header: { ref: "Genesis 1" },
    });
    expect(
      requests
        .filter((url) => url.pathname.includes("/api/v3/texts/"))
        .map((url) => ({
          versions: url.searchParams.getAll("version"),
          format: url.searchParams.get("return_format"),
        })),
    ).toEqual([
      { versions: ["primary", "translation"], format: "default" },
      { versions: ["primary", "translation"], format: "default" },
    ]);
    expect(requests.map((url) => decodeURIComponent(url.pathname))).toEqual([
      "/api/v3/texts/Genesis 1:2",
      "/api/v3/texts/Genesis 1",
      "/api/links/Genesis 1:2",
    ]);
  });

  it("rejects a failed required context request without a target-only fallback", async () => {
    const client = createSefariaClient({
      cache: false,
      fetch: async (input) => {
        const path = decodeURIComponent(
          new URL(input instanceof Request ? input.url : input).pathname,
        );
        if (path === "/api/v3/texts/Genesis 1:2") {
          return Response.json(contextualTarget);
        }
        return Response.json(
          { error: "Context unavailable." },
          { status: 404 },
        );
      },
    });

    await expect(
      loadReaderController({ tref: "Genesis 1:2" }, client),
    ).rejects.toMatchObject({
      name: "ReaderControllerError",
      code: "source-http",
      status: 404,
    });
  });

  it("distinguishes source HTTP errors, empty source, and abort", async () => {
    const notFoundClient = createSefariaClient({
      cache: false,
      fetch: async () =>
        Response.json({ error: "Unknown text." }, { status: 404 }),
    });
    const emptyPayload = sectionSourcePayload("Micah 6");
    emptyPayload.versions = [];
    const emptyClient = createSefariaClient({
      cache: false,
      fetch: async () => Response.json(emptyPayload),
    });
    const abortController = new AbortController();
    const abortedClient = createSefariaClient({
      cache: false,
      fetch: async (input, init) =>
        new Promise<Response>((_resolve, reject) => {
          const request =
            input instanceof Request ? input : new Request(input, init);
          request.signal.addEventListener(
            "abort",
            () => reject(request.signal.reason),
            { once: true },
          );
        }),
    });

    await expect(
      loadReaderController({ tref: "Micah 6:8" }, notFoundClient),
    ).rejects.toMatchObject({ code: "source-http", status: 404 });
    await expect(
      loadReaderController({ tref: "Micah 6:8" }, emptyClient),
    ).rejects.toMatchObject({ code: "source-unavailable" });
    const aborted = loadReaderController({ tref: "Micah 6:8" }, abortedClient, {
      signal: abortController.signal,
    });
    abortController.abort(new DOMException("Stopped.", "AbortError"));
    await expect(aborted).rejects.toMatchObject({ name: "AbortError" });
  });

  it("admits a documented links 400 but exposes a links transport failure", async () => {
    const sourcePayload = sectionSourcePayload("Micah 6");
    const documentedClient = createSefariaClient({
      cache: false,
      fetch: async (input) => {
        const path = new URL(input instanceof Request ? input.url : input)
          .pathname;
        return path.startsWith("/api/links/")
          ? Response.json(
              { error: "No links.", ref: "Micah 6:8" },
              { status: 400 },
            )
          : Response.json(sourcePayload);
      },
    });
    const failedClient = createSefariaClient({
      cache: false,
      fetch: async (input) => {
        const path = new URL(input instanceof Request ? input.url : input)
          .pathname;
        if (path.startsWith("/api/links/")) {
          throw new TypeError("Network unavailable.");
        }
        return Response.json(sourcePayload);
      },
    });

    const documented = await loadReaderController(
      { tref: "Micah 6:8" },
      documentedClient,
    );
    const failed = await loadReaderController(
      { tref: "Micah 6:8" },
      failedClient,
    );

    expect(documented.snapshot.reader.connections).toMatchObject({
      state: "component",
      viewModel: { state: "error" },
    });
    expect(failed.snapshot.reader.connections).toMatchObject({
      state: "unavailable",
      reason: "failed",
      message: "Network unavailable.",
    });
  });

  it("uses the client response cache without coalescing in the controller", async () => {
    const fetch = vi.fn(async (input: RequestInfo | URL) => {
      const path = new URL(
        input instanceof Request ? input.url : input.toString(),
      ).pathname;
      return path.startsWith("/api/links/")
        ? Response.json(readerLinks("Micah 6:8"))
        : Response.json(sectionSourcePayload("Micah 6"));
    });
    const client = createSefariaClient({ fetch });

    await loadReaderController({ tref: "Micah 6:8" }, client);
    await loadReaderController({ tref: "Micah 6:8" }, client);

    expect(fetch).toHaveBeenCalledTimes(2);
  });
});

describe("reader controller state and operations", () => {
  it("starts from admitted source-only, links-only, or paired content without I/O", () => {
    const dataSource: ReaderControllerDataSource = {
      loadSource: vi.fn(),
      loadConnections: vi.fn(),
    };
    const source = sourceContent("Micah 6");
    const connections = connectionsContent("Micah 6:8");

    const sourceOnly = createReaderController({ source }, dataSource);
    const linksOnly = createReaderController({ connections }, dataSource);
    const paired = createReaderController(
      { source, selectedPosition: [7], connections },
      dataSource,
    );

    expect(sourceOnly.snapshot.reader.source).toBeDefined();
    expect(linksOnly.snapshot.reader.connections).toBeDefined();
    expect(paired.snapshot.reader.selectedTarget?.ref).toBe("Micah 6:8");
    expect(dataSource.loadSource).not.toHaveBeenCalled();
    expect(dataSource.loadConnections).not.toHaveBeenCalled();
  });

  it("preserves the current entry when later required context fails", async () => {
    const dataSource: ReaderControllerDataSource = {
      loadSource: vi
        .fn()
        .mockResolvedValueOnce(
          createReaderSourceContent(contextualTarget, {
            tref: "Genesis 1:2",
          }),
        )
        .mockRejectedValueOnce(new TypeError("Context request failed.")),
      loadConnections: vi.fn(),
    };
    const controller = createReaderController(
      { source: sourceContent("Micah 6"), selectedPosition: [7] },
      dataSource,
    );

    await controller.openConnection({
      originEntryId: "entry-1",
      targetRef: "Genesis 1:2",
    });

    expect(controller.snapshot.reader.currentEntryId).toBe("entry-1");
    expect(controller.snapshot.reader.selectedTarget?.ref).toBe("Micah 6:8");
    expect(controller.snapshot.task).toMatchObject({
      state: "error",
      code: "source-transport",
      message: "Context request failed.",
    });
    expect(dataSource.loadConnections).not.toHaveBeenCalled();
  });

  it("terminates a mismatched connections completion and permits replacement work", async () => {
    const loadConnections = vi
      .fn()
      .mockResolvedValueOnce(connectionsContent("Isaiah 1:17"))
      .mockResolvedValueOnce(connectionsContent("Micah 6:8"));
    const controller = createReaderController(
      { source: sourceContent("Micah 6"), selectedPosition: [7] },
      { loadSource: vi.fn(), loadConnections },
    );

    await controller.selectSource({
      originEntryId: "entry-1",
      position: [7],
      ref: "Micah 6:8",
    });

    expect(controller.snapshot.task).toMatchObject({
      state: "error",
      code: "invalid-completion",
    });
    expect(controller.snapshot.reader.connections).toMatchObject({
      state: "unavailable",
      reason: "interrupted",
    });

    await controller.selectSource({
      originEntryId: "entry-1",
      position: [7],
      ref: "Micah 6:8",
    });
    expect(controller.snapshot.reader.connections?.state).toBe("component");
    expect(loadConnections).toHaveBeenCalledTimes(2);
  });

  it("reports a mismatched source request without committing a new entry", async () => {
    const controller = createReaderController(
      { source: sourceContent("Micah 6"), selectedPosition: [7] },
      {
        loadSource: async () => sourceContent("Isaiah 1"),
        loadConnections: vi.fn(),
      },
    );

    await controller.openConnection({
      originEntryId: "entry-1",
      targetRef: "Rashi on Micah 6",
    });

    expect(controller.snapshot.reader.currentEntryId).toBe("entry-1");
    expect(controller.snapshot.task).toMatchObject({
      state: "error",
      code: "request-mismatch",
    });
  });

  it("terminates a contextual request mismatch and permits replacement work", async () => {
    const mismatchedRequest = {
      tref: "Genesis 1",
      unexpected: true,
    } as SourceCardRequest;
    const loadSource = vi
      .fn()
      .mockResolvedValueOnce(
        createReaderSourceContent(contextualTarget, {
          tref: "Genesis 1:2",
        }),
      )
      .mockResolvedValueOnce(
        createReaderSourceContent(contextualSection, mismatchedRequest),
      )
      .mockResolvedValueOnce(
        createReaderSourceContent(contextualTarget, {
          tref: "Genesis 1:2",
        }),
      )
      .mockResolvedValueOnce(
        createReaderSourceContent(contextualSection, {
          tref: "Genesis 1",
        }),
      );
    const controller = createReaderController(
      { source: sourceContent("Micah 6"), selectedPosition: [7] },
      {
        loadSource,
        loadConnections: async (request, projection) =>
          createReaderConnectionsContent(
            readerLinks(request.tref),
            request,
            projection,
          ),
      },
    );

    await controller.openConnection({
      originEntryId: "entry-1",
      targetRef: "Genesis 1:2",
    });
    expect(controller.snapshot.task).toMatchObject({
      state: "error",
      code: "request-mismatch",
    });
    expect(controller.snapshot.reader.currentEntryId).toBe("entry-1");

    await controller.openConnection({
      originEntryId: "entry-1",
      targetRef: "Genesis 1:2",
    });
    expect(controller.snapshot.task.state).toBe("idle");
    expect(controller.snapshot.reader.currentEntryId).toBe("entry-2");
    expect(loadSource).toHaveBeenCalledTimes(4);
  });

  it("reprojects locally and upgrades metadata-only previews exactly once", async () => {
    const loadConnections = vi.fn(async (request, projection) =>
      createReaderConnectionsContent(
        readerLinks(request.tref),
        request,
        projection,
      ),
    );
    const controller = createReaderController(
      {
        source: sourceContent("Micah 6"),
        selectedPosition: [7],
        connections: connectionsContent("Micah 6:8", false, {
          category: "Commentary",
        }),
      },
      { loadSource: vi.fn(), loadConnections },
    );

    controller.setConnectionsCategory({
      originEntryId: "entry-1",
      category: "Commentary",
    });
    expect(loadConnections).not.toHaveBeenCalled();

    await controller.requestConnectionPreviews({
      originEntryId: "entry-1",
    });
    await controller.requestConnectionPreviews({
      originEntryId: "entry-1",
    });

    expect(loadConnections).toHaveBeenCalledOnce();
    expect(loadConnections.mock.calls[0]?.[0]).toEqual({
      tref: "Micah 6:8",
      withText: true,
    });
    expect(loadConnections.mock.calls[0]?.[1]).toEqual({
      category: "Commentary",
    });
    const connections = controller.snapshot.reader.connections;
    expect(connections?.state).toBe("component");
    if (
      connections?.state !== "component" ||
      connections.viewModel.state !== "data"
    ) {
      return;
    }
    expect(connections.viewModel.category).toBe("Commentary");
  });

  it("cancels the session operation before replacement and ignores a late completion", async () => {
    const lateSection = deferred<ReaderSourceContent>();
    let firstContextSignal: AbortSignal | undefined;
    const loadSource = vi.fn(
      async (request: { readonly tref: string }, signal: AbortSignal) => {
        if (request.tref === "Genesis 1:2") {
          return createReaderSourceContent(contextualTarget, request);
        }
        if (request.tref === "Genesis 1") {
          firstContextSignal = signal;
          return lateSection.promise;
        }
        return sourceContent(request.tref);
      },
    );
    const controller = createReaderController(
      { source: sourceContent("Micah 6"), selectedPosition: [7] },
      {
        loadSource,
        loadConnections: async (request, projection) =>
          createReaderConnectionsContent(
            readerLinks(request.tref),
            request,
            projection,
          ),
      },
    );

    const first = controller.openConnection({
      originEntryId: "entry-1",
      targetRef: "Genesis 1:2",
    });
    await vi.waitFor(() => expect(firstContextSignal).toBeDefined());
    const second = controller.openConnection({
      originEntryId: "entry-1",
      targetRef: "Rashi on Micah 6",
    });
    await second;
    expect(firstContextSignal?.aborted).toBe(true);
    lateSection.resolve(
      createReaderSourceContent(contextualSection, { tref: "Genesis 1" }),
    );
    await first;

    expect(controller.snapshot.reader.currentEntryId).toBe("entry-2");
    expect(controller.snapshot.reader.selectedTarget?.ref).toBe(
      "Rashi on Micah 6:1",
    );
    expect(controller.snapshot.task.state).toBe("idle");
  });

  it("preserves the current entry when a new source exceeds the retention budget", async () => {
    const root = sourceContent("Micah 6");
    const controller = createReaderController(
      { source: root, selectedPosition: [7] },
      {
        loadSource: async (request) => sourceContent(request.tref, 10_000),
        loadConnections: vi.fn(),
      },
      { maxCaptureBytes: root.capture.byteSize + 20 },
    );

    await controller.openConnection({
      originEntryId: "entry-1",
      targetRef: "Rashi on Micah 6",
    });

    expect(controller.snapshot.reader.currentEntryId).toBe("entry-1");
    expect(controller.snapshot.task).toMatchObject({
      state: "error",
      code: "budget-exceeded",
    });
  });

  it("rejects stale actions before I/O and keeps Back and activation local", async () => {
    const dataSource = fixtureDataSource();
    const controller = createReaderController(
      { source: sourceContent("Micah 6"), selectedPosition: [7] },
      dataSource,
    );

    await expect(
      controller.openConnection({
        originEntryId: "entry-0",
        targetRef: "Rashi on Micah 6",
      }),
    ).rejects.toMatchObject({ code: "stale-action" });
    expect(dataSource.loadSource).not.toHaveBeenCalled();

    await controller.openConnection({
      originEntryId: "entry-1",
      targetRef: "Rashi on Micah 6",
    });
    const callCount =
      dataSource.loadSource.mock.calls.length +
      dataSource.loadConnections.mock.calls.length;
    controller.back({ originEntryId: "entry-2" });
    controller.activateHistory({
      originEntryId: "entry-1",
      entryId: "entry-1",
    });
    expect(
      dataSource.loadSource.mock.calls.length +
        dataSource.loadConnections.mock.calls.length,
    ).toBe(callCount);
    expect(controller.snapshot.reader.currentEntryId).toBe("entry-1");
  });

  it("publishes immutable snapshots, isolates subscriber failures, and disposes", () => {
    const reportError = vi.fn();
    vi.stubGlobal("reportError", reportError);
    const controller = createReaderController(
      { source: sourceContent("Micah 6"), selectedPosition: [7] },
      { loadSource: vi.fn(), loadConnections: vi.fn() },
    );
    const throwing = vi.fn(() => {
      throw new Error("Subscriber failed.");
    });
    const listener = vi.fn();
    controller.subscribe(throwing);
    const unsubscribe = controller.subscribe(listener);

    expect(listener).toHaveBeenCalledOnce();
    expect(Object.isFrozen(controller.snapshot)).toBe(true);
    expect(Object.isFrozen(controller.snapshot.reader)).toBe(true);
    expect(Object.isFrozen(controller.snapshot.reader.breadcrumbs)).toBe(true);

    unsubscribe();
    controller.setPresentation({
      originEntryId: "entry-1",
      patch: { contentLanguage: "primary" },
    });
    expect(listener).toHaveBeenCalledOnce();
    expect(reportError).toHaveBeenCalledTimes(2);
    expect(controller.snapshot.reader.source?.contentLanguage).toBe("primary");

    controller.dispose();
    expect(() => controller.back({ originEntryId: "entry-1" })).toThrowError(
      expect.objectContaining<Partial<ReaderControllerError>>({
        code: "disposed",
      }),
    );
    vi.unstubAllGlobals();
  });

  it("rejects re-entrant actions and aborts active work on disposal", async () => {
    const reportError = vi.fn();
    vi.stubGlobal("reportError", reportError);
    const pending = deferred<ReaderSourceContent>();
    let signal: AbortSignal | undefined;
    const controller = createReaderController(
      { source: sourceContent("Micah 6"), selectedPosition: [7] },
      {
        loadSource: (_request, operationSignal) => {
          signal = operationSignal;
          return pending.promise;
        },
        loadConnections: vi.fn(),
      },
    );
    controller.subscribe(() => {
      controller.setPresentation({
        originEntryId: "entry-1",
        patch: { contentLanguage: "translation" },
      });
    });
    expect(reportError).toHaveBeenCalledWith(
      expect.objectContaining({ code: "reentrant-action" }),
    );

    const operation = controller.openConnection({
      originEntryId: "entry-1",
      targetRef: "Rashi on Micah 6",
    });
    await vi.waitFor(() => expect(signal).toBeDefined());
    controller.dispose();
    expect(signal?.aborted).toBe(true);
    pending.resolve(sourceContent("Rashi on Micah 6"));
    await operation;
    expect(() => controller.subscribe(vi.fn())).toThrowError(
      expect.objectContaining<Partial<ReaderControllerError>>({
        code: "disposed",
      }),
    );
    vi.unstubAllGlobals();
  });
});

function sectionSourcePayload(
  sectionRef: string,
  textLength = 20,
): CoreV3TextsResponse {
  const payload = structuredClone(contextualSection);
  payload.ref = sectionRef;
  payload.heRef = sectionRef;
  payload.sectionRef = sectionRef;
  payload.heSectionRef = sectionRef;
  payload.firstAvailableSectionRef = `${sectionRef}:1`;
  payload.title = sectionRef;
  payload.book = sectionRef;
  payload.indexTitle = sectionRef;
  payload.heIndexTitle = sectionRef;
  payload.sections = ["1"];
  payload.toSections = ["1"];
  for (const version of payload.versions) {
    if (!Array.isArray(version.text)) {
      throw new TypeError("Expected section text arrays.");
    }
    version.text = version.text.map(() => "X".repeat(textLength));
  }
  return payload;
}

function sourceContent(sectionRef: string, textLength = 20) {
  return createReaderSourceContent(
    sectionSourcePayload(sectionRef, textLength),
    { tref: sectionRef },
  );
}

function readerLinks(tref: string): CoreLinkResponse {
  return [
    {
      ...structuredClone(baseLink),
      _id: `link-${tref}`,
      anchorRef: tref,
      sourceRef: `Commentary on ${tref}`,
      ref: `Commentary on ${tref}`,
      category: "Commentary",
    },
  ];
}

function connectionsContent(
  tref: string,
  withText = true,
  projection: { readonly category?: string; readonly page?: number } = {},
) {
  return createReaderConnectionsContent(
    readerLinks(tref),
    { tref, withText },
    projection,
  );
}

function fixtureDataSource() {
  return {
    loadSource: vi.fn(async (request) => sourceContent(request.tref)),
    loadConnections: vi.fn(async (request, projection) =>
      createReaderConnectionsContent(
        readerLinks(request.tref),
        request,
        projection,
      ),
    ),
  };
}

function deferred<Value>() {
  let resolve!: (value: Value) => void;
  const promise = new Promise<Value>((resolver) => {
    resolve = resolver;
  });
  return { promise, resolve };
}
