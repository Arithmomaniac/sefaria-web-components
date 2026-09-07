import {
  createSefariaClient,
  zCoreLinkResponse,
  zCoreV3TextsResponse,
  type CoreLinkObject,
  type CoreLinkResponse,
  type CoreV3TextsResponse,
} from "@sefaria/client";
import type {
  SefariaConnectionsPanel,
  SefariaReader,
  SefariaSourceCard,
} from "@sefaria/components";
import { beforeEach, expect, test, vi } from "vitest";

import linksFixture from "../../../packages/client/test/fixtures/links-targum-2026-08-30.json";
import contextualLinksFixture from "../../../packages/client/test/fixtures/links-connections-preview-2026-09-06.json";
import contextualSectionFixture from "../../../packages/client/test/fixtures/v3-connections-genesis-section-2026-09-06.json";
import contextualTargetFixture from "../../../packages/client/test/fixtures/v3-connections-genesis-target-2026-09-06.json";
import { v3SourceBackedPayload } from "../../../tests/compatibility/src/v3-source-backed.fixture.js";
import { startReaderWorkspace } from "./app.js";
import { startControlledReader } from "./controlled-app.js";
import "./style.css";

const parsedSource = zCoreV3TextsResponse.parse(
  v3SourceBackedPayload,
) as CoreV3TextsResponse;
const parsedLinks = zCoreLinkResponse.parse(linksFixture) as CoreLinkResponse;
const parsedContextualLinks = zCoreLinkResponse.parse(
  contextualLinksFixture,
) as CoreLinkResponse;
const parsedContextualSection = zCoreV3TextsResponse.parse(
  contextualSectionFixture,
) as CoreV3TextsResponse;
const parsedContextualTarget = zCoreV3TextsResponse.parse(
  contextualTargetFixture,
) as CoreV3TextsResponse;
if (
  !Array.isArray(parsedLinks) ||
  !parsedLinks[0] ||
  "isSheet" in parsedLinks[0]
) {
  throw new TypeError("Expected one text connection fixture.");
}
const baseLink: CoreLinkObject = parsedLinks[0];

beforeEach(() => {
  document.body.innerHTML = `<div id="reader-site">
    <header id="site-header">
      <form id="reader-form"><input name="tref" value="Micah 6:8"><button>Open</button></form>
      <nav id="pane-path" aria-label="Open reader panes"></nav>
      <p id="status"></p><p id="host-error" hidden></p>
    </header>
    <main id="workspace"></main>
  </div>`;
});

function sourcePayload(ref: string, sectionRef: string): CoreV3TextsResponse {
  const payload = structuredClone(parsedSource);
  const rashi = ref.startsWith("Rashi");
  Object.assign(payload, {
    ref,
    heRef: ref,
    sectionRef,
    heSectionRef: sectionRef,
    sections: rashi ? ["6", "8", "1"] : ["6", "8"],
    toSections: rashi ? ["6", "8", "1"] : ["6", "8"],
    indexTitle: rashi ? "Rashi on Micah" : "Micah",
    heIndexTitle: rashi ? "רש״י על מיכה" : "מיכה",
    title: sectionRef,
    book: rashi ? "Rashi on Micah" : "Micah",
    textDepth: rashi ? 3 : 2,
    sectionNames: rashi
      ? ["Chapter", "Verse", "Comment"]
      : ["Chapter", "Verse"],
    addressTypes: rashi
      ? ["Integer", "Integer", "Integer"]
      : ["Integer", "Integer"],
    index_offsets_by_depth: {},
    versions: payload.versions.map((version) => ({
      ...version,
      text: `Text for ${ref}`,
    })),
  });
  return payload;
}

function expandedSectionPayload(): CoreV3TextsResponse {
  const payload = sourcePayload("Micah 6", "Micah 6");
  Object.assign(payload, {
    sections: ["6"],
    toSections: ["6"],
    versions: payload.versions.map((version) => ({
      ...version,
      text: Array.from({ length: 16 }, (_, index) => `Micah 6:${index + 1}`),
    })),
  });
  return payload;
}

