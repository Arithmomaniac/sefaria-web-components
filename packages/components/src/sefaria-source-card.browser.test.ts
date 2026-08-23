import type { SourceCardData } from "@sefaria/model";
import { html } from "lit";
import { render } from "vitest-browser-lit";
import { expect, test } from "vitest";
import "./sefaria-source-card.js";

const data: SourceCardData = {
  ref: "Genesis 1:1",
  segments: [
    {
      ref: "Genesis 1:1",
      source: {
        content: "בראשית ברא אלהים",
        language: "he",
        direction: "rtl",
        versionTitle: "Masoretic Text",
      },
      translations: [
        {
          content: "When God began to create heaven and earth",
          language: "en",
          direction: "ltr",
          versionTitle: "The Contemporary Torah",
        },
      ],
    },
  ],
};

test("renders source text, translation, and attribution", async () => {
  const screen = render(
    html`<sefaria-source-card .data=${data}></sefaria-source-card>`,
  );

  await expect.element(screen.getByText(data.ref)).toBeVisible();
  await expect
    .element(screen.getByText(data.segments[0]!.source!.content))
    .toBeVisible();
  await expect
    .element(screen.getByText(data.segments[0]!.translations[0]!.content))
    .toBeVisible();
  await expect
    .element(screen.getByText(/Masoretic Text.*The Contemporary Torah/))
    .toBeVisible();

  const card = document.querySelector("sefaria-source-card");
  const renderedContent = card?.shadowRoot?.querySelectorAll(".content");
  expect(renderedContent?.[0]?.textContent).toBe(
    data.segments[0]!.source!.content,
  );
  expect(renderedContent?.[1]?.textContent).toBe(
    data.segments[0]!.translations[0]!.content,
  );
});
