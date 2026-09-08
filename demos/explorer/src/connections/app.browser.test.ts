import { createSefariaClient } from "@sefaria/client";
import type {
  SefariaConnectionsPanel,
  SefariaSourceCard,
} from "@sefaria/components";
import { beforeEach, expect, test, vi } from "vitest";
import target from "../../../../packages/client/test/fixtures/v3-connections-genesis-target-2026-09-06.json";
import context from "../../../../packages/client/test/fixtures/v3-connections-genesis-section-2026-09-06.json";
import rashiTarget from "../../../../packages/client/test/fixtures/v3-connections-rashi-range-2026-09-06.json";
import rashiContext from "../../../../packages/client/test/fixtures/v3-connections-rashi-section-2026-09-06.json";
import capturedLinks from "../../../../packages/client/test/fixtures/links-connections-preview-2026-09-06.json";
import { startConnectionsDemo } from "./app.js";

beforeEach(() => {
  document.body.innerHTML = `<form id="reader-form"><input name="tref" value="Genesis 1:2"><button>Open</button></form>
    <input id="show-previews" type="checkbox" checked><input id="metadata-only" type="checkbox">
    <select id="content-language"><option>both</option><option>primary</option><option>translation</option></select><input id="show-address-labels" type="checkbox" checked><select id="layout"><option>auto</option></select><select id="side-order"><option>primary-first</option></select>
    <p id="status"></p><p id="host-error" hidden></p><p id="request-counts"></p>
    <sefaria-source-card id="reader"></sefaria-source-card><sefaria-connections-panel id="connections"></sefaria-connections-panel>`;
});

function reader(): SefariaSourceCard {
  return document.querySelector("sefaria-source-card")!;
}
function panel(): SefariaConnectionsPanel {
  return document.querySelector("sefaria-connections-panel")!;
}
function response(request: Request): Response {
  const path = decodeURIComponent(new URL(request.url).pathname);
  if (path.startsWith("/api/links/")) return Response.json(capturedLinks);
  const payload = new Map<string, unknown>([
    ["/api/v3/texts/Genesis 1:2", target],
    ["/api/v3/texts/Genesis 1", context],
    ["/api/v3/texts/Rashi on Genesis 1:1:1-2", rashiTarget],
    ["/api/v3/texts/Rashi on Genesis 1:1", rashiContext],
  ]).get(path);
  if (!payload) throw new Error(`Unexpected request: ${path}`);
  return Response.json(payload);
}

test("real factories open context, select one first target, and load its links", async () => {
  const requests: string[] = [];
  const client = createSefariaClient({
    fetch: async (input) => {
      const request = input instanceof Request ? input : new Request(input);
      requests.push(decodeURIComponent(request.url));
      return response(request);
    },
  });
  const demo = startConnectionsDemo(document, client);
  await demo.navigate("Genesis 1:2");
  expect(reader().viewModel).toMatchObject({
    state: "data",
    header: { ref: "Genesis 1" },
  });
  expect(reader().selectedPosition).toEqual([1]);
  expect(requests).toHaveLength(3);
  expect(requests[2]).toContain("/api/links/Genesis 1:2");
  await demo.navigate("Rashi on Genesis 1:1:1-2");
  expect(reader().viewModel).toMatchObject({
    header: { ref: "Rashi on Genesis 1:1" },
  });
  expect(reader().selectedPosition).toEqual([0]);
  expect(requests.at(-1)).toContain("/api/links/Rashi on Genesis 1:1:1?");
  expect(requests).toHaveLength(6);
  demo.dispose();
});

test("initial navigation can preserve host focus", async () => {
  const input = document.querySelector<HTMLInputElement>('[name="tref"]')!;
  input.focus();
  const demo = startConnectionsDemo(
    document,
    createSefariaClient({
      fetch: async (value) =>
        response(value instanceof Request ? value : new Request(value)),
    }),
  );
  await demo.navigate("Genesis 1:2", false);
  expect(document.activeElement).toBe(input);
  demo.dispose();
});

