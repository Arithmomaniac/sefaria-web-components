import type { CoreLinkResponse } from "@sefaria/client";
import type {
  ReaderViewModel,
  SefariaReader,
  SefariaSourceCard,
} from "@sefaria/components";
import { beforeEach, expect, test, vi } from "vitest";

import capturedLinks from "../../../../packages/client/test/fixtures/links-connections-preview-2026-09-06.json";
import genesisSection from "../../../../packages/client/test/fixtures/v3-connections-genesis-section-2026-09-06.json";
import genesisTarget from "../../../../packages/client/test/fixtures/v3-connections-genesis-target-2026-09-06.json";
import { v3SourceBackedPayload } from "../../../../tests/compatibility/src/v3-source-backed.fixture.js";
import {
  createConnectionsInteraction,
  createMcpReaderDataSource,
  renderReaderToolResult,
  waitForMcpConnection,
} from "./app.js";

beforeEach(() => {
  document.documentElement.removeAttribute("style");
  document.querySelector("[data-mcp-app-test-styles]")?.remove();
  document.body.innerHTML = '<main id="app"></main>';
});

test("seeds the stateful reader before loading initial connections through the host", async () => {
  const callServerTool = vi
    .fn()
    .mockResolvedValue(connectionsToolResult(200, [], true, "Genesis 1:1"));
  const cleanup = renderReaderToolResult(
    root(),
    toolResult(200, structuredClone(v3SourceBackedPayload)),
    createMcpReaderDataSource({ callServerTool }),
  );

  const reader = readerElement();
  expect(readerViewModel(reader).source).toBeDefined();
  expect(readerViewModel(reader).connections).toBeUndefined();
  expect(callServerTool).not.toHaveBeenCalled();

  await vi.waitFor(() => expect(callServerTool).toHaveBeenCalledOnce());
  expect(callServerTool).toHaveBeenCalledWith(
    {
      name: "get_links_between_texts",
      arguments: {
        reference: "Genesis 1:1",
        with_text: "1",
      },
    },
    { signal: expect.any(AbortSignal) },
  );
  await vi.waitFor(() =>
    expect(readerViewModel(reader).connections?.state).toBe("component"),
  );

  cleanup();
});

test("seeds a connections-only reader without a continuation request", () => {
  const callServerTool = vi.fn();
  const cleanup = renderReaderToolResult(
    root(),
    connectionsToolResult(
      200,
      structuredClone(capturedLinks),
      true,
      "Micah 6:8",
    ),
    createMcpReaderDataSource({ callServerTool }),
  );

  const reader = readerElement();
  expect(readerViewModel(reader).source).toBeUndefined();
  expect(readerViewModel(reader).connections?.state).toBe("component");
  expect(callServerTool).not.toHaveBeenCalled();

  cleanup();
});

test("calls the named-host source tool with default selectors and preserves abort", async () => {
  const callServerTool = vi
    .fn()
    .mockResolvedValue(toolResult(200, structuredClone(v3SourceBackedPayload)));
  const dataSource = createMcpReaderDataSource({ callServerTool });
  const controller = new AbortController();

  const content = await dataSource.loadSource(
    { tref: "Genesis 1:1" },
    controller.signal,
  );

  expect(content.request).toEqual({ tref: "Genesis 1:1" });
  expect(callServerTool).toHaveBeenCalledWith(
    {
      name: "get_text",
      arguments: {
        reference: "Genesis 1:1",
        version_language: "both",
      },
    },
    { signal: controller.signal },
  );
});

test("does not call the host after cancellation while the App is connecting", async () => {
  let resolveConnection: (() => void) | undefined;
  const connected = new Promise<void>((resolve) => {
    resolveConnection = resolve;
  });
  const callServerTool = vi.fn();
  const controller = new AbortController();

  const pending = (async () => {
    await waitForMcpConnection(connected, controller.signal);
    return callServerTool();
  })();
  controller.abort();
  resolveConnection?.();

  await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  expect(callServerTool).not.toHaveBeenCalled();
});

test("rejects a host result whose effective connections request does not match", async () => {
  const callServerTool = vi
    .fn()
    .mockResolvedValue(connectionsToolResult(200, [], true, "Micah 6:8"));
  const dataSource = createMcpReaderDataSource({ callServerTool });

  await expect(
    dataSource.loadConnections(
      { tref: "Genesis 1:1", withText: true },
      {},
      new AbortController().signal,
    ),
  ).rejects.toThrow("exact requested reference");
});

