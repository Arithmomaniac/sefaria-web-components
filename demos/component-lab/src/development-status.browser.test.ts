import type {
  SefariaBilingualSegment,
  SefariaRefLabel,
  SefariaTextSegment,
} from "@sefaria/components";
import { html, type LitElement } from "lit";
import { render } from "vitest-browser-lit";
import { expect, test } from "vitest";

import "./development-status.js";
import {
  bilingualSegmentDataScenario,
  bilingualSegmentEmptyScenario,
  bilingualSegmentErrorScenario,
  bilingualSegmentLoadingScenario,
  bilingualSegmentPartialScenario,
  bilingualSegmentScenarios,
} from "./bilingual-segment.scenarios.js";
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

async function renderLab(): Promise<LitElement> {
  render(html`<sefaria-development-status></sefaria-development-status>`);

  const lab = document.querySelector<LitElement>("sefaria-development-status");
  if (!lab) {
    throw new Error("The component lab was not rendered.");
  }
  await lab.updateComplete;
  return lab;
}

test("shows the four current text-segment states", async () => {
  expect(textSegmentScenarios).toEqual([
    textSegmentDataScenario,
    textSegmentLoadingScenario,
    textSegmentEmptyScenario,
    textSegmentErrorScenario,
  ]);

  const lab = await renderLab();
  const segments = Array.from(
    lab.shadowRoot?.querySelectorAll<SefariaTextSegment>(
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

  const lab = await renderLab();
  const labels = Array.from(
    lab.shadowRoot?.querySelectorAll<SefariaRefLabel>("sefaria-ref-label") ??
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

test("shows the five current bilingual-segment states", async () => {
  expect(bilingualSegmentScenarios).toEqual([
    bilingualSegmentDataScenario,
    bilingualSegmentLoadingScenario,
    bilingualSegmentPartialScenario,
    bilingualSegmentEmptyScenario,
    bilingualSegmentErrorScenario,
  ]);

  const lab = await renderLab();
  const segments = Array.from(
    lab.shadowRoot?.querySelectorAll<SefariaBilingualSegment>(
      "sefaria-bilingual-segment",
    ) ?? [],
  );

  expect(segments.map((segment) => segment.viewModel.state)).toEqual(
    bilingualSegmentScenarios.map((scenario) => scenario.viewModel.state),
  );
  expect(bilingualSegmentScenarios.map((scenario) => scenario.id)).toEqual([
    "data",
    "loading",
    "partial",
    "empty",
    "error",
  ]);
});
