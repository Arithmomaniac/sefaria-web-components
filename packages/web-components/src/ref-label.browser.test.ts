import { html } from "lit";
import { render } from "vitest-browser-lit";
import { afterEach, expect, test, vi } from "vitest";

import {
  SefariaRefLabel,
  type RefLabelDataViewModel,
  type RefLabelViewModel,
} from "./index.js";

const DATA_VIEW_MODEL: RefLabelDataViewModel = {
  state: "data",
  normalized: "Rashi on Genesis 1:1:1",
  hebrew: 'רש"י על בראשית א׳:א׳:א׳',
  urlRef: "Rashi_on_Genesis.1.1.1",
  url: "https://www.sefaria.org/Rashi_on_Genesis.1.1.1",
  indexTitle: "Rashi on Genesis",
  nodeType: "JaggedArrayNode",
};

afterEach(() => {
  vi.unstubAllGlobals();
});

test.each([
  {
    viewModel: { state: "loading", message: "Loading reference." } as const,
    role: "status",
    text: "Loading reference.",
  },
  {
    viewModel: {
      state: "empty",
      tref: "not a ref",
      message: '"not a ref" is not a recognized Sefaria reference.',
    } as const,
    role: "status",
    text: '"not a ref" is not a recognized Sefaria reference.',
  },
  {
    viewModel: {
      state: "error",
      errorKind: "http",
      status: 404,
      message: "Reference failed.",
    } as const,
    role: "alert",
    text: "Reference failed.",
  },
])(
  "announces the $viewModel.state state",
  async ({ viewModel, role, text }) => {
    const screen = render(
      html`<sefaria-ref-label
        .viewModel=${viewModel satisfies RefLabelViewModel}
      ></sefaria-ref-label>`,
    );

    await expect.element(screen.getByRole(role)).toHaveTextContent(text);
  },
);

test.each([
  ["english", "Rashi on Genesis 1:1:1", "en", "ltr"],
  ["hebrew", 'רש"י על בראשית א׳:א׳:א׳', "he", "rtl"],
])(
  "renders the %s label with explicit language and direction",
  async (labelLanguage, text, lang, dir) => {
    const screen = render(
      html`<sefaria-ref-label
        label-language=${labelLanguage}
        .viewModel=${DATA_VIEW_MODEL}
      ></sefaria-ref-label>`,
    );

    await expect.element(screen.getByText(text)).toBeVisible();
    const element =
      document.querySelector<SefariaRefLabel>("sefaria-ref-label");
    const label = element?.shadowRoot?.querySelector(`[lang="${lang}"]`);
    expect(label?.getAttribute("dir")).toBe(dir);
  },
);

test("renders both labels in their own language boundaries", async () => {
  render(
    html`<sefaria-ref-label
      label-language="both"
      .viewModel=${DATA_VIEW_MODEL}
    ></sefaria-ref-label>`,
  );

  const element = document.querySelector<SefariaRefLabel>("sefaria-ref-label");
  await element?.updateComplete;
  expect(element?.shadowRoot?.querySelector('[lang="en"]')?.textContent).toBe(
    DATA_VIEW_MODEL.normalized,
  );
  expect(element?.shadowRoot?.querySelector('[lang="he"]')?.textContent).toBe(
    DATA_VIEW_MODEL.hebrew,
  );
});

test("renders a keyboard-operable canonical link with the visible accessible name", async () => {
  const screen = render(
    html`<sefaria-ref-label
      linked
      .viewModel=${DATA_VIEW_MODEL}
    ></sefaria-ref-label>`,
  );

  const link = screen.getByRole("link", {
    name: DATA_VIEW_MODEL.normalized,
  });
  await expect.element(link).toHaveAttribute("href", DATA_VIEW_MODEL.url);
  link.element().focus();
  expect(document.activeElement?.shadowRoot?.activeElement).toBe(
    link.element(),
  );
});

test("inherits link tokens", async () => {
  render(html`
    <div style="--sefaria-link: rgb(1, 2, 3)">
      <sefaria-ref-label linked .viewModel=${DATA_VIEW_MODEL}>
      </sefaria-ref-label>
    </div>
  `);

  const element = document.querySelector<SefariaRefLabel>("sefaria-ref-label");
  await element?.updateComplete;
  const link = element?.shadowRoot?.querySelector("a");
  expect(getComputedStyle(link!).color).toBe("rgb(1, 2, 3)");
});

test("contains a long unbroken label in a 320 pixel host", async () => {
  const viewModel: RefLabelDataViewModel = {
    ...DATA_VIEW_MODEL,
    normalized: "Commentary".repeat(100),
  };
  render(html`
    <div style="width: 320px">
      <sefaria-ref-label
        style="width: 100%"
        .viewModel=${viewModel}
      ></sefaria-ref-label>
    </div>
  `);

  const element = document.querySelector<SefariaRefLabel>("sefaria-ref-label");
  await element?.updateComplete;
  const label = element?.shadowRoot?.querySelector<HTMLElement>(".label");
  expect(label).not.toBeNull();
  expect(label!.scrollWidth).toBeLessThanOrEqual(label!.clientWidth);
});

test("never calls fetch while rendering", async () => {
  const fetchMock = vi.fn<typeof fetch>(async () => {
    throw new Error("Elements must not request.");
  });
  vi.stubGlobal("fetch", fetchMock);
  const element = new SefariaRefLabel();
  element.viewModel = DATA_VIEW_MODEL;
  document.body.append(element);

  await element.updateComplete;

  expect(fetchMock).not.toHaveBeenCalled();
});