test("builds a reader hierarchy and restores any retained breadcrumb locally", async () => {
  const initialLinks = [
    {
      ...structuredClone(capturedLinks[0]!),
      sourceRef: "Genesis 1:2",
    },
  ] as CoreLinkResponse;
  const callServerTool = vi.fn(
    async (params: {
      readonly name: string;
      readonly arguments?: Readonly<Record<string, unknown>>;
    }) => {
      const reference = params.arguments?.reference;
      if (params.name === "get_text" && reference === "Genesis 1:2") {
        return toolResult(200, structuredClone(genesisTarget), "Genesis 1:2");
      }
      if (params.name === "get_text" && reference === "Genesis 1") {
        return toolResult(200, structuredClone(genesisSection), "Genesis 1");
      }
      if (
        params.name === "get_links_between_texts" &&
        reference === "Genesis 1:2"
      ) {
        return connectionsToolResult(200, initialLinks, true, "Genesis 1:2");
      }
      throw new Error(
        `Unexpected tool call: ${params.name} ${String(reference)}`,
      );
    },
  );
  const cleanup = renderReaderToolResult(
    root(),
    connectionsToolResult(200, initialLinks, true, "Micah 6:8"),
    createMcpReaderDataSource({ callServerTool }),
  );
  const reader = readerElement();
  const rootEntryId = readerViewModel(reader).currentEntryId;

  reader.dispatchEvent(
    new CustomEvent("sefaria-reader-connection-select", {
      detail: {
        originEntryId: rootEntryId,
        targetRef: "Genesis 1:2",
      },
    }),
  );

  await vi.waitFor(() => expect(callServerTool).toHaveBeenCalledTimes(3));
  await vi.waitFor(() =>
    expect(readerViewModel(reader).currentEntryId).not.toBe(rootEntryId),
  );
  expect(
    callServerTool.mock.calls.map(([params]) => [
      params.name,
      params.arguments?.reference,
    ]),
  ).toEqual([
    ["get_text", "Genesis 1:2"],
    ["get_text", "Genesis 1"],
    ["get_links_between_texts", "Genesis 1:2"],
  ]);

  const childEntryId = readerViewModel(reader).currentEntryId;
  reader.dispatchEvent(
    new CustomEvent("sefaria-reader-connection-select", {
      detail: {
        originEntryId: childEntryId,
        targetRef: "Genesis 1:2",
      },
    }),
  );

  await vi.waitFor(() => expect(callServerTool).toHaveBeenCalledTimes(6));
  await vi.waitFor(() =>
    expect(readerViewModel(reader).currentEntryId).not.toBe(childEntryId),
  );
  const hierarchy = readerViewModel(reader);
  expect(hierarchy.breadcrumbs).toHaveLength(3);
  expect(
    callServerTool.mock.calls.map(([params]) => [
      params.name,
      params.arguments?.reference,
    ]),
  ).toEqual([
    ["get_text", "Genesis 1:2"],
    ["get_text", "Genesis 1"],
    ["get_links_between_texts", "Genesis 1:2"],
    ["get_text", "Genesis 1:2"],
    ["get_text", "Genesis 1"],
    ["get_links_between_texts", "Genesis 1:2"],
  ]);

  const grandchildEntryId = hierarchy.currentEntryId;
  reader.dispatchEvent(
    new CustomEvent("sefaria-reader-history-activate", {
      detail: {
        originEntryId: grandchildEntryId,
        entryId: childEntryId,
      },
    }),
  );
  expect(readerViewModel(reader).currentEntryId).toBe(childEntryId);
  expect(callServerTool).toHaveBeenCalledTimes(6);

  reader.dispatchEvent(
    new CustomEvent("sefaria-reader-history-activate", {
      detail: {
        originEntryId: childEntryId,
        entryId: rootEntryId,
      },
    }),
  );
  expect(readerViewModel(reader).currentEntryId).toBe(rootEntryId);
  expect(callServerTool).toHaveBeenCalledTimes(6);
  cleanup();
});

test("reprojects retained connections locally", () => {
  const callServerTool = vi.fn();
  const cleanup = renderReaderToolResult(
    root(),
    connectionsToolResult(200, pagedLinks(), true),
    createMcpReaderDataSource({ callServerTool }),
  );
  const reader = readerElement();
  const originEntryId = readerViewModel(reader).currentEntryId;

  reader.dispatchEvent(
    new CustomEvent("sefaria-reader-connections-category-change", {
      detail: { originEntryId, category: "Commentary" },
    }),
  );
  reader.dispatchEvent(
    new CustomEvent("sefaria-reader-connections-page-change", {
      detail: { originEntryId, page: 1 },
    }),
  );

  const connections = readerViewModel(reader).connections;
  expect(connections?.state).toBe("component");
  expect(
    connections?.state === "component" &&
      connections.viewModel.state === "data" &&
      connections.viewModel.page,
  ).toBe(1);
  expect(callServerTool).not.toHaveBeenCalled();
  cleanup();
});