test("direct capture requests retain the connections factory query defaults", async () => {
  const requests: URL[] = [];
  const demo = startConnectionsDemo(
    document,
    createSefariaClient({
      cache: false,
      fetch: async (input) => {
        const request = input instanceof Request ? input : new Request(input);
        requests.push(new URL(request.url));
        return response(request);
      },
    }),
  );

  await demo.navigate("Genesis 1:2");
  document.querySelector<HTMLInputElement>("#metadata-only")!.checked = true;
  await demo.navigate("Genesis 1:2");

  const links = requests.filter((url) =>
    url.pathname.startsWith("/api/links/"),
  );
  expect(
    links.map((url) => ({
      withText: url.searchParams.get("with_text"),
      withSheetLinks: url.searchParams.get("with_sheet_links"),
    })),
  ).toEqual([
    { withText: "1", withSheetLinks: "0" },
    { withText: "0", withSheetLinks: "0" },
  ]);
  demo.dispose();
});

test("local paging/category/preview display use only the current capture", async () => {
  const fetch = vi.fn<typeof globalThis.fetch>(async (input) =>
    response(input instanceof Request ? input : new Request(input)),
  );
  const demo = startConnectionsDemo(document, createSefariaClient({ fetch }));
  await demo.navigate("Genesis 1:2");
  panel().dispatchEvent(
    new CustomEvent("sefaria-connections-category-change", {
      detail: { category: "Commentary" },
    }),
  );
  panel().dispatchEvent(
    new CustomEvent("sefaria-connections-page-change", { detail: { page: 1 } }),
  );
  expect(panel().viewModel).toMatchObject({ category: "Commentary", page: 1 });
  document.querySelector<HTMLInputElement>("#show-previews")!.click();
  expect(panel().showPreviews).toBe(false);
  const showAddressLabels = document.querySelector<HTMLInputElement>(
    "#show-address-labels",
  )!;
  showAddressLabels.click();
  expect(reader().showAddressLabels).toBe(false);
  expect(fetch).toHaveBeenCalledTimes(3);
  demo.dispose();
});

test("loading previews preserves the active category and page", async () => {
  document.querySelector<HTMLInputElement>("#metadata-only")!.checked = true;
  const fetch = vi.fn<typeof globalThis.fetch>(async (input) =>
    response(input instanceof Request ? input : new Request(input)),
  );
  const demo = startConnectionsDemo(document, createSefariaClient({ fetch }));
  await demo.navigate("Genesis 1:2");
  panel().dispatchEvent(
    new CustomEvent("sefaria-connections-category-change", {
      detail: { category: "Commentary" },
    }),
  );
  panel().dispatchEvent(
    new CustomEvent("sefaria-connections-page-change", { detail: { page: 1 } }),
  );
  panel().dispatchEvent(new CustomEvent("sefaria-connections-preview-request"));
  await vi.waitFor(() =>
    expect(panel().viewModel).toMatchObject({
      category: "Commentary",
      page: 1,
      previewsIncluded: true,
    }),
  );
  expect(fetch).toHaveBeenCalledTimes(4);
  demo.dispose();
});

test("selecting a reader row issues only a links request", async () => {
  const fetch = vi.fn<typeof globalThis.fetch>(async (input) =>
    response(input instanceof Request ? input : new Request(input)),
  );
  const demo = startConnectionsDemo(document, createSefariaClient({ fetch }));
  await demo.navigate("Genesis 1:2");
  reader().dispatchEvent(
    new CustomEvent("sefaria-source-select", {
      detail: { position: [0], ref: "Genesis 1:1" },
    }),
  );
  await vi.waitFor(() =>
    expect(panel().viewModel).toMatchObject({ reference: "Genesis 1:1" }),
  );
  expect(fetch).toHaveBeenCalledTimes(4);
  expect(reader().selectedPosition).toEqual([0]);
  demo.dispose();
});

