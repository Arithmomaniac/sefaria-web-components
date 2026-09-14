import { html } from "lit";
import { render } from "vitest-browser-lit";
import { afterEach, expect, test, vi } from "vitest";

import "./popup-element.js";
import type {
  PopupDataViewModel,
  SefariaPopup,
  SefariaSourceCard,
  SourceCardDataViewModel,
  TextSegmentDataViewModel,
} from "./index.js";

const TEXT: TextSegmentDataViewModel = {
  state: "data",
  ref: "Genesis 1:1",
  heRef: "בראשית א׳:א׳",
  language: "en",
  actualLanguage: "en",
  direction: "ltr",
  body: [{ kind: "html", html: "In the beginning." }],
  notes: [],
};

const CARD: SourceCardDataViewModel = {
  state: "data",
  header: {
    ref: "Genesis 1:1",
    heRef: "בראשית א׳:א׳",
    indexTitle: "Genesis",
    heIndexTitle: "בראשית",
    primaryCategory: "Tanakh",
    categories: ["Tanakh", "Torah"],
  },
  attributions: [
    {
      side: "translation",
      versionTitle: "Translation",
      versionSource: null,
      versionSourceUrl: null,
    },
  ],
  items: [
    {
      position: [],
      pair: {
        state: "partial",
        present: { side: "translation", view: TEXT },
        absent: { side: "primary", message: "No primary text." },
      },
    },
  ],
};

const DATA: PopupDataViewModel = {
  state: "data",
  card: CARD,
  truncated: true,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

async function renderPopup(): Promise<{
  popup: SefariaPopup;
  anchor: HTMLButtonElement;
}> {
  render(html`
    <button id="anchor">Genesis 1:1</button>
    <sefaria-popup .viewModel=${DATA} open></sefaria-popup>
  `);
  const popup = document.querySelector<SefariaPopup>("sefaria-popup");
  const anchor = document.querySelector<HTMLButtonElement>("#anchor");
  if (!popup || !anchor) {
    throw new Error("Popup fixture did not render.");
  }
  popup.anchor = anchor;
  await popup.updateComplete;
  return { popup, anchor };
}

test("renders supplied data without requesting", async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  const { popup } = await renderPopup();

  const dialog =
    popup.shadowRoot?.querySelector<HTMLElement>('[role="dialog"]');
  expect(dialog).not.toBeNull();
  expect(getComputedStyle(dialog!).backgroundColor).toBe("rgb(255, 253, 248)");
  expect(popup.shadowRoot?.querySelector(".brand")?.textContent).toContain(
    "Sefaria",
  );
  expect(popup.shadowRoot?.textContent).toContain("Showing the first 20");
  const card = popup.shadowRoot?.querySelector<SefariaSourceCard>(
    "sefaria-source-card",
  );
  await card?.updateComplete;
  expect(card?.hideAttributions).toBe(false);
  expect(card?.shadowRoot?.querySelector(".attributions")).not.toBeNull();
  expect(fetchMock).not.toHaveBeenCalled();
});

test("repositions within the viewport after a resize", async () => {
  const { popup } = await renderPopup();
  const anchor = popup.anchor!;
  vi.spyOn(anchor, "getBoundingClientRect").mockReturnValue({
    x: 1000,
    y: 100,
    left: 1000,
    right: 1080,
    top: 100,
    bottom: 132,
    width: 80,
    height: 32,
    toJSON: () => ({}),
  });
  vi.stubGlobal("innerWidth", 390);
  window.dispatchEvent(new Event("resize"));
  const close =
    popup.shadowRoot?.querySelector<HTMLButtonElement>(".close-button");

  expect(popup.style.left).toBe("8px");
  expect(getComputedStyle(close!).minWidth).toBe("44px");
  expect(getComputedStyle(close!).minHeight).toBe("44px");
});

test("keeps the popup visible when its anchor scrolls off-screen", async () => {
  const { popup } = await renderPopup();
  vi.spyOn(popup.anchor!, "getBoundingClientRect").mockReturnValue({
    x: 100,
    y: -82,
    left: 100,
    right: 180,
    top: -82,
    bottom: -50,
    width: 80,
    height: 32,
    toJSON: () => ({}),
  });

  window.dispatchEvent(new Event("scroll"));

  expect(popup.style.top).toBe("8px");
});

test("uses the solid accent for the close-button focus indicator", async () => {
  const { popup } = await renderPopup();
  const close =
    popup.shadowRoot?.querySelector<HTMLButtonElement>(".close-button");
  close?.focus();

  expect(getComputedStyle(close!).outlineColor).toBe("rgb(142, 36, 73)");
});

test("allows the host to theme the error color", async () => {
  const { popup } = await renderPopup();
  popup.style.setProperty("--sefaria-danger", "rgb(1, 2, 3)");
  popup.viewModel = {
    state: "error",
    errorKind: "projection",
    message: "Unable to render source.",
  };
  await popup.updateComplete;

  const alert = popup.shadowRoot?.querySelector<HTMLElement>('[role="alert"]');
  expect(getComputedStyle(alert!).color).toBe("rgb(1, 2, 3)");
});

test("focuses the close button and restores the trigger on Escape", async () => {
  const { popup, anchor } = await renderPopup();
  anchor.focus();
  popup.open = false;
  await popup.updateComplete;
  popup.open = true;
  await popup.updateComplete;

  const close =
    popup.shadowRoot?.querySelector<HTMLButtonElement>(".close-button");
  expect(popup.shadowRoot?.activeElement).toBe(close);

  close?.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      composed: true,
    }),
  );
  await popup.updateComplete;

  expect(popup.open).toBe(false);
  expect(document.activeElement).toBe(anchor);
});

test("cycles focus within the open dialog", async () => {
  const { popup } = await renderPopup();
  const close =
    popup.shadowRoot?.querySelector<HTMLButtonElement>(".close-button");

  close?.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Tab", bubbles: true }),
  );
  expect(popup.shadowRoot?.activeElement).toBe(close);

  close?.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Tab",
      shiftKey: true,
      bubbles: true,
    }),
  );
  expect(popup.shadowRoot?.activeElement).toBe(close);
});
