import { html } from "lit";
import { render } from "vitest-browser-lit";
import { afterEach, expect, test, vi } from "vitest";

import "./source-card-element.js";
import type {
  RefLabelDataViewModel,
  SefariaSourceCard,
  SourceCardDataViewModel,
  SourceCardViewModel,
  TextSegmentDataViewModel,
} from "./index.js";

const PRIMARY: TextSegmentDataViewModel = {
  state: "data",
  ref: "Genesis 1:1-2",
  heRef: "בראשית א׳:א׳-ב׳",
  language: "he",
  actualLanguage: "he",
  direction: "rtl",
  body: [{ kind: "html", html: "בְּרֵאשִׁית" }],
  notes: [],
  attribution: { versionTitle: "Primary", versionSource: null },
};

const TRANSLATION: TextSegmentDataViewModel = {
  ...PRIMARY,
  language: "en",
  actualLanguage: "en",
  direction: "ltr",
  body: [{ kind: "html", html: "In the beginning." }],
  attribution: { versionTitle: "Translation", versionSource: null },
};

const DATA: SourceCardDataViewModel = {
  state: "data",
  header: {
    ref: "Genesis 1:1-2",
    heRef: "בראשית א׳:א׳-ב׳",
    indexTitle: "Genesis",
    heIndexTitle: "בראשית",
    primaryCategory: "Tanakh",
    categories: ["Tanakh", "Torah"],
  },
  items: [
    {
      position: [0],
      pair: { state: "data", primary: PRIMARY, translation: TRANSLATION },
    },
    {
      position: [1],
      pair: {
        state: "partial",
        present: { side: "primary", view: PRIMARY },
        absent: { side: "translation", message: "No translation." },
      },
    },
  ],
};

const REFERENCE_LABEL: RefLabelDataViewModel = {
  state: "data",
  normalized: "Genesis 1:1-2",
  hebrew: "בראשית א׳:א׳-ב׳",
  urlRef: "Genesis.1.1-2",
  url: "https://www.sefaria.org/Genesis.1.1-2",
  indexTitle: "Genesis",
  nodeType: "JaggedArrayNode",
};

afterEach(() => {
  vi.unstubAllGlobals();
});

function element(): SefariaSourceCard {
  const found = document.querySelector<SefariaSourceCard>(
    "sefaria-source-card",
  );
  if (!found) {
    throw new Error("The source-card element was not rendered.");
  }
  return found;
}

async function renderCard(
  viewModel: SourceCardViewModel = DATA,
  referenceLabel?: RefLabelDataViewModel,
): Promise<SefariaSourceCard> {
  render(
    html`<sefaria-source-card
      .viewModel=${viewModel}
      .referenceLabel=${referenceLabel}
    ></sefaria-source-card>`,
  );
  const found = element();
  await found.updateComplete;
  return found;
}

test("makes no request while rendering the full card", async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);

  await renderCard();

  expect(fetchMock).not.toHaveBeenCalled();
});

test("renders the payload-derived bilingual header by default", async () => {
  const host = await renderCard();
  const header = host.shadowRoot?.querySelector("header");

  expect(header?.textContent).toContain("Genesis 1:1-2");
  expect(header?.textContent).toContain("בראשית א׳:א׳-ב׳");
  expect(header?.querySelector("a")).toBeNull();
});

test("renders a host-supplied linked reference label without requesting", async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  const host = await renderCard(DATA, REFERENCE_LABEL);
  const label = host.shadowRoot?.querySelector("sefaria-ref-label");
  await label?.updateComplete;

  expect(label?.shadowRoot?.querySelector("a")?.href).toBe(
    "https://www.sefaria.org/Genesis.1.1-2",
  );
  expect(fetchMock).not.toHaveBeenCalled();
});

test("renders ordered pairs and preserves a one-sided item", async () => {
  const host = await renderCard();
  const items = [
    ...(host.shadowRoot?.querySelectorAll<HTMLElement>("[data-position]") ??
      []),
  ];

  expect(items.map((item) => item.dataset.position)).toEqual(["0", "1"]);
  expect(items[0]?.querySelectorAll("sefaria-text-segment")).toHaveLength(2);
  expect(items[1]?.querySelectorAll("sefaria-text-segment")).toHaveLength(1);
  expect(items[1]?.textContent).toContain("No translation.");
  expect(items[1]?.querySelector(".absent")?.getAttribute("role")).toBeNull();
  expect(
    items[1]?.querySelector(".absent")?.getAttribute("aria-live"),
  ).toBeNull();
});

test("forwards pair presentation properties to every item", async () => {
  const host = await renderCard();
  host.contentLanguage = "translation";
  host.layout = "side-by-side";
  host.sideOrder = "translation-first";
  await host.updateComplete;

  const pairs = [
    ...(host.shadowRoot?.querySelectorAll<HTMLElement>(".pair") ?? []),
  ];
  expect(
    pairs.map((pair) => [
      pair.dataset.content,
      pair.dataset.layout,
      pair.dataset.order,
    ]),
  ).toEqual([
    ["translation", "side-by-side", "translation-first"],
    ["translation", "side-by-side", "translation-first"],
  ]);
});

test("preserves keyed item DOM when one pair changes", async () => {
  const host = await renderCard();
  const before = host.shadowRoot?.querySelector<HTMLElement>(
    '[data-position="0"]',
  );

  host.viewModel = {
    ...DATA,
    items: [
      DATA.items[0]!,
      {
        position: [1],
        pair: {
          state: "data",
          primary: PRIMARY,
          translation: TRANSLATION,
        },
      },
    ],
  };
  await host.updateComplete;

  expect(
    host.shadowRoot?.querySelector<HTMLElement>('[data-position="0"]'),
  ).toBe(before);
});

test.each([
  {
    viewModel: { state: "loading", message: "Loading source." } as const,
    role: "status",
  },
  {
    viewModel: {
      state: "error",
      errorKind: "projection",
      message: "Cannot align source.",
    } as const,
    role: "alert",
  },
])("renders $viewModel.state state", async ({ viewModel, role }) => {
  const host = await renderCard(viewModel);

  expect(
    host.shadowRoot?.querySelector(`[role="${role}"]`)?.textContent?.trim(),
  ).toBe(viewModel.message);
});

test("renders the header and empty message for an empty card", async () => {
  const host = await renderCard({
    state: "empty",
    header: DATA.header,
    absent: [
      { side: "primary", message: "No primary." },
      { side: "translation", message: "No translation." },
    ],
  });

  expect(host.shadowRoot?.querySelector("header")?.textContent).toContain(
    "Genesis 1:1-2",
  );
  expect(
    host.shadowRoot?.querySelector('[role="status"]')?.textContent?.trim(),
  ).toBe("No primary. No translation.");
});
