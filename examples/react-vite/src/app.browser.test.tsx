import { createSefariaClient, zCoreV3TextsResponse } from "@sefaria/client";
import "@sefaria/web-components";
import type { SefariaSourceCard } from "@sefaria/web-components";
import { act, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import payload from "./micah-6-8.json";
import { ReactSourceCardExample } from "./app.js";
import { createMicahFixtureFetch } from "./fixture-transport.js";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const fixture = zCoreV3TextsResponse.parse(payload);
let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

test("keeps one request-free element while React changes display state and receives a real selection event", async () => {
  const fetch = vi.fn(createMicahFixtureFetch(fixture));
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);

  await act(async () => {
    root?.render(
      <ReactSourceCardExample
        client={createSefariaClient({
          baseUrl: "https://example.invalid",
          cache: false,
          fetch,
        })}
      />,
    );
  });

  const card = requireCard(container);
  expect(fetch).not.toHaveBeenCalled();
  expect(card.viewModel.state).toBe("data");
  expect(card.getAttribute("viewModel")).toBeNull();

  await act(async () => {
    click(container, "#theme-toggle");
    setRange(container, "#preview-width", "520");
  });

  expect(requireCard(container)).toBe(card);
  expect(fetch).not.toHaveBeenCalled();
  expect(container.querySelector<HTMLElement>("#preview")?.dataset.theme).toBe(
    "dark",
  );

  await card.updateComplete;
  await act(async () => {
    card.shadowRoot
      ?.querySelector<HTMLButtonElement>(
        'button[aria-label="Show connections for Micah 6:8"]',
      )
      ?.click();
  });

  expect(container.querySelector("#selected-ref")?.textContent).toContain(
    "Micah 6:8",
  );
  expect(card.selectedPosition).toEqual([]);
  expect(fetch).not.toHaveBeenCalled();
});

test("loads only on explicit actions and rejects stale overlapping results", async () => {
  let firstSignal: AbortSignal | undefined;
  let resolveFirst!: (response: Response) => void;
  let requestNumber = 0;
  const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    const sequence = ++requestNumber;
    if (sequence === 1) {
      firstSignal = request.signal;
      return await new Promise<Response>((resolve) => {
        resolveFirst = resolve;
      });
    }
    return Response.json(fixture);
  });
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);

  await act(async () => {
    root?.render(
      <ReactSourceCardExample
        client={createSefariaClient({
          baseUrl: "https://example.invalid",
          cache: false,
          fetch,
        })}
      />,
    );
  });
  expect(fetch).not.toHaveBeenCalled();

  await act(async () => click(container, "#load-live"));
  await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce());
  await act(async () => click(container, "#load-live"));
  await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  await act(async () => {
    await waitForReact();
  });
  expect(container.querySelector("#request-status")?.textContent).toContain(
    "Loaded Micah 6:8",
  );
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(firstSignal?.aborted).toBe(true);
  await act(async () => {
    resolveFirst(Response.json({ ...fixture, ref: "Obadiah 1:1" }));
  });

  const card = requireCard(container);
  expect(card.viewModel.state).toBe("data");
  expect(
    card.viewModel.state === "data" ? card.viewModel.header.ref : undefined,
  ).toBe("Micah 6:8");
  expect(container.querySelector("#request-count")?.textContent).toContain("2");
});

test("blank validation does not cancel an admitted request", async () => {
  let resolveRequest!: (response: Response) => void;
  let requestSignal: AbortSignal | undefined;
  const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    requestSignal = request.signal;
    return await new Promise<Response>((resolve) => {
      resolveRequest = resolve;
    });
  });
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);

  await act(async () => {
    root?.render(
      <ReactSourceCardExample
        client={createSefariaClient({
          baseUrl: "https://example.invalid",
          cache: false,
          fetch,
        })}
      />,
    );
  });
  await act(async () => click(container, "#load-live"));
  await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce());
  await act(async () => {
    setTextInput(container, 'input[name="tref"]', "   ");
  });
  await act(async () => click(container, "#load-live"));

  expect(container.querySelector("#load-error")?.textContent).toBe(
    "Enter a non-blank Sefaria reference.",
  );
  expect(fetch).toHaveBeenCalledOnce();
  expect(requestSignal?.aborted).toBe(false);

  resolveRequest(Response.json(fixture));
  await act(async () => {
    await waitForReact();
  });
  await vi.waitFor(
    () => expect(requireCard(container).viewModel.state).toBe("data"),
    { timeout: 5_000 },
  );
  expect(requireCard(container).viewModel.state).toBe("data");
  expect(container.querySelector("#request-status")?.textContent).toContain(
    "Loaded Micah 6:8",
  );
});