test("a failed row links request keeps the new selection and ends loading", async () => {
  let failLinks = false;
  const fetch = vi.fn<typeof globalThis.fetch>(async (input) => {
    const request = input instanceof Request ? input : new Request(input);
    if (
      failLinks &&
      decodeURIComponent(new URL(request.url).pathname).startsWith(
        "/api/links/",
      )
    ) {
      throw new Error("links unavailable");
    }
    return response(request);
  });
  const demo = startConnectionsDemo(document, createSefariaClient({ fetch }));
  await demo.navigate("Genesis 1:2");
  failLinks = true;
  reader().dispatchEvent(
    new CustomEvent("sefaria-source-select", {
      detail: { position: [0], ref: "Genesis 1:1" },
    }),
  );
  await vi.waitFor(() =>
    expect(
      document.querySelector<HTMLElement>("#host-error")!.textContent,
    ).toContain("links unavailable"),
  );
  expect(reader().selectedPosition).toEqual([0]);
  expect(panel().viewModel).toBeUndefined();
  demo.dispose();
});

test("context and links load concurrently and the reader commits first", async () => {
  let finishContext!: (value: Response) => void;
  let finishLinks!: (value: Response) => void;
  const requests: string[] = [];
  const fetch: typeof globalThis.fetch = async (input) => {
    const request = input instanceof Request ? input : new Request(input);
    const path = decodeURIComponent(new URL(request.url).pathname);
    requests.push(path);
    if (path === "/api/v3/texts/Genesis 1:2") {
      return Response.json(target);
    }
    if (path === "/api/v3/texts/Genesis 1") {
      return await new Promise<Response>((resolve) => {
        finishContext = resolve;
      });
    }
    if (path === "/api/links/Genesis 1:2") {
      return await new Promise<Response>((resolve) => {
        finishLinks = resolve;
      });
    }
    throw new Error(`Unexpected request: ${path}`);
  };
  const demo = startConnectionsDemo(document, createSefariaClient({ fetch }));
  const navigation = demo.navigate("Genesis 1:2");
  await vi.waitFor(() => {
    expect(finishContext).toBeTypeOf("function");
    expect(finishLinks).toBeTypeOf("function");
  });
  expect(requests).toEqual([
    "/api/v3/texts/Genesis 1:2",
    "/api/v3/texts/Genesis 1",
    "/api/links/Genesis 1:2",
  ]);

  finishContext(Response.json(context));
  await vi.waitFor(() =>
    expect(reader().viewModel).toMatchObject({
      state: "data",
      header: { ref: "Genesis 1" },
    }),
  );
  expect(reader().selectedPosition).toEqual([1]);
  expect(panel().viewModel).toMatchObject({ state: "loading" });

  finishLinks(Response.json(capturedLinks));
  await navigation;
  expect(panel().viewModel).toMatchObject({
    state: "data",
    reference: "Genesis 1:2",
  });
  demo.dispose();
});

test("a spanning target opens its first server-provided context", async () => {
  const spanning = structuredClone(target);
  Object.assign(spanning, {
    ref: "Genesis 1:1-50:26",
    sectionRef: "Genesis 1-50",
    sections: ["1", "1"],
    toSections: ["50", "26"],
    isSpanning: true,
    spanningRefs: ["Genesis 1:1-31", "Genesis 2:1-25"],
  });
  const requests: string[] = [];
  const fetch: typeof globalThis.fetch = async (input) => {
    const request = input instanceof Request ? input : new Request(input);
    const path = decodeURIComponent(new URL(request.url).pathname);
    requests.push(path);
    if (path === "/api/v3/texts/Genesis 1:1-50:26") {
      return Response.json(spanning);
    }
    if (path === "/api/v3/texts/Genesis 1:1-31") {
      return Response.json(context);
    }
    if (path === "/api/links/Genesis 1:1") {
      return Response.json(capturedLinks);
    }
    throw new Error(`Unexpected request: ${path}`);
  };
  const demo = startConnectionsDemo(document, createSefariaClient({ fetch }));
  await demo.navigate("Genesis 1:1-50:26");
  expect(requests).toEqual([
    "/api/v3/texts/Genesis 1:1-50:26",
    "/api/v3/texts/Genesis 1:1-31",
    "/api/links/Genesis 1:1",
  ]);
  expect(reader().viewModel).toMatchObject({
    state: "data",
    header: { ref: "Genesis 1" },
  });
  expect(reader().selectedPosition).toEqual([0]);
  expect(panel().viewModel).toMatchObject({ reference: "Genesis 1:1" });
  demo.dispose();
});

