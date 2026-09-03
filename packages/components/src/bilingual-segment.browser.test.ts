import { html } from "lit";
import { render } from "vitest-browser-lit";
import { afterEach, expect, test, vi } from "vitest";

import "./bilingual-segment-element.js";
import type {
  BilingualSegmentDataViewModel,
  BilingualSegmentViewModel,
  SefariaBilingualSegment,
  TextSegmentDataViewModel,
} from "./index.js";

const PRIMARY: TextSegmentDataViewModel = {
  state: "data",
  ref: "Genesis 1:1",
  heRef: "בראשית א׳:א׳",
  language: "he",
  actualLanguage: "he",
  direction: "rtl",
  body: [{ kind: "html", html: "בְּרֵאשִׁית בָּרָא אֱלֹהִים" }],
  notes: [],
  attribution: {
    versionTitle: "Miqra according to the Masorah",
    versionSource: null,
  },
};

const TRANSLATION: TextSegmentDataViewModel = {
  state: "data",
  ref: "Genesis 1:1",
  heRef: "בראשית א׳:א׳",
  language: "en",
  actualLanguage: "en",
  direction: "ltr",
  body: [{ kind: "html", html: "When God began to create heaven and earth." }],
  notes: [],
  attribution: { versionTitle: "The Contemporary Torah", versionSource: null },
};

const DATA: BilingualSegmentDataViewModel = {
  state: "data",
  ref: "Genesis 1:1",
  heRef: "בראשית א׳:א׳",
  primary: PRIMARY,
  translation: TRANSLATION,
};

afterEach(() => {
  vi.unstubAllGlobals();
  for (const wrapper of wrappers.splice(0)) {
    wrapper.remove();
  }
});

const wrappers: HTMLDivElement[] = [];

/** Mounts a bilingual element inside a width-controlled wrapper cleaned up after the test. */
function mountInWrapper(
  width: string,
  viewModel: BilingualSegmentViewModel,
): { wrapper: HTMLDivElement; host: SefariaBilingualSegment } {
  const wrapper = document.createElement("div");
  wrapper.style.width = width;
  document.body.append(wrapper);
  wrappers.push(wrapper);
  const host = document.createElement("sefaria-bilingual-segment");
  host.viewModel = viewModel;
  wrapper.append(host);
  return { wrapper, host };
}

function element(): SefariaBilingualSegment {
  const found = document.querySelector<SefariaBilingualSegment>(
    "sefaria-bilingual-segment",
  );
  if (!found) {
    throw new Error("The bilingual element was not rendered.");
  }
  return found;
}

async function renderData(
  properties: Partial<
    Pick<SefariaBilingualSegment, "contentLanguage" | "layout" | "sideOrder">
  > = {},
  viewModel: BilingualSegmentViewModel = DATA,
): Promise<SefariaBilingualSegment> {
  render(
    html`<sefaria-bilingual-segment
      .viewModel=${viewModel}
      .contentLanguage=${properties.contentLanguage ?? "both"}
      .layout=${properties.layout ?? "auto"}
      .sideOrder=${properties.sideOrder ?? "primary-first"}
    ></sefaria-bilingual-segment>`,
  );
  const found = element();
  await found.updateComplete;
  return found;
}

function sides(host: SefariaBilingualSegment): readonly HTMLElement[] {
  return [
    ...(host.shadowRoot?.querySelectorAll<HTMLElement>("[data-side]") ?? []),
  ];
}

test("makes no request for any state", async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);

  await renderData();

  expect(fetchMock).not.toHaveBeenCalled();
});

test("renders both sides through nested text-segment elements", async () => {
  const host = await renderData();
  const nested = host.shadowRoot?.querySelectorAll("sefaria-text-segment");

  expect(nested?.length).toBe(2);
  expect(sides(host).map((side) => side.dataset.side)).toEqual([
    "primary",
    "translation",
  ]);
});

test("passes each side's own direction and language to its child", async () => {
  const host = await renderData();
  const nested = [
    ...(host.shadowRoot?.querySelectorAll("sefaria-text-segment") ?? []),
  ];
  await Promise.all(nested.map((child) => child.updateComplete));

  const articles = nested.map((child) =>
    child.shadowRoot?.querySelector("article"),
  );
  expect(articles[0]?.dir).toBe("rtl");
  expect(articles[0]?.lang).toBe("he");
  expect(articles[1]?.dir).toBe("ltr");
  expect(articles[1]?.lang).toBe("en");
});

test.each([
  { sideOrder: "primary-first", primaryLeadsVisually: true },
  { sideOrder: "translation-first", primaryLeadsVisually: false },
] as const)(
  "places the $sideOrder side first without reordering the DOM",
  async ({ sideOrder, primaryLeadsVisually }) => {
    const host = await renderData({ sideOrder, layout: "side-by-side" });
    const rendered = sides(host);

    expect(rendered.map((side) => side.dataset.side)).toEqual([
      "primary",
      "translation",
    ]);
    const [primary, translation] = rendered.map((side) =>
      side.getBoundingClientRect(),
    );
    expect(primary!.left < translation!.left).toBe(primaryLeadsVisually);
  },
);