function linksPayload(anchorRef: string, targetRef: string): CoreLinkResponse {
  return [
    {
      ...structuredClone(baseLink),
      _id: `link-${anchorRef}`,
      anchorRef,
      anchorRefExpanded: [anchorRef],
      sourceRef: targetRef,
      ref: targetRef,
      sourceHeRef: targetRef,
      category: "Commentary",
      index_title: targetRef.split(" ")[0] ?? targetRef,
    },
  ];
}

function pagedLinksPayload(anchorRef: string, count: number): CoreLinkResponse {
  return Array.from({ length: count }, (_, index) => ({
    ...structuredClone(baseLink),
    _id: `link-${anchorRef}-${index}`,
    anchorRef,
    anchorRefExpanded: [anchorRef],
    sourceRef: `Rashi on Micah 6:8:${index + 1}`,
    ref: `Rashi on Micah 6:8:${index + 1}`,
    sourceHeRef: `Rashi on Micah 6:8:${index + 1}`,
    category: "Commentary",
    index_title: "Rashi on Micah",
  }));
}

function path(request: Request): string {
  return decodeURIComponent(new URL(request.url).pathname);
}

test("real factories keep ancestor text beside child text and child connections", async () => {
  const requests: string[] = [];
  const responses = new Map<string, unknown>([
    ["/api/v3/texts/Micah 6:8", sourcePayload("Micah 6:8", "Micah 6:8")],
    ["/api/links/Micah 6:8", linksPayload("Micah 6:8", "Rashi on Micah 6:8:1")],
    [
      "/api/v3/texts/Rashi on Micah 6:8:1",
      sourcePayload("Rashi on Micah 6:8:1", "Rashi on Micah 6:8:1"),
    ],
    [
      "/api/links/Rashi on Micah 6:8:1",
      linksPayload("Rashi on Micah 6:8:1", "Another source 1:1"),
    ],
  ]);
  const client = createSefariaClient({
    cache: false,
    fetch: async (input) => {
      const request = input instanceof Request ? input : new Request(input);
      const requestPath = path(request);
      requests.push(requestPath);
      const payload = responses.get(requestPath);
      if (payload === undefined) {
        throw new Error(`Unexpected request: ${requestPath}`);
      }
      return Response.json(payload);
    },
  });
  const demo = startReaderWorkspace(document, client);

  await demo.navigate("Micah 6:8", false);
  const rootConnection = document.querySelector<SefariaConnectionsPanel>(
    "sefaria-connections-panel",
  )!;
  rootConnection.dispatchEvent(
    new CustomEvent("sefaria-connection-select", {
      detail: {
        id: "link-Micah 6:8",
        targetRef: "Rashi on Micah 6:8:1",
      },
    }),
  );
  await vi.waitFor(() => expect(demo.view.panes).toHaveLength(3));

  expect(demo.view.panes.map((pane) => pane.kind)).toEqual([
    "source",
    "source",
    "connections",
  ]);
  expect(
    document.querySelectorAll<SefariaSourceCard>("sefaria-source-card"),
  ).toHaveLength(2);
  expect(requests).toEqual([
    "/api/v3/texts/Micah 6:8",
    "/api/links/Micah 6:8",
    "/api/v3/texts/Rashi on Micah 6:8:1",
    "/api/links/Rashi on Micah 6:8:1",
  ]);
  demo.dispose();
});

test("selects an exact segment from a deployed-shape expanded section", async () => {
  const requests: string[] = [];
  const versions: string[] = [];
  const demo = startReaderWorkspace(
    document,
    createSefariaClient({
      cache: false,
      fetch: async (input) => {
        const request = input instanceof Request ? input : new Request(input);
        requests.push(path(request));
        versions.push(...new URL(request.url).searchParams.getAll("version"));
        if (path(request) === "/api/v3/texts/Micah 6:8") {
          return Response.json(expandedSectionPayload());
        }
        if (path(request) === "/api/links/Micah 6:8") {
          return Response.json(linksPayload("Micah 6:8", "Other 1:1"));
        }
        throw new Error(`Unexpected request: ${path(request)}`);
      },
    }),
  );

  await demo.navigate("Micah 6:8", false);

  expect(
    document.querySelector<SefariaSourceCard>("sefaria-source-card")
      ?.selectedPosition,
  ).toEqual([7]);
  expect(requests).toEqual(["/api/v3/texts/Micah 6:8", "/api/links/Micah 6:8"]);
  expect(versions).toEqual(["primary", "translation"]);
  demo.dispose();
});