test("a missing contextual target aborts its sibling links request", async () => {
  const missingContext = structuredClone(context);
  for (const version of missingContext.versions) {
    if (Array.isArray(version.text)) {
      (version.text as (string | null)[])[1] = null;
    }
  }
  let linksAborted = false;
  const fetch: typeof globalThis.fetch = async (input) => {
    const request = input instanceof Request ? input : new Request(input);
    const path = decodeURIComponent(new URL(request.url).pathname);
    if (path === "/api/v3/texts/Genesis 1:2") {
      return Response.json(target);
    }
    if (path === "/api/v3/texts/Genesis 1") {
      return Response.json(missingContext);
    }
    if (path === "/api/links/Genesis 1:2") {
      return await new Promise<Response>((_resolve, reject) => {
        request.signal.addEventListener(
          "abort",
          () => {
            linksAborted = true;
            reject(request.signal.reason);
          },
          { once: true },
        );
      });
    }
    throw new Error(`Unexpected request: ${path}`);
  };
  const demo = startConnectionsDemo(document, createSefariaClient({ fetch }));
  await demo.navigate("Genesis 1:2");
  expect(linksAborted).toBe(true);
  expect(reader().viewModel).toBeUndefined();
  expect(panel().viewModel).toBeUndefined();
  expect(
    document.querySelector<HTMLElement>("#host-error")!.textContent,
  ).toContain("not a selectable row");
  demo.dispose();
});

test("an obsolete target response cannot replace newer contextual navigation", async () => {
  let finish!: (value: Response) => void;
  let first = true;
  const fetch: typeof globalThis.fetch = async (input) => {
    const request = input instanceof Request ? input : new Request(input);
    if (first) {
      first = false;
      return await new Promise<Response>((resolve) => {
        finish = resolve;
      });
    }
    return response(request);
  };
  const demo = startConnectionsDemo(document, createSefariaClient({ fetch }));
  const old = demo.navigate("Genesis 1:2");
  await vi.waitFor(() => expect(finish).toBeTypeOf("function"));
  await demo.navigate("Rashi on Genesis 1:1:1-2");
  finish(Response.json(target));
  await old;
  expect(reader().viewModel).toMatchObject({
    header: { ref: "Rashi on Genesis 1:1" },
  });
  expect(panel().viewModel).toMatchObject({
    reference: "Rashi on Genesis 1:1:1",
  });
  demo.dispose();
});

test("an obsolete reveal cannot replace newer links with a loading state", async () => {
  let finishReveal!: () => void;
  let revealCount = 0;
  vi.spyOn(reader(), "revealSelection").mockImplementation(async () => {
    revealCount += 1;
    if (revealCount === 1) {
      await new Promise<void>((resolve) => {
        finishReveal = resolve;
      });
    }
  });
  const fetch = vi.fn<typeof globalThis.fetch>(async (input) =>
    response(input instanceof Request ? input : new Request(input)),
  );
  const demo = startConnectionsDemo(document, createSefariaClient({ fetch }));
  const old = demo.navigate("Genesis 1:2");
  await vi.waitFor(() => expect(finishReveal).toBeTypeOf("function"));
  await demo.navigate("Rashi on Genesis 1:1:1-2");
  finishReveal();
  await old;
  expect(panel().viewModel).toMatchObject({
    state: "data",
    reference: "Rashi on Genesis 1:1:1",
  });
  demo.dispose();
});