test.each([
  { contentLanguage: "primary", expected: ["primary"] },
  { contentLanguage: "translation", expected: ["translation"] },
  { contentLanguage: "both", expected: ["primary", "translation"] },
] as const)(
  "shows $expected for contentLanguage $contentLanguage",
  async ({ contentLanguage, expected }) => {
    const host = await renderData({ contentLanguage });

    expect(sides(host).map((side) => side.dataset.side)).toEqual(expected);
  },
);

test("switches layout in both directions as the container resizes", async () => {
  const { wrapper, host } = mountInWrapper("900px", DATA);
  await host.updateComplete;

  const blockStarts = () =>
    sides(host).map((side) => side.getBoundingClientRect().top);

  const [wideFirst, wideSecond] = blockStarts();
  expect(wideFirst).toBeCloseTo(wideSecond!, 0);

  wrapper.style.width = "320px";
  await new Promise((resolve) => requestAnimationFrame(resolve));
  const [narrowFirst, narrowSecond] = blockStarts();
  expect(narrowSecond!).toBeGreaterThan(narrowFirst!);

  wrapper.style.width = "900px";
  await new Promise((resolve) => requestAnimationFrame(resolve));
  const [restoredFirst, restoredSecond] = blockStarts();
  expect(restoredFirst).toBeCloseTo(restoredSecond!, 0);
});

test("keeps unequal sides aligned and contained side by side", async () => {
  const { wrapper, host } = mountInWrapper("900px", {
    ...DATA,
    primary: {
      ...PRIMARY,
      body: [{ kind: "html", html: "בְּרֵאשִׁית ".repeat(120) }],
    },
    translation: {
      ...TRANSLATION,
      body: [{ kind: "html", html: "Short." }],
    },
  });
  await host.updateComplete;

  const [primary, translation] = sides(host).map((side) =>
    side.getBoundingClientRect(),
  );
  expect(primary!.top).toBeCloseTo(translation!.top, 0);
  expect(primary!.right).toBeLessThanOrEqual(
    wrapper.getBoundingClientRect().right + 1,
  );
  expect(host.getBoundingClientRect().height).toBeGreaterThan(
    primary!.height - 1,
  );
});

test("contains a long unbreakable word within its side", async () => {
  const { host } = mountInWrapper("400px", {
    ...DATA,
    translation: {
      ...TRANSLATION,
      body: [{ kind: "html", html: "A".repeat(400) }],
    },
  });
  await host.updateComplete;

  expect(host.scrollWidth).toBeLessThanOrEqual(host.clientWidth + 1);
});

test("announces the partial state and still renders the present side", async () => {
  const host = await renderData(
    {},
    {
      state: "partial",
      ref: "Genesis 1:1",
      heRef: "בראשית א׳:א׳",
      present: { side: "primary", view: PRIMARY },
      absent: { side: "translation", message: "No translation is available." },
    },
  );

  expect(sides(host).map((side) => side.dataset.side)).toEqual(["primary"]);
  expect(host.shadowRoot?.textContent).toContain(
    "No translation is available.",
  );
  expect(host.shadowRoot?.querySelector('[role="status"]')).not.toBeNull();
});

test("announces both absent sides in the empty state", async () => {
  const host = await renderData(
    {},
    {
      state: "empty",
      ref: "Genesis 1:1",
      heRef: "בראשית א׳:א׳",
      absent: [
        { side: "primary", message: "No primary text." },
        { side: "translation", message: "No translation." },
      ],
    },
  );

  expect(host.shadowRoot?.querySelector("sefaria-text-segment")).toBeNull();
  expect(host.shadowRoot?.textContent).toContain("No primary text.");
  expect(host.shadowRoot?.textContent).toContain("No translation.");
});

test.each([
  {
    viewModel: { state: "loading", message: "Loading Genesis 1:1." } as const,
    role: "status",
    text: "Loading Genesis 1:1.",
  },
  {
    viewModel: {
      state: "error",
      errorKind: "projection",
      message: "The translation side could not be projected.",
    } as const,
    role: "alert",
    text: "The translation side could not be projected.",
  },
])(
  "announces the $viewModel.state state",
  async ({ viewModel, role, text }) => {
    const screen = render(
      html`<sefaria-bilingual-segment
        .viewModel=${viewModel satisfies BilingualSegmentViewModel}
      ></sefaria-bilingual-segment>`,
    );

    await expect.element(screen.getByRole(role)).toHaveTextContent(text);
  },
);

test("inherits host tokens through the nested shadow roots", async () => {
  const { wrapper, host } = mountInWrapper("900px", DATA);
  wrapper.style.setProperty("--sefaria-fg", "rgb(1, 2, 3)");
  await host.updateComplete;

  const nested = host.shadowRoot?.querySelector("sefaria-text-segment");
  await nested?.updateComplete;
  const article = nested?.shadowRoot?.querySelector("article");
  expect(getComputedStyle(article!).color).toBe("rgb(1, 2, 3)");
});