test("loads missing previews through one same-App tool call", async () => {
  const callServerTool = vi
    .fn()
    .mockResolvedValue(
      connectionsToolResult(
        200,
        structuredClone(capturedLinks),
        true,
        "Micah 6:8",
      ),
    );
  const cleanup = renderReaderToolResult(
    root(),
    connectionsToolResult(
      200,
      structuredClone(capturedLinks),
      false,
      "Micah 6:8",
    ),
    createMcpReaderDataSource({ callServerTool }),
  );
  const reader = readerElement();
  const originEntryId = readerViewModel(reader).currentEntryId;

  reader.dispatchEvent(
    new CustomEvent("sefaria-reader-connections-preview-request", {
      detail: { originEntryId },
    }),
  );

  await vi.waitFor(() => expect(callServerTool).toHaveBeenCalledOnce());
  expect(callServerTool).toHaveBeenCalledWith(
    {
      name: "get_links_between_texts",
      arguments: { reference: "Micah 6:8", with_text: "1" },
    },
    { signal: expect.any(AbortSignal) },
  );
  await vi.waitFor(() => {
    const connections = readerViewModel(reader).connections;
    expect(
      connections?.state === "component" &&
        connections.viewModel.state === "data" &&
        connections.viewModel.previewsIncluded,
    ).toBe(true);
  });
  cleanup();
});

test("surfaces a host tool failure as unavailable reader connections", async () => {
  const callServerTool = vi.fn().mockResolvedValue({
    isError: true,
    content: [{ type: "text", text: "The host denied the links call." }],
  });
  const cleanup = renderReaderToolResult(
    root(),
    toolResult(200, structuredClone(v3SourceBackedPayload)),
    createMcpReaderDataSource({ callServerTool }),
  );
  const reader = readerElement();

  await vi.waitFor(() =>
    expect(readerViewModel(reader).connections).toEqual({
      state: "unavailable",
      reason: "failed",
      message: "The host denied the links call.",
    }),
  );
  cleanup();
});

test("aborts a pending host continuation when the App result is disposed", async () => {
  let signal: AbortSignal | undefined;
  const callServerTool = vi.fn(
    (
      _params: unknown,
      options: { readonly signal?: AbortSignal } | undefined,
    ) => {
      signal = options?.signal;
      return new Promise<never>(() => {});
    },
  );
  const cleanup = renderReaderToolResult(
    root(),
    toolResult(200, structuredClone(v3SourceBackedPayload)),
    createMcpReaderDataSource({ callServerTool }),
  );

  await vi.waitFor(() => expect(signal).toBeDefined());
  cleanup();

  expect(signal?.aborted).toBe(true);
});

test("keeps explicit chat export separate from reader data calls", async () => {
  const callServerTool = vi
    .fn()
    .mockResolvedValue(connectionsToolResult(200, [], true, "Genesis 1:1"));
  const sendMessage = vi.fn().mockResolvedValue({});
  const cleanup = renderReaderToolResult(
    root(),
    toolResult(200, structuredClone(v3SourceBackedPayload)),
    createMcpReaderDataSource({ callServerTool }),
    { sendMessage },
  );
  const reader = readerElement();
  await vi.waitFor(() => expect(callServerTool).toHaveBeenCalledOnce());
  const viewModel = readerViewModel(reader);

  reader.dispatchEvent(
    new CustomEvent("sefaria-reader-chat-export", {
      detail: {
        originEntryId: viewModel.currentEntryId,
        targetRef: viewModel.selectedTarget?.ref,
      },
    }),
  );

  await vi.waitFor(() => expect(sendMessage).toHaveBeenCalledOnce());
  expect(sendMessage).toHaveBeenCalledWith(
    'Use get_text with reference "Genesis 1:1" and version_language "both" to show the selected source.',
  );
  expect(callServerTool).toHaveBeenCalledTimes(1);
  cleanup();
});

