import type {
  SefariaBilingualSegment,
  SefariaConnectionsPanel,
  SefariaRefLabel,
  SefariaReader,
  SefariaSourceCard,
  SefariaTextSegment,
} from "@sefaria/web-components";
import { html, type LitElement } from "lit";
import { render } from "vitest-browser-lit";
import { beforeEach, expect, test, vi } from "vitest";

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

beforeEach(() => {
  history.replaceState(null, "", location.pathname);
  delete document.documentElement.dataset.theme;
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

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

test("opens one authored state from a stable deep link", async () => {
  history.replaceState(
    null,
    "",
    `${location.pathname}?component=source-card&scenario=one-sided&diagnostics=1`,
  );

  const lab = await renderLab();
  expect(
    lab.shadowRoot?.querySelectorAll("[data-component][data-scenario]"),
  ).toHaveLength(1);
  expect(
    lab.shadowRoot?.querySelector(
      '[data-component="source-card"][data-scenario="one-sided"]',
    ),
  ).not.toBeNull();
  expect(
    lab.shadowRoot
      ?.querySelector("[data-authored-selection]")
      ?.textContent?.replaceAll(/\s+/gu, " ")
      .trim(),
  ).toBe("Source card / one-sided");
  expect(
    lab.shadowRoot?.querySelector<HTMLSelectElement>("#component-select")
      ?.value,
  ).toBe("source-card");
  expect(
    lab.shadowRoot?.querySelector<HTMLSelectElement>("#scenario-select")?.value,
  ).toBe("one-sided");
  expect(lab.shadowRoot?.querySelector("details")).not.toBeNull();
  expect(
    lab.shadowRoot?.querySelector<HTMLAnchorElement>(".scenario-link")?.href,
  ).toContain("component=source-card");
});

test("links diagnostics to repository source instead of a Vite fallback", async () => {
  history.replaceState(
    null,
    "",
    `${location.pathname}?component=reader&diagnostics=1`,
  );
  const lab = await renderLab();
  const sourceLink =
    lab.shadowRoot?.querySelector<HTMLAnchorElement>(
      "a[data-repository-source]",
    ) ?? undefined;

  expect(sourceLink?.textContent?.trim()).toBe(
    "src/authored/reader.scenarios.ts",
  );
  expect(sourceLink?.href).toBe(
    "https://github.com/Arithmomaniac/sefaria-web-components/blob/feature/avilevin/frontend-toolkit-alpha/examples/explorer/src/authored/reader.scenarios.ts",
  );
  expect(sourceLink?.origin).not.toBe(location.origin);
  expect(readerScenarios.map((scenario) => scenario.id)).toContain("paired");
});

test("changes scenario, theme, width and diagnostics without requesting", async () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  const lab = await renderLab();
  const shadow = lab.shadowRoot;
  if (!shadow) throw new Error("The component lab shadow root is missing.");

  changeSelect(shadow, "#component-select", "source-card");
  await lab.updateComplete;
  changeSelect(shadow, "#scenario-select", "many-items");
  changeSelect(shadow, "#theme-select", "dark");
  changeRange(shadow, "#width-control", "480");
  changeSelect(shadow, "#diagnostics-select", "1");
  await lab.updateComplete;

  expect(
    shadow.querySelectorAll("[data-component][data-scenario]"),
  ).toHaveLength(1);
  expect(document.documentElement.dataset.theme).toBe("dark");
  expect(lab.style.getPropertyValue("--authored-preview-width")).toBe("480px");
  expect(location.search).toContain("scenario=many-items");
  expect(location.search).toContain("width=480");
  expect(shadow.querySelector("details")).not.toBeNull();
  expect(fetch).not.toHaveBeenCalled();
});

test("shows event diagnostics while retaining authored request ownership", async () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  history.replaceState(
    null,
    "",
    `${location.pathname}?component=source-card&scenario=many-items&diagnostics=1`,
  );
  const lab = await renderLab();
  const card = lab.shadowRoot?.querySelector<SefariaSourceCard>(
    "sefaria-source-card",
  );
  if (!card) throw new Error("The deep-linked source card is missing.");

  card.dispatchEvent(
    new CustomEvent("sefaria-source-select", {
      detail: { position: [0], ref: "Micah 6:8" },
      bubbles: true,
      composed: true,
    }),
  );
  await lab.updateComplete;

  expect(
    lab.shadowRoot?.querySelector("#event-diagnostic")?.textContent,
  ).toContain("sefaria-source-select");
  expect(fetch).not.toHaveBeenCalled();
});

test("clears an invalid deep-link warning when a control rewrites the URL", async () => {
  history.replaceState(
    null,
    "",
    `${location.pathname}?component=unknown&scenario=missing`,
  );
  const lab = await renderLab();
  const shadow = lab.shadowRoot;
  if (!shadow) throw new Error("The component lab shadow root is missing.");
  expect(shadow.querySelector('[role="alert"]')).not.toBeNull();

  changeRange(shadow, "#width-control", "480");
  await lab.updateComplete;

  expect(shadow.querySelector('[role="alert"]')).toBeNull();
  expect(location.search).not.toContain("unknown");
  expect(location.search).not.toContain("missing");
});

function changeSelect(root: ParentNode, selector: string, value: string): void {
  const select = root.querySelector<HTMLSelectElement>(selector);
  if (!select) throw new Error(`${selector} is missing.`);
  select.value = value;
  select.dispatchEvent(new Event("change", { bubbles: true }));
}

function changeRange(root: ParentNode, selector: string, value: string): void {
  const input = root.querySelector<HTMLInputElement>(selector);
  if (!input) throw new Error(`${selector} is missing.`);
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}
