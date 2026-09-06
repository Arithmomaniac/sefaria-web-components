import type { CoreLinkResponse } from "@sefaria/client";
import type {
  ConnectionsViewModel,
  SefariaConnectionsPanel,
  SefariaSourceCard,
} from "@sefaria/components";
import { beforeEach, expect, test, vi } from "vitest";

import capturedLinks from "../../../../packages/client/test/fixtures/links-connections-preview-2026-09-06.json";
import { v3SourceBackedPayload } from "../../../../tests/compatibility/src/v3-source-backed.fixture.js";
import { createConnectionsInteraction, renderToolResult } from "./app.js";

beforeEach(() => {
  document.documentElement.removeAttribute("style");
  document.querySelector("[data-mcp-app-test-styles]")?.remove();
  document.body.innerHTML = '<main id="app"></main>';
});

test("validates and renders a corrected source-card payload without requesting", async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);

  renderToolResult(
    root(),
    toolResult(200, structuredClone(v3SourceBackedPayload)),
  );

  const card = sourceCard();
  await card.updateComplete;
  expect(card.viewModel.state).toBe("data");
  expect(card.shadowRoot?.textContent).toContain("Genesis 1:1");
  expect(fetchMock).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
});

test("maps the host secondary surface only to the source-card muted surface", async () => {
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

  renderToolResult(
    root(),
    toolResult(200, structuredClone(v3SourceBackedPayload)),
  );

  const card = sourceCard();
  await card.updateComplete;
  expect(
    getComputedStyle(card).getPropertyValue("--sefaria-surface-muted").trim(),
  ).toBe("rgb(1 2 3)");
  expect(
    getComputedStyle(card).getPropertyValue("--sefaria-surface").trim(),
  ).not.toBe("rgb(1 2 3)");
});

test("reports structured paths for invalid corrected payloads", () => {
  renderToolResult(root(), toolResult(200, { versions: "wrong" }));

  expect(root().querySelector('[role="alert"]')?.textContent).toContain(
    "/versions",
  );
  expect(root().querySelector("sefaria-source-card")).toBeNull();
});

test("renders a documented 404 through the source-card error view model", async () => {
  renderToolResult(root(), toolResult(404, { error: "Unknown reference." }));

  const card = sourceCard();
  await card.updateComplete;
  expect(card.viewModel).toEqual({
    state: "error",
    errorKind: "http",
    status: 404,
    message: "Unknown reference.",
  });
  expect(card.shadowRoot?.querySelector('[role="alert"]')?.textContent).toBe(
    "Unknown reference.",
  );
});

test("rejects malformed result metadata before payload validation", () => {
  renderToolResult(root(), {
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
  });

  expect(root().querySelector('[role="alert"]')?.textContent).toContain(
    "/_meta/sefaria~1source-card/status",
  );
  expect(root().querySelector("sefaria-source-card")).toBeNull();
});

test("preserves a tool failure message without requiring App metadata", () => {
  renderToolResult(root(), {
    content: [{ type: "text", text: "Sefaria is temporarily unavailable." }],
    isError: true,
  });

  expect(root().querySelector('[role="alert"]')?.textContent).toBe(
    "Sefaria is temporarily unavailable.",
  );
  expect(root().querySelector("sefaria-source-card")).toBeNull();
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

test("renders preview connections in Commentary without requesting", async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);

  renderToolResult(
    root(),
    connectionsToolResult(200, structuredClone(capturedLinks), true),
  );

  const panel = connectionsPanel();
  await panel.updateComplete;
  const viewModel = dataViewModel(panel);
  expect(viewModel.category).toBe("Commentary");
  expect(viewModel.entries).toHaveLength(3);
  expect(panel.shadowRoot?.querySelector(".preview")?.textContent).toMatch(
    /beginning/i,
  );
  expect(fetchMock).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
});

test("reprojects categories and pages locally from one captured payload", async () => {
  const payload = pagedLinks();
  renderToolResult(root(), connectionsToolResult(200, payload, true));

  const panel = connectionsPanel();
  await panel.updateComplete;
  const firstPageIds = visibleIds(panel);
  const targum = [...panel.shadowRoot!.querySelectorAll("button")].find(
    (button) => button.textContent?.includes("Targum"),
  );
  targum?.click();
  await panel.updateComplete;
  expect(dataViewModel(panel).category).toBe("Targum");

  const commentary = [...panel.shadowRoot!.querySelectorAll("button")].find(
    (button) => button.textContent?.includes("Commentary"),
  );
  commentary?.click();
  await panel.updateComplete;
  const more = [...panel.shadowRoot!.querySelectorAll("button")].find(
    (button) => button.textContent?.trim() === "More",
  );
  more?.click();
  await panel.updateComplete;
  expect(dataViewModel(panel).page).toBe(1);
  expect(visibleIds(panel)).not.toEqual(firstPageIds);
});

test("sends the exact selected target as a user follow-up", async () => {
  const sendMessage = vi.fn().mockResolvedValue({});
  renderToolResult(
    root(),
    connectionsToolResult(200, structuredClone(capturedLinks), true),
    { sendMessage },
  );

  const panel = connectionsPanel();
  await panel.updateComplete;
  const button = panel.shadowRoot?.querySelector<HTMLButtonElement>(".open");
  const targetRef = button?.querySelector('[lang="en"]')?.textContent;
  button?.click();

  await vi.waitFor(() => expect(sendMessage).toHaveBeenCalledOnce());
  expect(sendMessage).toHaveBeenCalledWith(
    `Use get_text with reference "${targetRef}" and version_language "both" to show the selected source.`,
  );
  expect(root().querySelector('[role="status"]')?.textContent).toContain(
    "delivered",
  );
});