test("does not retry rejected, concurrent, or stale chat exports", async () => {
  let resolveSend: ((result: { readonly isError: true }) => void) | undefined;
  const sendMessage = vi.fn(
    () =>
      new Promise<{ readonly isError: true }>((resolve) => {
        resolveSend = resolve;
      }),
  );
  const callServerTool = vi
    .fn()
    .mockResolvedValue(connectionsToolResult(200, [], true, "Genesis 1:1"));
  const cleanup = renderReaderToolResult(
    root(),
    toolResult(200, structuredClone(v3SourceBackedPayload)),
    createMcpReaderDataSource({ callServerTool }),
    { sendMessage },
  );
  const reader = readerElement();
  await vi.waitFor(() => expect(callServerTool).toHaveBeenCalledOnce());
  const viewModel = readerViewModel(reader);
  const detail = {
    originEntryId: viewModel.currentEntryId,
    targetRef: viewModel.selectedTarget?.ref,
  };

  reader.dispatchEvent(
    new CustomEvent("sefaria-reader-chat-export", { detail }),
  );
  reader.dispatchEvent(
    new CustomEvent("sefaria-reader-chat-export", { detail }),
  );
  expect(sendMessage).toHaveBeenCalledOnce();
  resolveSend?.({ isError: true });
  await vi.waitFor(() =>
    expect(root().querySelector('[role="alert"]')?.textContent).toContain(
      "rejected",
    ),
  );

  reader.dispatchEvent(
    new CustomEvent("sefaria-reader-chat-export", {
      detail: { ...detail, originEntryId: "stale-entry" },
    }),
  );
  expect(sendMessage).toHaveBeenCalledOnce();
  expect(root().querySelector('[role="alert"]')?.textContent).toContain(
    "stale",
  );
  cleanup();
});

test("maps the host secondary surface to the reader muted surface", async () => {
  const response = await fetch(new URL("../mcp-app.html", import.meta.url));
  const page = new DOMParser().parseFromString(
    await response.text(),
    "text/html",
  );
  const sourceStyle = page.querySelector("style");
  if (!sourceStyle) {
    throw new Error("MCP App stylesheet is missing.");
  }
  const style = document.createElement("style");
  style.dataset.mcpAppTestStyles = "";
  style.textContent = sourceStyle.textContent;
  document.head.append(style);

  document.documentElement.style.setProperty(
    "--color-background-secondary",
    "rgb(1 2 3)",
  );

  const cleanup = renderReaderToolResult(
    root(),
    connectionsToolResult(200, [], true),
    createMcpReaderDataSource({ callServerTool: vi.fn() }),
  );
  const reader = readerElement();
  await reader.updateComplete;
  expect(
    getComputedStyle(reader).getPropertyValue("--sefaria-surface-muted").trim(),
  ).toBe("rgb(1 2 3)");
  expect(
    getComputedStyle(reader).getPropertyValue("--sefaria-surface").trim(),
  ).not.toBe("rgb(1 2 3)");
  cleanup();
});

test("reports structured paths for invalid corrected payloads", () => {
  renderReaderToolResult(
    root(),
    toolResult(200, { versions: "wrong" }),
    createMcpReaderDataSource({ callServerTool: vi.fn() }),
  );

  expect(root().querySelector('[role="alert"]')?.textContent).toContain(
    "/versions",
  );
  expect(root().querySelector("sefaria-reader")).toBeNull();
});

test("renders a documented source 404 without constructing a reader", async () => {
  renderReaderToolResult(
    root(),
    toolResult(404, { error: "Unknown reference." }),
    createMcpReaderDataSource({ callServerTool: vi.fn() }),
  );

  const card = sourceCard();
  await card.updateComplete;
  expect(card.viewModel).toEqual({
    state: "error",
    errorKind: "http",
    status: 404,
    message: "Unknown reference.",
  });
  expect(root().querySelector("sefaria-reader")).toBeNull();
});

test("rejects malformed result metadata before payload validation", () => {
  renderReaderToolResult(
    root(),
    {
      structuredContent: structuredClone(v3SourceBackedPayload),
      _meta: {
        "sefaria/source-card": {
          operation: "getV3Texts",
          method: "GET",
          path: "/api/v3/texts/{tref}",
          status: 500,
          request: { tref: "Genesis 1:1" },
        },
      },
    },
    createMcpReaderDataSource({ callServerTool: vi.fn() }),
  );

  expect(root().querySelector('[role="alert"]')?.textContent).toContain(
    "/_meta/sefaria~1source-card/status",
  );
  expect(root().querySelector("sefaria-reader")).toBeNull();
});

test("preserves a tool failure message without requiring App metadata", () => {
  renderReaderToolResult(
    root(),
    {
      content: [{ type: "text", text: "Sefaria is temporarily unavailable." }],
      isError: true,
    },
    createMcpReaderDataSource({ callServerTool: vi.fn() }),
  );

  expect(root().querySelector('[role="alert"]')?.textContent).toBe(
    "Sefaria is temporarily unavailable.",
  );
  expect(root().querySelector("sefaria-reader")).toBeNull();
});

