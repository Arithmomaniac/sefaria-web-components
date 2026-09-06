import type { SefariaSourceCard } from "@sefaria/components";
import { beforeEach, expect, test, vi } from "vitest";

import { v3SourceBackedPayload } from "../../../../tests/compatibility/src/v3-source-backed.fixture.js";
import { renderToolResult } from "./app.js";

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

function root(): HTMLElement {
  const element = document.querySelector<HTMLElement>("#app");
  if (!element) {
    throw new Error("MCP App root is missing.");
  }
  return element;
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
