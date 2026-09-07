import { html } from "lit";
import { render } from "vitest-browser-lit";
import { afterEach, expect, test, vi } from "vitest";

import "./reader-element.js";
import type { SefariaReader } from "./reader-element.js";
import type { ReaderViewModel } from "./reader.js";

const source = {
  state: "data",
  header: {
    ref: "Micah 6:8",
    heRef: "מיכה ו׳:ח׳",
    indexTitle: "Micah",
    heIndexTitle: "מיכה",
    primaryCategory: "Tanakh",
    categories: ["Tanakh", "Prophets"],
  },
  attributions: [],
  items: [
    {
      position: [0],
      ref: "Micah 6:8",
      addressLabel: "8",
      pair: {
        state: "empty",
        absent: [
          { side: "primary", message: "No primary text." },
          { side: "translation", message: "No translation." },
        ],
      },
    },
  ],
} as const;

const connections = {
  state: "data",
  reference: "Micah 6:8",
  categories: [{ id: "Commentary", count: 1 }],
  category: "Commentary",
  entries: [
    {
      id: "rashi",
      targetRef: "Rashi on Micah 6:8",
      hebrewRef: "רש״י על מיכה ו׳:ח׳",
      book: "Rashi on Micah",
      preview: { state: "not-requested" },
      editions: [],
      licenses: [],
    },
  ],
  total: 1,
  page: 0,
  pageSize: 20,
  previewsIncluded: false,
} as const;

const paired: ReaderViewModel = {
  currentEntryId: "entry-2",
  label: "Micah 6:8",
  breadcrumbs: [
    { entryId: "entry-1", label: "Isaiah 1:17", current: false },
    { entryId: "entry-2", label: "Micah 6:8", current: true },
  ],
  canGoBack: true,
  historyTruncated: true,
  source: {
    viewModel: source,
    selectedPosition: [0],
    contentLanguage: "both",
    layout: "auto",
    sideOrder: "primary-first",
  },
  connections: {
    state: "component",
    viewModel: connections,
    showPreviews: false,
  },
  selectedTarget: { ref: "Micah 6:8" },
};

afterEach(() => vi.unstubAllGlobals());

async function mount(
  viewModel: ReaderViewModel = paired,
): Promise<SefariaReader> {
  render(
    html`<sefaria-reader
      .viewModel=${viewModel}
      active-pane="source"
      chat-export
    ></sefaria-reader>`,
  );
  const element = document.querySelector<SefariaReader>("sefaria-reader");
  if (!element) throw new Error("Reader was not rendered.");
  await element.updateComplete;
  return element;
}

test("renders paired state and forwards each child action once with origin identity", async () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  const element = await mount();
  const sourceEvent = vi.fn();
  const connectionEvent = vi.fn();
  element.addEventListener("sefaria-reader-source-select", sourceEvent);
  element.addEventListener("sefaria-reader-connection-select", connectionEvent);

  const sourceCard = element.shadowRoot!.querySelector("sefaria-source-card")!;
  sourceCard.dispatchEvent(
    new CustomEvent("sefaria-source-select", {
      detail: { position: [0], ref: "Micah 6:8" },
      bubbles: true,
      composed: true,
    }),
  );
  const panel = element.shadowRoot!.querySelector("sefaria-connections-panel")!;
  panel.dispatchEvent(
    new CustomEvent("sefaria-connection-select", {
      detail: { id: "rashi", targetRef: "Rashi on Micah 6:8" },
      bubbles: true,
      composed: true,
    }),
  );

  expect(sourceEvent).toHaveBeenCalledOnce();
  expect(sourceEvent.mock.calls[0]?.[0].detail).toEqual({
    originEntryId: "entry-2",
    position: [0],
    ref: "Micah 6:8",
  });
  expect(connectionEvent).toHaveBeenCalledOnce();
  expect(connectionEvent.mock.calls[0]?.[0].detail).toEqual({
    originEntryId: "entry-2",
    id: "rashi",
    targetRef: "Rashi on Micah 6:8",
  });
  expect(fetch).not.toHaveBeenCalled();
});

test("forwards connections controls once with origin identity", async () => {
  const element = await mount();
  const categories = vi.fn();
  const pages = vi.fn();
  const previews = vi.fn();
  element.addEventListener(
    "sefaria-reader-connections-category-change",
    categories,
  );
  element.addEventListener("sefaria-reader-connections-page-change", pages);
  element.addEventListener(
    "sefaria-reader-connections-preview-request",
    previews,
  );
  const panel = element.shadowRoot!.querySelector("sefaria-connections-panel")!;

  panel.dispatchEvent(
    new CustomEvent("sefaria-connections-category-change", {
      detail: { category: "Targum" },
      bubbles: true,
      composed: true,
    }),
  );
  panel.dispatchEvent(
    new CustomEvent("sefaria-connections-page-change", {
      detail: { page: 1 },
      bubbles: true,
      composed: true,
    }),
  );
  panel.dispatchEvent(
    new CustomEvent("sefaria-connections-preview-request", {
      bubbles: true,
      composed: true,
    }),
  );

  expect(categories).toHaveBeenCalledOnce();
  expect(categories.mock.calls[0]?.[0].detail).toEqual({
    originEntryId: "entry-2",
    category: "Targum",
  });
  expect(pages).toHaveBeenCalledOnce();
  expect(pages.mock.calls[0]?.[0].detail).toEqual({
    originEntryId: "entry-2",
    page: 1,
  });
  expect(previews).toHaveBeenCalledOnce();
  expect(previews.mock.calls[0]?.[0].detail).toEqual({
    originEntryId: "entry-2",
  });
});

