import { html } from "lit";
import { render } from "vitest-browser-lit";
import { afterEach, expect, test, vi } from "vitest";

import {
  SefariaTextSegment,
  type TextSegmentDataViewModel,
  type TextSegmentViewModel,
} from "./index.js";

const DATA_VIEW_MODEL: TextSegmentDataViewModel = {
  state: "data",
  ref: "Genesis 1:1",
  heRef: "בראשית א׳:א׳",
  language: "he",
  actualLanguage: "he",
  direction: "ltr",
  body: [
    {
      kind: "html",
      html: "<b>בְּרֵאשִׁית</b> — mixed punctuation, English.",
    },
    { kind: "footnote-marker", noteIndex: 0, markerText: "*" },
  ],
  notes: [
    {
      index: 0,
      markerText: "*",
      content: "<b>Static</b> footnote body.",
    },
  ],
  attribution: {
    versionTitle: "Test edition",
    versionSource: "javascript:still plain text",
  },
};

afterEach(() => {
  vi.unstubAllGlobals();
});

test.each([
  {
    viewModel: { state: "loading", message: "Loading segment." } as const,
    role: "status",
    text: "Loading segment.",
  },
  {
    viewModel: {
      state: "empty",
      ref: "Genesis 1:1",
      heRef: "בראשית א׳:א׳",
      message: "No English version is available.",
      warnings: ["No English version is available."],
    } as const,
    role: "status",
    text: "No English version is available.",
  },
  {
    viewModel: {
      state: "error",
      errorKind: "projection",
      message: "Text segment requires one matching version; found 2.",
    } as const,
    role: "alert",
    text: "Text segment requires one matching version; found 2.",
  },
])(
  "announces the $viewModel.state state",
  async ({ viewModel, role, text }) => {
    const screen = render(
      html`<sefaria-text-segment
        .viewModel=${viewModel satisfies TextSegmentViewModel}
      ></sefaria-text-segment>`,
    );

    await expect.element(screen.getByRole(role)).toHaveTextContent(text);
  },
);

test("renders payload language and direction with static footnotes", async () => {
  const screen = render(
    html`<sefaria-text-segment
      .viewModel=${DATA_VIEW_MODEL}
    ></sefaria-text-segment>`,
  );

  await expect
    .element(screen.getByText("בְּרֵאשִׁית", { exact: false }))
    .toBeVisible();
  await expect
    .element(screen.getByText("Static", { exact: false }))
    .toBeVisible();
  const element = document.querySelector<SefariaTextSegment>(
    "sefaria-text-segment",
  );
  const article = element?.shadowRoot?.querySelector("article");
  const sourceLink = element?.shadowRoot?.querySelector("a");
  expect(article?.lang).toBe("he");
  expect(article?.dir).toBe("ltr");
  expect(sourceLink).toBeNull();
  expect(element?.shadowRoot?.textContent).toContain(
    "javascript:still plain text",
  );
});

test("does not invent a body for a missing static footnote", async () => {
  const viewModel: TextSegmentDataViewModel = {
    ...DATA_VIEW_MODEL,
    notes: [{ index: 0, markerText: "1", content: null }],
  };
  render(
    html`<sefaria-text-segment .viewModel=${viewModel}></sefaria-text-segment>`,
  );

  const element = document.querySelector<SefariaTextSegment>(
    "sefaria-text-segment",
  );
  await element?.updateComplete;
  expect(element?.shadowRoot?.querySelector(".footnotes")).toBeNull();
});

test("labels each rendered footnote body with its source marker", async () => {
  const viewModel: TextSegmentDataViewModel = {
    ...DATA_VIEW_MODEL,
    body: [
      { kind: "footnote-marker", noteIndex: 0, markerText: "*" },
      { kind: "footnote-marker", noteIndex: 1, markerText: "†" },
    ],
    notes: [
      { index: 0, markerText: "*", content: null },
      { index: 1, markerText: "†", content: "Second note." },
    ],
  };
  render(
    html`<sefaria-text-segment .viewModel=${viewModel}></sefaria-text-segment>`,
  );

  const element = document.querySelector<SefariaTextSegment>(
    "sefaria-text-segment",
  );
  await element?.updateComplete;
  const footnotes =
    element?.shadowRoot?.querySelector<HTMLOListElement>(".footnotes");
  const renderedNote = footnotes?.querySelector("li");
  expect(footnotes?.children).toHaveLength(1);
  expect(renderedNote?.querySelector(".footnote-label")?.textContent).toBe("†");
  expect(renderedNote?.textContent).toContain("Second note.");
});

test("contains a long unbroken word in a 320 pixel host", async () => {
  const longWord = "word".repeat(200);
  const viewModel: TextSegmentDataViewModel = {
    ...DATA_VIEW_MODEL,
    body: [{ kind: "html", html: longWord }],
    notes: [],
  };
  render(html`
    <div style="width: 320px">
      <sefaria-text-segment
        style="width: 100%"
        .viewModel=${viewModel}
      ></sefaria-text-segment>
    </div>
  `);

  const element = document.querySelector<SefariaTextSegment>(
    "sefaria-text-segment",
  );
  await element?.updateComplete;
  const body = element?.shadowRoot?.querySelector<HTMLElement>(".body");
  expect(body).not.toBeNull();
  expect(body!.scrollWidth).toBeLessThanOrEqual(body!.clientWidth);
});

test("contains a long unbroken attribution source", async () => {
  const viewModel: TextSegmentDataViewModel = {
    ...DATA_VIEW_MODEL,
    attribution: {
      ...DATA_VIEW_MODEL.attribution,
      versionSource: `https://example.test/${"%D7%A9".repeat(100)}`,
    },
  };
  render(html`
    <div style="width: 320px">
      <sefaria-text-segment
        style="width: 100%"
        .viewModel=${viewModel}
      ></sefaria-text-segment>
    </div>
  `);

  const element = document.querySelector<SefariaTextSegment>(
    "sefaria-text-segment",
  );
  await element?.updateComplete;
  const attribution =
    element?.shadowRoot?.querySelector<HTMLElement>(".attribution");
  expect(attribution).not.toBeNull();
  expect(attribution!.scrollWidth).toBeLessThanOrEqual(
    attribution!.clientWidth,
  );
});

test("never calls fetch while rendering", async () => {
  const fetchMock = vi.fn<typeof fetch>(async () => {
    throw new Error("Elements must not request.");
  });
  vi.stubGlobal("fetch", fetchMock);
  const element = new SefariaTextSegment();
  element.viewModel = DATA_VIEW_MODEL;
  document.body.append(element);

  await element.updateComplete;

  expect(fetchMock).not.toHaveBeenCalled();
});