test("commits a qualified contextual source with its effective request", async () => {
  const requests: string[] = [];
  const responses = new Map<string, unknown>([
    ["/api/v3/texts/Micah 6:8", sourcePayload("Micah 6:8", "Micah 6:8")],
    ["/api/links/Micah 6:8", linksPayload("Micah 6:8", "Genesis 1:2")],
    ["/api/v3/texts/Genesis 1:2", parsedContextualTarget],
    ["/api/v3/texts/Genesis 1", parsedContextualSection],
    ["/api/links/Genesis 1:2", parsedContextualLinks],
  ]);
  const demo = startReaderWorkspace(
    document,
    createSefariaClient({
      cache: false,
      fetch: async (input) => {
        const request = input instanceof Request ? input : new Request(input);
        requests.push(path(request));
        const payload = responses.get(path(request));
        if (payload === undefined) {
          throw new Error(`Unexpected request: ${path(request)}`);
        }
        return Response.json(payload);
      },
    }),
  );
  await demo.navigate("Micah 6:8", false);

  document
    .querySelector<SefariaConnectionsPanel>("sefaria-connections-panel")!
    .dispatchEvent(
      new CustomEvent("sefaria-connection-select", {
        detail: { targetRef: "Genesis 1:2" },
      }),
    );
  await vi.waitFor(() => expect(demo.view.panes).toHaveLength(3));

  expect(requests).toEqual([
    "/api/v3/texts/Micah 6:8",
    "/api/links/Micah 6:8",
    "/api/v3/texts/Genesis 1:2",
    "/api/v3/texts/Genesis 1",
    "/api/links/Genesis 1:2",
  ]);
  expect(
    document.querySelectorAll<SefariaSourceCard>("sefaria-source-card")[1]
      ?.selectedPosition,
  ).toEqual([1]);
  demo.dispose();
});

test("drives the supported reader component through navigation and Back", async () => {
  const requests: string[] = [];
  const responses = new Map<string, unknown>([
    ["/api/v3/texts/Micah 6:8", sourcePayload("Micah 6:8", "Micah 6:8")],
    ["/api/links/Micah 6:8", linksPayload("Micah 6:8", "Rashi on Micah 6:8:1")],
    [
      "/api/v3/texts/Rashi on Micah 6:8:1",
      sourcePayload("Rashi on Micah 6:8:1", "Rashi on Micah 6:8:1"),
    ],
    [
      "/api/links/Rashi on Micah 6:8:1",
      linksPayload("Rashi on Micah 6:8:1", "Other 1:1"),
    ],
  ]);
  const demo = startControlledReader(
    document,
    createSefariaClient({
      cache: false,
      fetch: async (input) => {
        const request = input instanceof Request ? input : new Request(input);
        requests.push(path(request));
        const payload = responses.get(path(request));
        if (payload === undefined) {
          throw new Error(`Unexpected request: ${path(request)}`);
        }
        return Response.json(payload);
      },
    }),
  );
  await demo.navigate("Micah 6:8");
  let reader = document.querySelector<SefariaReader>("sefaria-reader")!;
  await reader.updateComplete;

  expect(document.querySelectorAll("sefaria-reader")).toHaveLength(1);
  expect(document.querySelectorAll(".reader-pane")).toHaveLength(0);
  expect(reader.viewModel?.breadcrumbs).toHaveLength(1);
  reader.dispatchEvent(
    new CustomEvent("sefaria-reader-connection-select", {
      detail: {
        originEntryId: "entry-1",
        targetRef: "Rashi on Micah 6:8:1",
      },
    }),
  );
  await vi.waitFor(() =>
    expect(
      document.querySelector<SefariaReader>("sefaria-reader")?.viewModel
        ?.currentEntryId,
    ).toBe("entry-2"),
  );
  reader = document.querySelector<SefariaReader>("sefaria-reader")!;
  await reader.updateComplete;

  expect(reader.viewModel?.breadcrumbs).toHaveLength(2);
  reader.shadowRoot
    ?.querySelector<HTMLButtonElement>('[data-action="back"]')
    ?.click();
  await vi.waitFor(() =>
    expect(reader.viewModel?.currentEntryId).toBe("entry-1"),
  );

  expect(reader.viewModel?.breadcrumbs).toHaveLength(1);
  expect(requests).toEqual([
    "/api/v3/texts/Micah 6:8",
    "/api/links/Micah 6:8",
    "/api/v3/texts/Rashi on Micah 6:8:1",
    "/api/links/Rashi on Micah 6:8:1",
  ]);
  demo.dispose();
});

