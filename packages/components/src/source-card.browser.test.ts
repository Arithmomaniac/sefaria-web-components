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
};

const TRANSLATION: TextSegmentDataViewModel = {
  ...PRIMARY,
  language: "en",
  actualLanguage: "en",
  direction: "ltr",
  body: [{ kind: "html", html: "In the beginning." }],
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
  attributions: [
    {
      side: "primary",
      versionTitle: "Primary",
      versionSource: null,
      versionSourceUrl: null,
    },
    {
      side: "translation",
      versionTitle: "Translation",
      versionSource: "Translation publisher",
      versionSourceUrl: null,
    },
  ],
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

test("selection is opt-in, controlled and composed without requesting", async () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  const selectableData: SourceCardDataViewModel = {
    ...DATA,
    items: DATA.items.map((item, index) => ({
      ...item,
      ref: `Genesis 1:${index + 1}`,
      addressLabel: String(index + 1),
    })),
  };
  const host = await renderCard(selectableData);
  expect(host.shadowRoot?.querySelector("button.segment-label")).toBeNull();
  expect(host.shadowRoot?.querySelector(".item.selectable")).toBeNull();
  const selection = vi.fn();
  document.addEventListener("sefaria-source-select", selection, { once: true });
  host.selectable = true;
  host.selectedPosition = [1];
  await host.updateComplete;
  expect(selection).not.toHaveBeenCalled();
  await host.revealSelection();
  const button = host.shadowRoot?.querySelector<HTMLButtonElement>(
    '[aria-pressed="true"]',
  );
  expect(button?.textContent?.trim()).toBe("ב׳");
  expect(button?.getAttribute("aria-label")).toBe(
    "Show connections for Genesis 1:2",
  );
  expect(host.shadowRoot?.activeElement).toBe(button);
  button?.click();
  expect(selection.mock.calls[0]?.[0].detail).toEqual({
    position: [1],
    ref: "Genesis 1:2",
  });
  expect(fetch).not.toHaveBeenCalled();
});

test("renders Hebrew and English labels beside their corresponding sides", async () => {
  const selectableData: SourceCardDataViewModel = {
    ...DATA,
    items: ["15", "16", "21"].map((addressLabel, index) => ({
      ...DATA.items[0]!,
      position: [index],
      ref: `Example ${addressLabel}`,
      addressLabel,
      pair: { state: "data", primary: PRIMARY, translation: TRANSLATION },
    })),
  };
  const host = await renderCard(selectableData);
  host.selectable = true;
  await host.updateComplete;
  const labels = [
    ...(host.shadowRoot?.querySelectorAll<HTMLButtonElement>(
      "button.segment-label",
    ) ?? []),
  ];
  expect(labels.map((button) => button.textContent?.trim())).toEqual([
    "ט״ו",
    "15",
    "ט״ז",
    "16",
    "כ״א",
    "21",
  ]);
  expect(labels.map((button) => button.querySelector("span")?.lang)).toEqual([
    "he",
    "en",
    "he",
    "en",
    "he",
    "en",
  ]);
  expect(getComputedStyle(labels[0]!).fontFamily).toContain("Noto Sans Hebrew");
  expect(getComputedStyle(labels[1]!).fontFamily).toBe("system-ui, sans-serif");
  expect(labels[0]?.lang).toBe("");
  const segment = host.shadowRoot?.querySelector("sefaria-text-segment");

  host.showAddressLabels = false;
  host.selectedPosition = [0];
  await host.updateComplete;
  expect(host.shadowRoot?.querySelector(".segment-label")).toBeNull();
  const hiddenControl = host.shadowRoot?.querySelector<HTMLButtonElement>(
    ".segment-select-control",
  );
  expect(hiddenControl).not.toBeNull();
  expect(host.shadowRoot?.querySelector("sefaria-text-segment")).toBe(segment);
  await host.revealSelection();
  expect(host.shadowRoot?.activeElement).toBe(hiddenControl);
  expect(getComputedStyle(hiddenControl!).position).toBe("static");
  expect(hiddenControl!.getBoundingClientRect().width).toBeGreaterThan(1);
});