test("adapts the MCP Apps message wire request without capability gating", async () => {
  const sendMessage = vi.fn().mockResolvedValue({});
  const interaction = createConnectionsInteraction({
    sendMessage,
  });

  await interaction.sendMessage("Follow up");
  expect(sendMessage).toHaveBeenCalledWith({
    role: "user",
    content: [{ type: "text", text: "Follow up" }],
  });
});

test("renders documented connections errors and rejects oversized captures", () => {
  const dataSource = createMcpReaderDataSource({ callServerTool: vi.fn() });
  const cleanup = renderReaderToolResult(
    root(),
    connectionsToolResult(
      400,
      { error: "Invalid reference.", ref: "Missing 1:1" },
      false,
    ),
    dataSource,
  );
  const connections = readerViewModel(readerElement()).connections;
  expect(connections?.state).toBe("component");
  expect(connections?.state === "component" && connections.viewModel).toEqual({
    state: "error",
    errorKind: "http",
    status: 400,
    message: "Invalid reference.",
  });
  cleanup();

  renderReaderToolResult(
    root(),
    connectionsToolResult(
      200,
      Array.from({ length: 10_001 }, () => null),
      false,
    ),
    dataSource,
  );
  expect(root().querySelector('[role="alert"]')?.textContent).toContain(
    "10000",
  );
  expect(root().querySelector("sefaria-reader")).toBeNull();
});

test("prefixes connections validation paths and rejects ambiguous metadata", () => {
  const dataSource = createMcpReaderDataSource({ callServerTool: vi.fn() });
  const invalidLinks = structuredClone(capturedLinks) as unknown as Array<
    Record<string, unknown>
  >;
  invalidLinks[0]!._id = 3;
  renderReaderToolResult(
    root(),
    connectionsToolResult(200, invalidLinks, true),
    dataSource,
  );
  expect(root().querySelector('[role="alert"]')?.textContent).toContain(
    "/structuredContent/payload",
  );

  renderReaderToolResult(
    root(),
    {
      ...connectionsToolResult(200, structuredClone(capturedLinks), true),
      _meta: {
        ...connectionsToolResult(200, [], true)._meta,
        ...toolResult(200, structuredClone(v3SourceBackedPayload))._meta,
      },
    },
    dataSource,
  );
  expect(root().querySelector('[role="alert"]')?.textContent).toContain(
    "exactly one",
  );
});

function toolResult(
  status: 200 | 400 | 404,
  structuredContent: unknown,
  reference = "Genesis 1:1",
) {
  return {
    structuredContent,
    _meta: {
      "sefaria/source-card": {
        operation: "getV3Texts",
        method: "GET",
        path: "/api/v3/texts/{tref}",
        status,
        request: { tref: reference },
      },
    },
  };
}

function connectionsToolResult(
  status: 200 | 400,
  payload: unknown,
  withText: boolean,
  reference = "Micah 6:8",
) {
  return {
    structuredContent: { payload },
    _meta: {
      "sefaria/connections": {
        operation: "getLinks",
        method: "GET",
        path: "/api/links/{tref}",
        status,
        request: { tref: reference, withText },
      },
    },
  };
}

function pagedLinks(): CoreLinkResponse {
  const source = structuredClone(capturedLinks);
  const commentary = source.find((link) => link.category === "Commentary");
  if (!commentary) {
    throw new Error("Captured links fixture has no Commentary entry.");
  }
  return [
    ...source.filter((link) => link.category !== "Commentary"),
    ...Array.from({ length: 21 }, (_, index) => ({
      ...structuredClone(commentary),
      _id: `commentary-${index}`,
      sourceRef: `Commentary on Micah 6:8:${index + 1}`,
      commentaryNum: index + 1,
    })),
  ] as CoreLinkResponse;
}

function root(): HTMLElement {
  const element = document.querySelector<HTMLElement>("#app");
  if (!element) {
    throw new Error("MCP App root is missing.");
  }
  return element;
}

function readerElement(): SefariaReader {
  const element = root().querySelector<SefariaReader>("sefaria-reader");
  if (!element) {
    throw new Error("Reader is missing.");
  }
  return element;
}

function readerViewModel(reader: SefariaReader): ReaderViewModel {
  if (!reader.viewModel) {
    throw new Error("Reader view model is missing.");
  }
  return reader.viewModel;
}

function sourceCard(): SefariaSourceCard {
  const element = root().querySelector<SefariaSourceCard>(
    "sefaria-source-card",
  );
  if (!element) {
    throw new Error("Source card is missing.");
  }
  return element;
}