test("source reselection prunes descendants and performs one links request", async () => {
  const requests: string[] = [];
  const responses = new Map<string, unknown>([
    ["/api/v3/texts/Micah 6:8", sourcePayload("Micah 6:8", "Micah 6:8")],
    ["/api/links/Micah 6:8", linksPayload("Micah 6:8", "Rashi on Micah 6:8:1")],
    [
      "/api/v3/texts/Rashi on Micah 6:8:1",
      sourcePayload("Rashi on Micah 6:8:1", "Rashi on Micah 6:8:1"),
    ],
    [
      "/api/links/Rashi on Micah 6:8:1",
      linksPayload("Rashi on Micah 6:8:1", "Other 1:1"),
    ],
  ]);
  const demo = startReaderWorkspace(
    document,
    createSefariaClient({
      cache: false,
      fetch: async (input) => {
        const request = input instanceof Request ? input : new Request(input);
        requests.push(path(request));
        const payload = responses.get(path(request));
        if (payload === undefined) {
          throw new Error(`Unexpected request: ${path(request)}`);
        }
        return Response.json(payload);
      },
    }),
  );
  await demo.navigate("Micah 6:8", false);
  document
    .querySelector<SefariaConnectionsPanel>("sefaria-connections-panel")!
    .dispatchEvent(
      new CustomEvent("sefaria-connection-select", {
        detail: {
          id: "link-Micah 6:8",
          targetRef: "Rashi on Micah 6:8:1",
        },
      }),
    );
  await vi.waitFor(() => expect(demo.view.panes).toHaveLength(3));
  requests.length = 0;
  const rootSource = document.querySelectorAll<SefariaSourceCard>(
    "sefaria-source-card",
  )[0]!;
  const item =
    rootSource.viewModel?.state === "data"
      ? rootSource.viewModel.items[0]
      : undefined;
  if (!item) throw new Error("Expected a selectable root source item.");

  rootSource.dispatchEvent(
    new CustomEvent("sefaria-source-select", {
      detail: { position: item.position, ref: item.ref },
    }),
  );
  await vi.waitFor(() => expect(demo.view.panes).toHaveLength(2));

  expect(demo.view.panes.every((pane) => pane.entryId === "entry-1")).toBe(
    true,
  );
  expect(requests).toEqual(["/api/links/Micah 6:8"]);
  demo.dispose();
});

test("category and page changes reproject a captured response without I/O", async () => {
  const requests: string[] = [];
  const demo = startReaderWorkspace(
    document,
    createSefariaClient({
      cache: false,
      fetch: async (input) => {
        const request = input instanceof Request ? input : new Request(input);
        requests.push(path(request));
        if (path(request) === "/api/v3/texts/Micah 6:8") {
          return Response.json(sourcePayload("Micah 6:8", "Micah 6:8"));
        }
        if (path(request) === "/api/links/Micah 6:8") {
          return Response.json(pagedLinksPayload("Micah 6:8", 12));
        }
        throw new Error(`Unexpected request: ${path(request)}`);
      },
    }),
  );
  await demo.navigate("Micah 6:8", false);
  const requestCount = requests.length;
  let panel = document.querySelector<SefariaConnectionsPanel>(
    "sefaria-connections-panel",
  )!;

  panel.dispatchEvent(
    new CustomEvent("sefaria-connections-category-change", {
      detail: { category: "Commentary" },
    }),
  );
  panel = document.querySelector<SefariaConnectionsPanel>(
    "sefaria-connections-panel",
  )!;
  panel.dispatchEvent(
    new CustomEvent("sefaria-connections-page-change", {
      detail: { page: 2 },
    }),
  );

  expect(requests).toHaveLength(requestCount);
  expect(
    document.querySelector<SefariaConnectionsPanel>("sefaria-connections-panel")
      ?.viewModel?.state,
  ).toBe("data");
  demo.dispose();
});

