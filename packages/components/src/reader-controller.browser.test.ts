import {
  zCoreLinkResponse,
  zCoreV3TextsResponse,
  type CoreLinkObject,
  type CoreLinkResponse,
  type CoreV3TextsResponse,
} from "@sefaria/client";
import { html } from "lit";
import { render } from "vitest-browser-lit";
import { expect, test, vi } from "vitest";

import linksFixture from "../../client/test/fixtures/links-connections-preview-2026-09-06.json";
import sectionFixture from "../../client/test/fixtures/v3-connections-genesis-section-2026-09-06.json";
import { bindReaderController } from "./reader-controller-binding.js";
import {
  createReaderController,
  type ReaderController,
  type ReaderControllerDataSource,
} from "./reader-controller.js";
import "./reader-element.js";
import type { SefariaReader } from "./reader-element.js";
import {
  createReaderConnectionsContent,
  createReaderSourceContent,
} from "./reader-session.js";

const section = zCoreV3TextsResponse.parse(
  sectionFixture,
) as CoreV3TextsResponse;
const parsedLinks = zCoreLinkResponse.parse(linksFixture) as CoreLinkResponse;
if (
  !Array.isArray(parsedLinks) ||
  !parsedLinks[0] ||
  "isSheet" in parsedLinks[0]
) {
  throw new TypeError("Expected one text-link fixture.");
}
const baseLink: CoreLinkObject = parsedLinks[0];

test("binds one persistent reader, forwards navigation, resets its pane, and cleans up", async () => {
  render(html`<sefaria-reader></sefaria-reader>`);
  const element = document.querySelector<SefariaReader>("sefaria-reader");
  if (!element) throw new Error("Reader was not rendered.");
  const dataSource = fixtureDataSource();
  const controller = createReaderController(
    {
      source: sourceContent("Micah 6"),
      selectedPosition: [7],
      connections: connectionsContent("Micah 6:8"),
    },
    dataSource,
  );
  const unbind = bindReaderController(element, controller);
  await element.updateComplete;

  expect(element.viewModel?.selectedTarget?.ref).toBe("Micah 6:8");
  expect(document.querySelector("sefaria-reader")).toBe(element);

  element.dispatchEvent(
    new CustomEvent("sefaria-reader-pane-change", {
      detail: { originEntryId: "entry-1", pane: "connections" },
    }),
  );
  expect(element.activePane).toBe("connections");

  element.dispatchEvent(
    new CustomEvent("sefaria-reader-connection-select", {
      detail: {
        originEntryId: "entry-1",
        targetRef: "Rashi on Micah 6",
      },
    }),
  );
  await vi.waitFor(() =>
    expect(element.viewModel?.currentEntryId).toBe("entry-2"),
  );
  expect(element.activePane).toBe("source");
  expect(document.querySelector("sefaria-reader")).toBe(element);

  element.dispatchEvent(
    new CustomEvent("sefaria-reader-back", {
      detail: { originEntryId: "entry-2" },
    }),
  );
  expect(element.viewModel?.currentEntryId).toBe("entry-1");

  const sourceCalls = dataSource.loadSource.mock.calls.length;
  unbind();
  element.dispatchEvent(
    new CustomEvent("sefaria-reader-connection-select", {
      detail: {
        originEntryId: "entry-1",
        targetRef: "Ibn Ezra on Micah 6",
      },
    }),
  );
  await Promise.resolve();
  expect(dataSource.loadSource).toHaveBeenCalledTimes(sourceCalls);
  expect(element.viewModel?.currentEntryId).toBe("entry-1");
});

test("leaves chat export entirely with the host", async () => {
  render(html`<sefaria-reader></sefaria-reader>`);
  const element = document.querySelector<SefariaReader>("sefaria-reader");
  if (!element) throw new Error("Reader was not rendered.");
  const dataSource = fixtureDataSource();
  const controller = createReaderController(
    {
      source: sourceContent("Micah 6"),
      selectedPosition: [7],
    },
    dataSource,
  );
  const chatExport = vi.fn();
  element.addEventListener("sefaria-reader-chat-export", chatExport);
  const unbind = bindReaderController(element, controller);

  element.dispatchEvent(
    new CustomEvent("sefaria-reader-chat-export", {
      detail: {
        originEntryId: "entry-1",
        targetRef: "Micah 6:8",
      },
    }),
  );

  expect(chatExport).toHaveBeenCalledOnce();
  expect(dataSource.loadSource).not.toHaveBeenCalled();
  expect(dataSource.loadConnections).not.toHaveBeenCalled();
  unbind();
});