test("does not expose pointer-only selection when an address label is absent", async () => {
  const selection = vi.fn();
  const host = await renderCard({
    ...DATA,
    items: [{ ...DATA.items[0]!, ref: "Genesis 1:1" }],
  });
  host.selectable = true;
  host.addEventListener("sefaria-source-select", selection);
  await host.updateComplete;
  const item = host.shadowRoot?.querySelector<HTMLElement>(".item");

  expect(item?.classList.contains("selectable")).toBe(false);
  item?.click();
  expect(selection).not.toHaveBeenCalled();
  expect(host.shadowRoot?.querySelector("button")).toBeNull();
});

test("keeps each address label beside its text in stacked and side-by-side layouts", async () => {
  const selectableData: SourceCardDataViewModel = {
    ...DATA,
    items: [
      {
        ...DATA.items[0]!,
        ref: "Genesis 1:1",
        addressLabel: "1",
        pair: { state: "data", primary: PRIMARY, translation: TRANSLATION },
      },
    ],
  };
  const host = await renderCard(selectableData);
  host.selectable = true;
  host.contentLanguage = "both";
  host.layout = "stacked";
  await host.updateComplete;
  const pair = host.shadowRoot?.querySelector<HTMLElement>(".pair");
  const primary = host.shadowRoot?.querySelector<HTMLElement>(
    '[data-pair-side="primary"]',
  );
  const translation = host.shadowRoot?.querySelector<HTMLElement>(
    '[data-pair-side="translation"]',
  );
  expect(primary?.querySelector(".segment-label.hebrew")).not.toBeNull();
  expect(translation?.querySelector(".segment-label.english")).not.toBeNull();
  expect(getComputedStyle(pair!).gridTemplateColumns.split(" ")).toHaveLength(
    1,
  );

  host.layout = "side-by-side";
  host.sideOrder = "translation-first";
  await host.updateComplete;
  expect(getComputedStyle(pair!).gridTemplateColumns.split(" ")).toHaveLength(
    2,
  );
  expect(primary?.querySelector(".segment-label.hebrew")).not.toBeNull();
  expect(translation?.querySelector(".segment-label.english")).not.toBeNull();
  expect(translation!.getBoundingClientRect().left).toBeLessThan(
    primary!.getBoundingClientRect().left,
  );
  const translationLabel =
    translation!.querySelector<HTMLElement>(".segment-label");
  const translationText = translation!.querySelector<HTMLElement>(
    "sefaria-text-segment",
  );
  expect(translationLabel!.getBoundingClientRect().right).toBeLessThanOrEqual(
    translationText!.getBoundingClientRect().left,
  );
  expect(translationText!.getBoundingClientRect().width).toBeGreaterThan(
    translationLabel!.getBoundingClientRect().width,
  );

  host.layout = "auto";
  host.style.width = "700px";
  host.style.maxWidth = "none";
  await host.updateComplete;
  await new Promise(requestAnimationFrame);
  expect(getComputedStyle(pair!).gridTemplateColumns.split(" ")).toHaveLength(
    2,
  );
  expect(translation!.getBoundingClientRect().left).toBeLessThan(
    primary!.getBoundingClientRect().left,
  );
});

test("unlabeled translation text uses the full pair-side width", async () => {
  const host = await renderCard(DATA);
  host.contentLanguage = "translation";
  await host.updateComplete;
  const translation = host.shadowRoot!.querySelector<HTMLElement>(
    '[data-pair-side="translation"]',
  )!;
  const segment = translation.querySelector<HTMLElement>(
    "sefaria-text-segment",
  )!;
  expect(segment.getBoundingClientRect().width).toBeCloseTo(
    translation.getBoundingClientRect().width,
    0,
  );
});

