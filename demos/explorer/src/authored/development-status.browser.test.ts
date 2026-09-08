import type {
  SefariaBilingualSegment,
  SefariaConnectionsPanel,
  SefariaRefLabel,
  SefariaReader,
  SefariaSourceCard,
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
  connectionsEmptyScenario,
  connectionsErrorScenario,
  connectionsLoadingScenario,
  connectionsMetadataScenario,
  connectionsDetailsScenario,
  connectionsPanelScenarios,
  connectionsSummaryScenario,
} from "./connections-panel.scenarios.js";
import {
  refLabelDataScenario,
  refLabelEmptyScenario,
  refLabelErrorScenario,
  refLabelLoadingScenario,
  refLabelScenarios,
} from "./ref-label.scenarios.js";
import {
  readerConnectionsLoadingScenario,
  readerConnectionsOnlyScenario,
  readerConnectionsUnavailableScenario,
  readerPairedScenario,
  readerScenarios,
  readerSourceOnlyScenario,
  readerTruncatedHistoryScenario,
} from "./reader.scenarios.js";
import {
  sourceCardEmptyScenario,
  sourceCardErrorScenario,
  sourceCardHiddenAddressesScenario,
  sourceCardLoadingScenario,
  sourceCardManyItemsScenario,
  sourceCardOneItemScenario,
  sourceCardOneSidedScenario,
  sourceCardScenarios,
} from "./source-card.scenarios.js";
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

test("shows the seven current source-card scenarios", async () => {
  expect(sourceCardScenarios).toEqual([
    sourceCardOneItemScenario,
    sourceCardManyItemsScenario,
    sourceCardHiddenAddressesScenario,
    sourceCardOneSidedScenario,
    sourceCardLoadingScenario,
    sourceCardEmptyScenario,
    sourceCardErrorScenario,
  ]);

  const lab = await renderLab();
  const cards = Array.from(
    lab.shadowRoot?.querySelectorAll<SefariaSourceCard>(
      "sefaria-source-card",
    ) ?? [],
  );

  expect(cards.map((card) => card.viewModel.state)).toEqual(
    sourceCardScenarios.map((scenario) => scenario.viewModel.state),
  );
  expect(sourceCardScenarios.map((scenario) => scenario.id)).toEqual([
    "one-item",
    "many-items",
    "hidden-addresses",
    "one-sided",
    "loading",
    "empty",
    "error",
  ]);
});

test("shows the six current connections-panel scenarios", async () => {
  expect(connectionsPanelScenarios).toEqual([
    connectionsSummaryScenario,
    connectionsDetailsScenario,
    connectionsMetadataScenario,
    connectionsLoadingScenario,
    connectionsEmptyScenario,
    connectionsErrorScenario,
  ]);
  const lab = await renderLab();
  const panels = Array.from(
    lab.shadowRoot?.querySelectorAll<SefariaConnectionsPanel>(
      "sefaria-connections-panel",
    ) ?? [],
  );
  expect(panels.map((panel) => panel.viewModel?.state)).toEqual(
    connectionsPanelScenarios.map((scenario) => scenario.viewModel.state),
  );
  expect(connectionsPanelScenarios.map((scenario) => scenario.id)).toEqual([
    "summary",
    "details",
    "metadata-only",
    "loading",
    "empty",
    "error",
  ]);
});

test("shows the six controlled reader scenarios", async () => {
  expect(readerScenarios).toEqual([
    readerPairedScenario,
    readerSourceOnlyScenario,
    readerConnectionsOnlyScenario,
    readerConnectionsLoadingScenario,
    readerConnectionsUnavailableScenario,
    readerTruncatedHistoryScenario,
  ]);
  const lab = await renderLab();
  const readers = Array.from(
    lab.shadowRoot?.querySelectorAll<SefariaReader>("sefaria-reader") ?? [],
  );
  expect(readers.map((reader) => reader.viewModel?.currentEntryId)).toEqual(
    readerScenarios.map((scenario) => scenario.viewModel.currentEntryId),
  );
  expect(readerScenarios.map((scenario) => scenario.id)).toEqual([
    "paired",
    "source-only",
    "connections-only",
    "connections-loading",
    "connections-unavailable",
    "truncated-history",
  ]);
});
