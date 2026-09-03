import type { SefariaRefLabel, SefariaTextSegment } from "@sefaria/components";
import { html, type LitElement } from "lit";
import { render } from "vitest-browser-lit";
import { expect, test } from "vitest";

import "./development-status.js";
import {
  refLabelDataScenario,
  refLabelEmptyScenario,
  refLabelErrorScenario,
  refLabelLoadingScenario,
  refLabelScenarios,
} from "./ref-label.scenarios.js";
import {
  textSegmentDataScenario,
  textSegmentEmptyScenario,
  textSegmentErrorScenario,
  textSegmentLoadingScenario,
  textSegmentScenarios,
} from "./text-segment.scenarios.js";

test("shows the four current text-segment states", async () => {
  expect(textSegmentScenarios).toEqual([
    textSegmentDataScenario,
    textSegmentLoadingScenario,
    textSegmentEmptyScenario,
    textSegmentErrorScenario,
  ]);

  render(html`<sefaria-development-status></sefaria-development-status>`);

  const lab = document.querySelector<LitElement>("sefaria-development-status");
  await lab?.updateComplete;
  const segments = Array.from(
    lab?.shadowRoot?.querySelectorAll<SefariaTextSegment>(
      "sefaria-text-segment",
    ) ?? [],
  );

  expect(segments.map((segment) => segment.viewModel.state)).toEqual(
    textSegmentScenarios.map((scenario) => scenario.viewModel.state),
  );
  expect(textSegmentScenarios.map((scenario) => scenario.id)).toEqual([
    "data",
    "loading",
    "empty",
    "error",
  ]);
});

test("shows the four current reference-label states", async () => {
  expect(refLabelScenarios).toEqual([
    refLabelDataScenario,
    refLabelLoadingScenario,
    refLabelEmptyScenario,
    refLabelErrorScenario,
  ]);

  render(html`<sefaria-development-status></sefaria-development-status>`);

  const lab = document.querySelector<LitElement>("sefaria-development-status");
  await lab?.updateComplete;
  const labels = Array.from(
    lab?.shadowRoot?.querySelectorAll<SefariaRefLabel>("sefaria-ref-label") ??
      [],
  );

  expect(labels.map((label) => label.viewModel.state)).toEqual(
    refLabelScenarios.map((scenario) => scenario.viewModel.state),
  );
  expect(refLabelScenarios.map((scenario) => scenario.id)).toEqual([
    "data",
    "loading",
    "empty",
    "error",
  ]);
});