test("emits Back, breadcrumb, pane, and explicit chat-export actions", async () => {
  const element = await mount();
  const events = new Map(
    [
      "sefaria-reader-back",
      "sefaria-reader-history-activate",
      "sefaria-reader-pane-change",
      "sefaria-reader-chat-export",
    ].map((name) => [name, vi.fn()]),
  );
  for (const [name, listener] of events) {
    element.addEventListener(name, listener);
  }

  const buttons = [...element.shadowRoot!.querySelectorAll("button")];
  buttons.find((button) => button.textContent?.trim() === "Back")!.click();
  buttons
    .find((button) => button.textContent?.trim() === "Isaiah 1:17")!
    .click();
  buttons
    .find((button) => button.textContent?.trim() === "Connections")!
    .click();
  buttons
    .find((button) => button.textContent?.includes("Send Micah 6:8 to chat"))!
    .click();

  expect(events.get("sefaria-reader-back")).toHaveBeenCalledOnce();
  expect(
    events.get("sefaria-reader-history-activate")?.mock.calls[0]?.[0].detail,
  ).toEqual({ originEntryId: "entry-2", entryId: "entry-1" });
  expect(
    events.get("sefaria-reader-pane-change")?.mock.calls[0]?.[0].detail,
  ).toEqual({ originEntryId: "entry-2", pane: "connections" });
  expect(
    events.get("sefaria-reader-chat-export")?.mock.calls[0]?.[0].detail,
  ).toEqual({ originEntryId: "entry-2", targetRef: "Micah 6:8" });
  expect(element.activePane).toBe("source");
});

test("disables Back at the root and hides unavailable chat export", async () => {
  const withoutSelectedTarget = omit(paired, "selectedTarget");
  const element = await mount({
    ...withoutSelectedTarget,
    breadcrumbs: [{ entryId: "entry-2", label: "Micah 6:8", current: true }],
    canGoBack: false,
  });
  const back = element.shadowRoot!.querySelector<HTMLButtonElement>(
    '[data-action="back"]',
  )!;

  expect(back.disabled).toBe(true);
  expect(element.shadowRoot?.textContent).not.toContain("to chat");
  expect(
    element.shadowRoot?.querySelector('[aria-current="page"]')?.textContent,
  ).toContain("Micah 6:8");
});

test("renders source-only, connections-only, and unavailable panes", async () => {
  const sourceOnlyViewModel = omit(paired, "connections");
  const sourceOnly = await mount(sourceOnlyViewModel);
  expect(sourceOnly.shadowRoot?.textContent).toContain(
    "Connections are not available for this entry.",
  );

  const connectionsOnlyViewModel = omit(paired, "source");
  sourceOnly.viewModel = {
    ...connectionsOnlyViewModel,
  };
  await sourceOnly.updateComplete;
  expect(sourceOnly.shadowRoot?.textContent).toContain(
    "Source text is not available for this entry.",
  );

  sourceOnly.viewModel = {
    ...paired,
    connections: {
      state: "unavailable",
      reason: "failed",
      message: "Connections could not be loaded.",
    },
  };
  await sourceOnly.updateComplete;
  expect(
    sourceOnly.shadowRoot?.querySelector('[role="alert"]')?.textContent,
  ).toContain("Connections could not be loaded");
});

function omit<Value extends object, Key extends keyof Value>(
  value: Value,
  key: Key,
): Omit<Value, Key> {
  const result = { ...value };
  delete result[key];
  return result;
}

test("uses compact pane visibility without changing semantic history", async () => {
  const element = await mount();
  element.style.width = "320px";
  await element.updateComplete;
  const paneSwitch =
    element.shadowRoot!.querySelector<HTMLElement>(".pane-switch")!;
  const sourcePane = element.shadowRoot!.querySelector<HTMLElement>(
    '[data-pane="source"]',
  )!;
  const connectionsPane = element.shadowRoot!.querySelector<HTMLElement>(
    '[data-pane="connections"]',
  )!;

  expect(paneSwitch.getAttribute("role")).toBe("group");
  expect(paneSwitch.getAttribute("aria-label")).toBe("Reader panes");
  expect(getComputedStyle(sourcePane).display).not.toBe("none");
  expect(getComputedStyle(connectionsPane).display).toBe("none");
  element.activePane = "connections";
  await element.updateComplete;
  expect(getComputedStyle(sourcePane).display).toBe("none");
  expect(getComputedStyle(connectionsPane).display).not.toBe("none");
  expect(element.viewModel).toBe(paired);
});

test("moves focus only when semantic current entry changes", async () => {
  const element = await mount();
  const back = element.shadowRoot!.querySelector<HTMLButtonElement>(
    '[data-action="back"]',
  )!;
  back.focus();
  element.activePane = "connections";
  await element.updateComplete;
  expect(element.shadowRoot?.activeElement).toBe(back);

  element.viewModel = {
    ...paired,
    currentEntryId: "entry-3",
    label: "Rashi on Micah 6:8",
    breadcrumbs: [
      ...paired.breadcrumbs.map((crumb) => ({ ...crumb, current: false })),
      {
        entryId: "entry-3",
        label: "Rashi on Micah 6:8",
        current: true,
      },
    ],
  };
  await element.updateComplete;
  await new Promise((resolve) => requestAnimationFrame(resolve));
  expect(element.shadowRoot?.activeElement).toBe(
    element.shadowRoot?.querySelector('[data-current-heading="true"]'),
  );
});