test("StrictMode does not request on mount and unmount removes listeners and aborts work", async () => {
  let resolveRequest!: (response: Response) => void;
  let requestSignal: AbortSignal | undefined;
  const strictFetch = createMicahFixtureFetch(fixture);
  const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    requestSignal = request.signal;
    await strictFetch(request);
    return await new Promise<Response>((resolve) => {
      resolveRequest = resolve;
    });
  });
  const additions = vi.spyOn(HTMLElement.prototype, "addEventListener");
  const removals = vi.spyOn(HTMLElement.prototype, "removeEventListener");
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);

  await act(async () => {
    root?.render(
      <StrictMode>
        <ReactSourceCardExample
          client={createSefariaClient({
            baseUrl: "https://example.invalid",
            cache: false,
            fetch,
          })}
        />
      </StrictMode>,
    );
  });
  expect(fetch).not.toHaveBeenCalled();

  await act(async () => click(container, "#load-live"));
  await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce());
  await act(async () => root?.unmount());
  root = undefined;

  expect(requestSignal?.aborted).toBe(true);
  expect(
    additions.mock.calls.filter(([type]) => type === "sefaria-source-select"),
  ).toHaveLength(
    removals.mock.calls.filter(([type]) => type === "sefaria-source-select")
      .length,
  );
  await act(async () => resolveRequest(Response.json(fixture)));
});

test("shows thrown and local validation failures without a success fallback", async () => {
  let rejectRequest!: (reason: unknown) => void;
  const fetch = vi.fn(
    async () =>
      await new Promise<Response>((_resolve, reject) => {
        rejectRequest = reject;
      }),
  );
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(
      <ReactSourceCardExample
        client={createSefariaClient({
          baseUrl: "https://example.invalid",
          cache: false,
          fetch,
        })}
      />,
    );
  });

  await act(async () => click(container, "#load-live"));
  await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce());
  await act(async () => {
    rejectRequest(new Error("Network unavailable."));
    await waitForReact();
  });
  expect(container.querySelector("#load-error")?.textContent).toBe(
    "Network unavailable.",
  );
  const failedPreview = container.querySelector<HTMLElement>("#preview");
  if (!failedPreview) throw new Error("The React preview is missing.");
  expect(failedPreview.hidden).toBe(true);
  expect(getComputedStyle(failedPreview).display).toBe("none");
  expect(fetch).toHaveBeenCalledOnce();
  expect(container.querySelector("#request-count")?.textContent).toContain("1");

  await act(async () => {
    setTextInput(container, 'input[name="tref"]', "   ");
  });
  await act(async () => click(container, "#load-live"));
  expect(container.querySelector("#load-error")?.textContent).toBe(
    "Enter a non-blank Sefaria reference.",
  );
  expect(fetch).toHaveBeenCalledOnce();

  await act(async () => {
    root?.unmount();
  });
  root = createRoot(container);
  await act(async () => {
    root?.render(
      <ReactSourceCardExample
        client={createSefariaClient({
          baseUrl: "https://example.invalid",
          cache: false,
          fetch,
        })}
        initialTref="   "
      />,
    );
  });
  await act(async () => {
    click(container, "#load-live");
  });
  expect(container.querySelector("#load-error")?.textContent).toBe(
    "Enter a non-blank Sefaria reference.",
  );
  expect(fetch).toHaveBeenCalledOnce();
  expect(container.querySelector("#request-count")?.textContent).toContain("0");
});

function requireCard(rootElement: ParentNode): SefariaSourceCard {
  const card = rootElement.querySelector<SefariaSourceCard>(
    "sefaria-source-card",
  );
  if (!card) throw new Error("The React source card is missing.");
  return card;
}

function click(rootElement: ParentNode, selector: string): void {
  const button = rootElement.querySelector<HTMLButtonElement>(selector);
  if (!button) throw new Error(`${selector} is missing.`);
  button.click();
}

function setRange(
  rootElement: ParentNode,
  selector: string,
  value: string,
): void {
  const input = rootElement.querySelector<HTMLInputElement>(selector);
  if (!input) throw new Error(`${selector} is missing.`);
  const setValue = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set;
  if (!setValue) throw new Error("The native input value setter is missing.");
  setValue.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function setTextInput(
  rootElement: ParentNode,
  selector: string,
  value: string,
): void {
  const input = rootElement.querySelector<HTMLInputElement>(selector);
  if (!input) throw new Error(`${selector} is missing.`);
  const setValue = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set;
  if (!setValue) throw new Error("The native input value setter is missing.");
  setValue.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

async function waitForReact(): Promise<void> {
  for (let index = 0; index < 3; index += 1) {
    await new Promise(requestAnimationFrame);
  }
}