test("a links failure preserves committed text and renders an explicit outcome", async () => {
  const demo = startReaderWorkspace(
    document,
    createSefariaClient({
      cache: false,
      fetch: async (input) => {
        const request = input instanceof Request ? input : new Request(input);
        if (path(request) === "/api/v3/texts/Micah 6:8") {
          return Response.json(sourcePayload("Micah 6:8", "Micah 6:8"));
        }
        throw new TypeError("Connections transport failed.");
      },
    }),
  );

  await demo.navigate("Micah 6:8", false);

  expect(document.querySelector("sefaria-source-card")).not.toBeNull();
  expect(
    document.querySelector<HTMLElement>(".reader-pane [role='alert']")
      ?.textContent,
  ).toContain("Connections transport failed.");
  expect(
    document.querySelector<HTMLElement>("#host-error")?.textContent,
  ).toContain("Connections transport failed.");
  demo.dispose();
});

test("rejects another visible pane with an instruction before requesting it", async () => {
  const requests: string[] = [];
  const demo = startReaderWorkspace(
    document,
    createSefariaClient({
      cache: false,
      fetch: async (input) => {
        const request = input instanceof Request ? input : new Request(input);
        requests.push(path(request));
        if (path(request) === "/api/v3/texts/Micah 6:8") {
          return Response.json(sourcePayload("Micah 6:8", "Micah 6:8"));
        }
        if (path(request) === "/api/links/Micah 6:8") {
          return Response.json(
            linksPayload("Micah 6:8", "Rashi on Micah 6:8:1"),
          );
        }
        throw new Error(`Unexpected request: ${path(request)}`);
      },
    }),
    { maxPanes: 2 },
  );
  await demo.navigate("Micah 6:8", false);
  document
    .querySelector<SefariaConnectionsPanel>("sefaria-connections-panel")!
    .dispatchEvent(
      new CustomEvent("sefaria-connection-select", {
        detail: { targetRef: "Rashi on Micah 6:8:1" },
      }),
    );
  await vi.waitFor(() =>
    expect(
      document.querySelector<HTMLElement>("#host-error")?.textContent,
    ).toContain("Close a pane before opening another"),
  );

  expect(requests).toEqual(["/api/v3/texts/Micah 6:8", "/api/links/Micah 6:8"]);
  expect(demo.view.panes).toHaveLength(2);
  demo.dispose();
});

test("a removed-path action makes a delayed completion ineligible", async () => {
  let finishChild!: (response: Response) => void;
  const client = createSefariaClient({
    cache: false,
    fetch: async (input) => {
      const request = input instanceof Request ? input : new Request(input);
      switch (path(request)) {
        case "/api/v3/texts/Micah 6:8":
          return Response.json(sourcePayload("Micah 6:8", "Micah 6:8"));
        case "/api/links/Micah 6:8":
          return Response.json(
            linksPayload("Micah 6:8", "Rashi on Micah 6:8:1"),
          );
        case "/api/v3/texts/Rashi on Micah 6:8:1":
          return await new Promise<Response>((resolve) => {
            finishChild = resolve;
          });
        default:
          throw new Error(`Unexpected request: ${path(request)}`);
      }
    },
  });
  const demo = startReaderWorkspace(document, client);
  await demo.navigate("Micah 6:8", false);
  const rootPaneId = demo.view.panes[0]!.id;
  document
    .querySelector<SefariaConnectionsPanel>("sefaria-connections-panel")!
    .dispatchEvent(
      new CustomEvent("sefaria-connection-select", {
        detail: {
          id: "link-Micah 6:8",
          targetRef: "Rashi on Micah 6:8:1",
        },
      }),
    );
  await vi.waitFor(() => expect(finishChild).toBeTypeOf("function"));

  demo.activatePane(rootPaneId);
  finishChild(
    Response.json(
      sourcePayload("Rashi on Micah 6:8:1", "Rashi on Micah 6:8:1"),
    ),
  );
  await Promise.resolve();

  expect(demo.view.panes).toHaveLength(2);
  expect(demo.view.panes.every((pane) => pane.entryId === "entry-1")).toBe(
    true,
  );
  demo.dispose();
});