test("selects from row clicks without intercepting links or text selection", async () => {
  const linkedPrimary: TextSegmentDataViewModel = {
    ...PRIMARY,
    body: [
      {
        kind: "html",
        html: '<a href="#citation">Citation</a> and selectable text.',
      },
    ],
  };
  const selectableData: SourceCardDataViewModel = {
    ...DATA,
    items: DATA.items.map((item, index) => ({
      ...item,
      ref: `Genesis 1:${index + 1}`,
      addressLabel: String(index + 1),
      pair:
        index === 0
          ? { state: "data", primary: linkedPrimary, translation: TRANSLATION }
          : item.pair,
    })),
  };
  const host = await renderCard(selectableData);
  host.selectable = true;
  await host.updateComplete;
  const selection = vi.fn();
  host.addEventListener("sefaria-source-select", selection);
  const rows = [
    ...(host.shadowRoot?.querySelectorAll<HTMLElement>("[data-position]") ??
      []),
  ];

  rows[0]?.click();
  expect(selection).toHaveBeenCalledTimes(1);
  expect(selection.mock.calls[0]?.[0].detail).toEqual({
    position: [0],
    ref: "Genesis 1:1",
  });

  const segment = rows[0]?.querySelector("sefaria-text-segment");
  await segment?.updateComplete;
  const citation = segment?.shadowRoot?.querySelector<HTMLAnchorElement>("a");
  citation?.addEventListener("click", (event) => event.preventDefault());
  citation?.click();
  expect(selection).toHaveBeenCalledTimes(1);

  vi.spyOn(document, "getSelection").mockReturnValue({
    isCollapsed: false,
  } as Selection);
  rows[1]?.click();
  expect(selection).toHaveBeenCalledTimes(1);
});

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
  expect(getComputedStyle(header!).borderBottomStyle).toBe("solid");
  expect(getComputedStyle(header!).paddingBottom).toBe("12px");
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

test("renders each edition attribution once outside the repeated pairs", async () => {
  const host = await renderCard();
  const attributions = [
    ...(host.shadowRoot?.querySelectorAll<HTMLElement>(".attribution") ?? []),
  ];
  const segments = [
    ...(host.shadowRoot?.querySelectorAll("sefaria-text-segment") ?? []),
  ];
  await Promise.all(segments.map((segment) => segment.updateComplete));

  expect(attributions.map((entry) => entry.dataset.side)).toEqual([
    "primary",
    "translation",
  ]);
  expect(attributions[0]?.textContent).toContain("Primary");
  expect(attributions[1]?.textContent).toContain("Translation publisher");
  expect(
    segments.some((segment) =>
      segment.shadowRoot?.querySelector(".attribution"),
    ),
  ).toBe(false);
});

test("can hide edition attribution without changing the view model", async () => {
  const host = await renderCard();
  host.setAttribute("hide-attributions", "");
  await host.updateComplete;

  expect(host.hideAttributions).toBe(true);
  expect(host.shadowRoot?.querySelector(".attributions")).toBeNull();
  expect(host.shadowRoot?.textContent).not.toContain("Translation publisher");
});

test("renders an untrusted version source as inert text", async () => {
  const host = await renderCard({
    ...DATA,
    attributions: [
      {
        side: "primary",
        versionTitle: "Primary",
        versionSource: "javascript:still plain text",
        versionSourceUrl: null,
      },
    ],
  });
  const attribution =
    host.shadowRoot?.querySelector<HTMLElement>(".attribution");

  expect(attribution?.textContent).toContain("javascript:still plain text");
  expect(attribution?.querySelector("a")).toBeNull();
});

test("links the edition title instead of displaying a source URL", async () => {
  const host = await renderCard({
    ...DATA,
    attributions: [
      {
        side: "translation",
        versionTitle: "Linked translation",
        versionSource: "https://example.test/translation",
        versionSourceUrl: "https://example.test/translation",
      },
    ],
  });
  const attribution =
    host.shadowRoot?.querySelector<HTMLElement>(".attribution");
  const link = attribution?.querySelector<HTMLAnchorElement>(
    ".version-title-link",
  );

  expect(link?.textContent).toBe("Linked translation");
  expect(link?.href).toBe("https://example.test/translation");
  expect(attribution?.textContent).not.toContain(
    "https://example.test/translation",
  );
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
  expect(
    [
      ...(host.shadowRoot?.querySelectorAll<HTMLElement>(".attribution") ?? []),
    ].map((attribution) => attribution.dataset.side),
  ).toEqual(["translation"]);
});

test("contains a long unbroken attribution source", async () => {
  const host = await renderCard({
    ...DATA,
    attributions: [
      {
        side: "primary",
        versionTitle: "Primary",
        versionSource: `https://example.test/${"%D7%A9".repeat(100)}`,
        versionSourceUrl: `https://example.test/${"%D7%A9".repeat(100)}`,
      },
    ],
  });
  host.style.width = "320px";
  await host.updateComplete;

  const attribution =
    host.shadowRoot?.querySelector<HTMLElement>(".attribution");
  expect(attribution).not.toBeNull();
  expect(attribution!.scrollWidth).toBeLessThanOrEqual(
    attribution!.clientWidth,
  );
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
    attributions: DATA.attributions,
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