test("forwards every semantic reader event with its original detail", async () => {
  render(html`<sefaria-reader></sefaria-reader>`);
  const element = document.querySelector<SefariaReader>("sefaria-reader");
  if (!element) throw new Error("Reader was not rendered.");
  const seedController = createReaderController(
    { source: sourceContent("Micah 6"), selectedPosition: [7] },
    fixtureDataSource(),
  );
  const controller: ReaderController = {
    snapshot: seedController.snapshot,
    subscribe: (listener) => {
      listener(seedController.snapshot);
      return vi.fn();
    },
    selectSource: vi.fn(async () => undefined),
    openConnection: vi.fn(async () => undefined),
    setConnectionsCategory: vi.fn(),
    setConnectionsPage: vi.fn(),
    requestConnectionPreviews: vi.fn(async () => undefined),
    setPresentation: vi.fn(),
    back: vi.fn(),
    activateHistory: vi.fn(),
    dispose: vi.fn(),
  };
  const unbind = bindReaderController(element, controller);
  const events = [
    [
      "sefaria-reader-source-select",
      { originEntryId: "entry-1", position: [7], ref: "Micah 6:8" },
    ],
    [
      "sefaria-reader-connections-category-change",
      { originEntryId: "entry-1", category: "Commentary" },
    ],
    [
      "sefaria-reader-connections-page-change",
      { originEntryId: "entry-1", page: 1 },
    ],
    [
      "sefaria-reader-connections-preview-request",
      { originEntryId: "entry-1" },
    ],
    [
      "sefaria-reader-history-activate",
      { originEntryId: "entry-1", entryId: "entry-1" },
    ],
    ["sefaria-reader-back", { originEntryId: "entry-1" }],
  ] as const;
  for (const [name, detail] of events) {
    element.dispatchEvent(new CustomEvent(name, { detail }));
  }
  await Promise.resolve();

  expect(controller.selectSource).toHaveBeenCalledWith(events[0][1]);
  expect(controller.setConnectionsCategory).toHaveBeenCalledWith(events[1][1]);
  expect(controller.setConnectionsPage).toHaveBeenCalledWith(events[2][1]);
  expect(controller.requestConnectionPreviews).toHaveBeenCalledWith(
    events[3][1],
  );
  expect(controller.activateHistory).toHaveBeenCalledWith(events[4][1]);
  expect(controller.back).toHaveBeenCalledWith(events[5][1]);
  unbind();
});

function sectionSourcePayload(sectionRef: string): CoreV3TextsResponse {
  const payload = structuredClone(section);
  payload.ref = sectionRef;
  payload.heRef = sectionRef;
  payload.sectionRef = sectionRef;
  payload.heSectionRef = sectionRef;
  payload.firstAvailableSectionRef = `${sectionRef}:1`;
  payload.title = sectionRef;
  payload.book = sectionRef;
  payload.indexTitle = sectionRef;
  payload.heIndexTitle = sectionRef;
  return payload;
}

function sourceContent(sectionRef: string) {
  return createReaderSourceContent(sectionSourcePayload(sectionRef), {
    tref: sectionRef,
  });
}

function links(tref: string): CoreLinkResponse {
  return [
    {
      ...structuredClone(baseLink),
      _id: `link-${tref}`,
      anchorRef: tref,
      sourceRef: `Commentary on ${tref}`,
      ref: `Commentary on ${tref}`,
      category: "Commentary",
    },
  ];
}

function connectionsContent(tref: string) {
  return createReaderConnectionsContent(
    links(tref),
    { tref, withText: true },
    {},
  );
}

function fixtureDataSource(): {
  readonly loadSource: ReturnType<typeof vi.fn>;
  readonly loadConnections: ReturnType<typeof vi.fn>;
} & ReaderControllerDataSource {
  return {
    loadSource: vi.fn(async (request) => sourceContent(request.tref)),
    loadConnections: vi.fn(async (request, projection) =>
      createReaderConnectionsContent(links(request.tref), request, projection),
    ),
  };
}