test("uses a viewport-bound horizontal workspace with independently scrolling panes", async () => {
  const workspace = document.querySelector<HTMLElement>("#workspace")!;
  const site = document.querySelector<HTMLElement>("#reader-site")!;
  const client = createSefariaClient({
    cache: false,
    fetch: async (input) => {
      const request = input instanceof Request ? input : new Request(input);
      if (path(request) === "/api/v3/texts/Micah 6:8") {
        return Response.json(sourcePayload("Micah 6:8", "Micah 6:8"));
      }
      if (path(request) === "/api/links/Micah 6:8") {
        return Response.json(linksPayload("Micah 6:8", "Other 1:1"));
      }
      throw new Error(`Unexpected request: ${path(request)}`);
    },
  });
  const demo = startReaderWorkspace(document, client);
  await demo.navigate("Micah 6:8", false);
  site.style.width = "1000px";
  await new Promise(requestAnimationFrame);
  const panes = [...document.querySelectorAll<HTMLElement>(".reader-pane")];

  expect(getComputedStyle(site).height).toBe(`${window.innerHeight}px`);
  expect(getComputedStyle(workspace).overflowX).toBe("auto");
  expect(
    panes.every((pane) => getComputedStyle(pane).overflowY === "auto"),
  ).toBe(true);

  site.style.width = "360px";
  await new Promise(requestAnimationFrame);
  const activePaneId = demo.view.panes.at(-1)!.id;
  expect(
    panes.filter((pane) => getComputedStyle(pane).display !== "none"),
  ).toHaveLength(1);
  expect(
    panes.find((pane) => pane.dataset.paneId === activePaneId)?.dataset.active,
  ).toBe("true");
  demo.dispose();
});

test("closing a child source prunes it and its connections", async () => {
  const responses = new Map<string, unknown>([
    ["/api/v3/texts/Micah 6:8", sourcePayload("Micah 6:8", "Micah 6:8")],
    ["/api/links/Micah 6:8", linksPayload("Micah 6:8", "Rashi on Micah 6:8:1")],
    [
      "/api/v3/texts/Rashi on Micah 6:8:1",
      sourcePayload("Rashi on Micah 6:8:1", "Rashi on Micah 6:8:1"),
    ],
    [
      "/api/links/Rashi on Micah 6:8:1",
      linksPayload("Rashi on Micah 6:8:1", "Other 1:1"),
    ],
  ]);
  const demo = startReaderWorkspace(
    document,
    createSefariaClient({
      cache: false,
      fetch: async (input) => {
        const request = input instanceof Request ? input : new Request(input);
        const payload = responses.get(path(request));
        if (payload === undefined) {
          throw new Error(`Unexpected request: ${path(request)}`);
        }
        return Response.json(payload);
      },
    }),
  );
  await demo.navigate("Micah 6:8", false);
  document
    .querySelector<SefariaConnectionsPanel>("sefaria-connections-panel")!
    .dispatchEvent(
      new CustomEvent("sefaria-connection-select", {
        detail: {
          id: "link-Micah 6:8",
          targetRef: "Rashi on Micah 6:8:1",
        },
      }),
    );
  await vi.waitFor(() => expect(demo.view.panes).toHaveLength(3));

  demo.closePane(demo.view.panes[1]!.id);

  expect(demo.view.panes).toHaveLength(1);
  expect(demo.view.currentEntryId).toBe("entry-1");
  demo.dispose();
});
