import { html } from "lit";
import { render } from "vitest-browser-lit";
import { afterEach, expect, test, vi } from "vitest";
import "./connections-panel-element.js";
import type { SefariaConnectionsPanel } from "./connections-panel-element.js";
import type { ConnectionsViewModel } from "./connections-panel.js";

const data: ConnectionsViewModel = {
  state: "data",
  reference: "Genesis 1:1",
  categories: [{ id: "Commentary", count: 21 }],
  category: "Commentary",
  page: 0,
  pageSize: 20,
  total: 21,
  previewsIncluded: true,
  entries: [
    {
      id: "one",
      targetRef: "Rashi on Genesis 1:1:1",
      hebrewRef: "רש״י",
      book: "Rashi",
      preview: {
        state: "available",
        english: { html: "<b>Text</b>", text: "Text", truncated: true },
        hebrew: { html: "<b>טקסט</b>", text: "טקסט", truncated: false },
      },
      editions: ["Edition"],
      licenses: [],
    },
  ],
};
afterEach(() => vi.unstubAllGlobals());

async function mount(vm = data): Promise<SefariaConnectionsPanel> {
  render(
    html`<sefaria-connections-panel
      .viewModel=${vm}
    ></sefaria-connections-panel>`,
  );
  const element = document.querySelector("sefaria-connections-panel")!;
  await element.updateComplete;
  return element;
}

test("renders safe previews, missing sides and composed navigation without requests", async () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  const element = await mount();
  const event = vi.fn();
  document.addEventListener("sefaria-connection-select", event, { once: true });
  const button = element.shadowRoot!.querySelector<HTMLButtonElement>(".open")!;
  button.focus();
  expect(element.shadowRoot?.activeElement).toBe(button);
  button.click();
  expect(event).toHaveBeenCalledOnce();
  expect(event.mock.calls[0]?.[0].detail).toEqual({
    id: "one",
    targetRef: "Rashi on Genesis 1:1:1",
  });
  expect(element.shadowRoot?.querySelector(".preview b")?.textContent).toBe(
    "Text",
  );
  const hebrewPreview =
    element.shadowRoot?.querySelector<HTMLElement>(".preview.hebrew");
  expect(hebrewPreview?.lang).toBe("he");
  expect(hebrewPreview?.dir).toBe("rtl");
  expect(element.shadowRoot?.textContent).toContain("Preview shortened");
  element.showPreviews = false;
  await element.updateComplete;
  expect(element.shadowRoot?.querySelector(".preview")).toBeNull();
  expect(fetch).not.toHaveBeenCalled();
});

test("category and page buttons emit semantic events without mutating the model", async () => {
  const element = await mount();
  const page = vi.fn();
  const category = vi.fn();
  element.addEventListener("sefaria-connections-page-change", page);
  element.addEventListener("sefaria-connections-category-change", category);
  const buttons = [...element.shadowRoot!.querySelectorAll("button")];
  buttons.find((button) => button.textContent?.trim() === "More")!.click();
  buttons.find((button) => button.textContent?.trim() === "Overview")!.click();
  expect(page.mock.calls[0]?.[0].detail).toEqual({ page: 1 });
  expect(category.mock.calls[0]?.[0].detail).toEqual({ category: null });
  expect(element.viewModel).toBe(data);
});

test("handles explicit loading/error states and narrow host widths", async () => {
  const element = await mount({
    state: "loading",
    message: "Loading connections.",
  });
  expect(
    element.shadowRoot?.querySelector('[role="status"]')?.textContent,
  ).toContain("Loading");
  element.viewModel = {
    state: "error",
    errorKind: "api",
    message: "Invalid reference.",
  };
  await element.updateComplete;
  expect(
    element.shadowRoot?.querySelector('[role="alert"]')?.textContent,
  ).toContain("Invalid reference");
  element.viewModel = data;
  element.style.width = "280px";
  await element.updateComplete;
  expect(element.scrollWidth).toBeLessThanOrEqual(element.clientWidth + 1);
});