test("offers selectable fallback text when no message host is connected", async () => {
  renderToolResult(
    root(),
    connectionsToolResult(200, structuredClone(capturedLinks), true),
  );

  const panel = connectionsPanel();
  await panel.updateComplete;
  panel.shadowRoot?.querySelector<HTMLButtonElement>(".open")?.click();

  expect(
    root().querySelector<HTMLTextAreaElement>(
      'textarea[aria-label="Follow-up request"]',
    )?.value,
  ).toContain("Use get_text with reference");
});

test("metadata-only results request previews through a later chat turn", async () => {
  const sendMessage = vi.fn().mockResolvedValue({});
  renderToolResult(
    root(),
    connectionsToolResult(200, structuredClone(capturedLinks), false),
    { sendMessage },
  );

  const panel = connectionsPanel();
  await panel.updateComplete;
  expect(dataViewModel(panel).previewsIncluded).toBe(false);
  const loadPreviews = [...panel.shadowRoot!.querySelectorAll("button")].find(
    (button) => button.textContent?.trim() === "Load previews",
  );
  loadPreviews?.click();

  await vi.waitFor(() => expect(sendMessage).toHaveBeenCalledOnce());
  expect(sendMessage).toHaveBeenCalledWith(
    'Use get_links_between_texts with reference "Micah 6:8" and with_text "1" to show connection previews.',
  );
});

test("does not retry rejected or concurrent follow-up sends", async () => {
  let resolveSend: ((value: { isError: true }) => void) | undefined;
  const sendMessage = vi.fn(
    () =>
      new Promise<{ isError: true }>((resolve) => {
        resolveSend = resolve;
      }),
  );
  renderToolResult(
    root(),
    connectionsToolResult(200, structuredClone(capturedLinks), true),
    { sendMessage },
  );

  const panel = connectionsPanel();
  await panel.updateComplete;
  const button = panel.shadowRoot?.querySelector<HTMLButtonElement>(".open");
  button?.click();
  button?.click();
  expect(sendMessage).toHaveBeenCalledOnce();
  resolveSend?.({ isError: true });

  await vi.waitFor(() =>
    expect(
      root().querySelector<HTMLTextAreaElement>(
        'textarea[aria-label="Follow-up request"]',
      )?.hidden,
    ).toBe(false),
  );
  expect(root().querySelector('[role="alert"]')?.textContent).toContain(
    "rejected",
  );
});

test("renders documented connections errors and rejects oversized captures", async () => {
  renderToolResult(
    root(),
    connectionsToolResult(
      400,
      { error: "Invalid reference.", ref: "Missing 1:1" },
      false,
    ),
  );
  const panel = connectionsPanel();
  await panel.updateComplete;
  expect(panel.viewModel).toEqual({
    state: "error",
    errorKind: "http",
    status: 400,
    message: "Invalid reference.",
  });

  renderToolResult(
    root(),
    connectionsToolResult(
      200,
      Array.from({ length: 10_001 }, () => null),
      false,
    ),
  );
  expect(root().querySelector('[role="alert"]')?.textContent).toContain(
    "10000",
  );
  expect(root().querySelector("sefaria-connections-panel")).toBeNull();
});

test("prefixes connections validation paths and rejects ambiguous metadata", () => {
  const invalidLinks = structuredClone(capturedLinks) as unknown as Array<
    Record<string, unknown>
  >;
  invalidLinks[0]!._id = 3;
  renderToolResult(root(), connectionsToolResult(200, invalidLinks, true));
  expect(root().querySelector('[role="alert"]')?.textContent).toContain(
    "/structuredContent/payload",
  );

  renderToolResult(root(), {
    ...connectionsToolResult(200, structuredClone(capturedLinks), true),
    _meta: {
      ...connectionsToolResult(200, [], true)._meta,
      ...toolResult(200, structuredClone(v3SourceBackedPayload))._meta,
    },
  });
  expect(root().querySelector('[role="alert"]')?.textContent).toContain(
    "exactly one",
  );
});

function toolResult(status: 200 | 400 | 404, structuredContent: unknown) {
  return {
    structuredContent,
    _meta: {
      "sefaria/source-card": {
        operation: "getV3Texts",
        method: "GET",
        path: "/api/v3/texts/{tref}",
        status,
        request: { tref: "Genesis 1:1" },
      },
    },
  };
}

function connectionsToolResult(
  status: 200 | 400,
  payload: unknown,
  withText: boolean,
) {
  return {
    structuredContent: { payload },
    _meta: {
      "sefaria/connections": {
        operation: "getLinks",
        method: "GET",
        path: "/api/links/{tref}",
        status,
        request: { tref: "Micah 6:8", withText },
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

function connectionsPanel(): SefariaConnectionsPanel {
  const element = root().querySelector<SefariaConnectionsPanel>(
    "sefaria-connections-panel",
  );
  if (!element) {
    throw new Error("Connections panel is missing.");
  }
  return element;
}

function visibleIds(panel: SefariaConnectionsPanel): readonly string[] {
  return panel.viewModel?.state === "data"
    ? panel.viewModel.entries.map((entry) => entry.id)
    : [];
}

function dataViewModel(
  panel: SefariaConnectionsPanel,
): Extract<ConnectionsViewModel, { readonly state: "data" }> {
  const viewModel = panel.viewModel;
  if (viewModel?.state !== "data") {
    throw new Error("Expected connections data.");
  }
  return viewModel;
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
