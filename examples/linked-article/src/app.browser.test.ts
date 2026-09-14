import { createSefariaClient } from "@sefaria/client";
import type { SefariaPopup, SefariaSourceCard } from "@sefaria/web-components";
import { afterEach, expect, test, vi } from "vitest";

import micahPayload from "../../vanilla-vite/src/micah-6-8.json";
import { startLinkedArticle } from "./app.js";
import { createLinkedArticleFixtureFetch } from "./fixture-transport.js";

afterEach(() => {
  document.body.replaceChildren();
  document.head.querySelector("#host-style-test")?.remove();
});

function renderArticle(): HTMLAnchorElement[] {
  document.body.innerHTML = `
    <main>
      <article>
        <a href="https://www.sefaria.org/Micah.6.8" data-sefaria-ref="Micah 6:8">Micah 6:8</a>
        <a href="https://www.sefaria.org/Micah.6.8?lang=bi" data-sefaria-ref="Micah 6:8">the prophet's words</a>
      </article>
      <p data-linked-article-status role="status"></p>
    </main>
  `;
  return [
    ...document.querySelectorAll<HTMLAnchorElement>("[data-sefaria-ref]"),
  ];
}

test("uses one real popup factory request and preserves style isolation", async () => {
  const anchors = renderArticle();
  const fetch = vi.fn(createLinkedArticleFixtureFetch(micahPayload));
  const client = createSefariaClient({
    baseUrl: "https://example.invalid",
    cache: false,
    fetch,
  });
  const style = document.createElement("style");
  style.id = "host-style-test";
  style.textContent = `.dialog { background: rgb(255, 0, 255) !important; } sefaria-popup button { color: rgb(0, 255, 0) !important; }`;
  document.head.append(style);
  const app = startLinkedArticle(document, client);

  anchors[0]!.click();
  const popup = document.querySelector<SefariaPopup>("sefaria-popup");
  await vi.waitFor(() => expect(popup?.viewModel?.state).toBe("data"));
  await popup?.updateComplete;

  expect(fetch).toHaveBeenCalledTimes(1);
  expect(popup?.anchor).toBe(anchors[0]);
  const card = popup?.shadowRoot?.querySelector<SefariaSourceCard>(
    "sefaria-source-card",
  );
  await card?.updateComplete;
  expect(card?.shadowRoot?.textContent).toContain("Micah 6:8");
  expect(
    getComputedStyle(popup!.shadowRoot!.querySelector(".dialog")!)
      .backgroundColor,
  ).not.toBe("rgb(255, 0, 255)");
  expect(getComputedStyle(anchors[0]!).color).not.toBe("rgb(0, 255, 0)");
  app.destroy();
});

test("enhances keyboard activation but preserves modifier navigation", async () => {
  const [anchor] = renderArticle();
  const fetch = vi.fn(createLinkedArticleFixtureFetch(micahPayload));
  const app = startLinkedArticle(
    document,
    createSefariaClient({
      baseUrl: "https://example.invalid",
      cache: false,
      fetch,
    }),
  );

  const keyboardActivation = new MouseEvent("click", {
    bubbles: true,
    cancelable: true,
    button: 0,
    detail: 0,
  });
  anchor!.dispatchEvent(keyboardActivation);
  await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
  expect(keyboardActivation.defaultPrevented).toBe(true);

  const modified = new MouseEvent("click", {
    bubbles: true,
    cancelable: true,
    button: 0,
    ctrlKey: true,
  });
  anchor!.dispatchEvent(modified);
  expect(modified.defaultPrevented).toBe(false);
  expect(fetch).toHaveBeenCalledTimes(1);
  app.destroy();
});

test("shows failures instead of success-shaped fallback", async () => {
  const [anchor] = renderArticle();
  const app = startLinkedArticle(
    document,
    createSefariaClient({
      cache: false,
      fetch: vi.fn(async () => {
        throw new TypeError("fixture network unavailable");
      }),
    }),
  );

  anchor!.click();
  const popup = document.querySelector<SefariaPopup>("sefaria-popup");
  const status = document.querySelector<HTMLElement>(
    "[data-linked-article-status]",
  );
  await vi.waitFor(() => expect(status?.getAttribute("role")).toBe("alert"));
  expect(status?.textContent).toContain("fixture network unavailable");
  expect(popup?.open).toBe(false);
  app.destroy();
});

test("suppresses stale completions and aborts close and destroy work", async () => {
  const anchors = renderArticle();
  const pending: Array<{
    signal: AbortSignal;
    resolve: (response: Response) => void;
  }> = [];
  const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    return await new Promise<Response>((resolve) => {
      pending.push({ signal: request.signal, resolve });
    });
  });
  const app = startLinkedArticle(
    document,
    createSefariaClient({
      baseUrl: "https://example.invalid",
      cache: false,
      fetch,
    }),
  );

  anchors[0]!.click();
  anchors[1]!.click();
  expect(pending[0]!.signal.aborted).toBe(true);
  pending[1]!.resolve(Response.json(micahPayload));
  const popup = document.querySelector<SefariaPopup>("sefaria-popup");
  await vi.waitFor(() => expect(popup?.viewModel?.state).toBe("data"));
  expect(popup?.anchor).toBe(anchors[1]);
  pending[0]!.resolve(
    Response.json({ ...micahPayload, ref: "Obsolete result" }),
  );
  await Promise.resolve();
  expect(popup?.anchor).toBe(anchors[1]);

  anchors[0]!.click();
  popup?.dispatchEvent(
    new CustomEvent("sefaria-popup-close", { bubbles: true, composed: true }),
  );
  expect(pending[2]!.signal.aborted).toBe(true);

  anchors[1]!.click();
  app.destroy();
  expect(pending[3]!.signal.aborted).toBe(true);
  expect(document.querySelector("sefaria-popup")).toBeNull();
  expect(anchors[0]!.hasAttribute("aria-controls")).toBe(false);
});
