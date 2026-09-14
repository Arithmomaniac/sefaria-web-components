import {
  createSefariaClient,
  zCoreLinkResponse,
  type CoreLinkObject,
  type CoreLinkResponse,
} from "@sefaria/client";
import { expect, test, vi } from "vitest";
import targum from "../../client/test/fixtures/links-targum-2026-08-30.json";
import {
  createConnectionsViewModel,
  loadConnectionsViewModel,
} from "./connections-panel.js";

const seed = zCoreLinkResponse.parse(targum) as CoreLinkResponse;
if (!Array.isArray(seed) || !seed[0] || "isSheet" in seed[0])
  throw new Error("Expected a text link");
const base: CoreLinkObject = seed[0];
const request = { tref: "Genesis 1:1", withText: true };
function links(count: number): CoreLinkObject[] {
  return Array.from({ length: count }, (_, index) => ({
    ...base,
    _id: String(index).padStart(3, "0"),
    commentaryNum: index,
    sourceRef: `Rashi on Genesis 1:1:${index + 1}`,
    category: "Commentary",
    text: ["First", ["Second", null]],
    he: null,
    versionTitle: ["Edition A", "Edition B"],
  }));
}

test("groups every category, pages 20 entries and counts ranged anchors once", () => {
  const payload = [
    ...links(21),
    { ...base, anchorRefExpanded: ["Genesis 1:1", "Genesis 1:2"] },
  ];
  const first = createConnectionsViewModel(payload, request, {
    category: "Commentary",
    page: 0,
  });
  expect(first.state).toBe("data");
  if (first.state !== "data") return;
  expect(first.categories).toEqual([
    { id: "Commentary", count: 21 },
    { id: "Targum", count: 1 },
  ]);
  expect(first.entries).toHaveLength(20);
  expect(first.total).toBe(21);
  expect(first.entries[0]?.preview).toMatchObject({
    state: "available",
    english: { text: "First\nSecond" },
    hebrew: null,
  });
  expect(first.entries[0]?.editions).toContain("Edition B");
  const next = createConnectionsViewModel(payload, request, {
    category: "Commentary",
    page: 1,
  });
  expect(next.state === "data" && next.entries).toHaveLength(1);
  expect(
    createConnectionsViewModel([...payload].reverse(), request, {
      category: "Commentary",
      page: 0,
    }),
  ).toEqual(first);
});

test("deduplicates identities without collapsing distinct links to the same ref", () => {
  const items = links(2);
  const first = items[0]!;
  expect(
    createConnectionsViewModel([first, { ...first }], request, {
      category: "Commentary",
    }),
  ).toMatchObject({ total: 1 });
  expect(
    createConnectionsViewModel(
      [first, { ...first, text: "Conflict" }],
      request,
    ),
  ).toMatchObject({ state: "error", errorKind: "projection" });
  expect(
    createConnectionsViewModel(items, request, { category: "Commentary" }),
  ).toMatchObject({ total: 2 });
});

test("distinguishes absent and not-requested previews and bounded truncation", () => {
  const input = links(1);
  input[0]!.text = "X".repeat(3600);
  const result = createConnectionsViewModel(input, request, {
    category: "Commentary",
  });
  expect(result.state === "data" && result.entries[0]?.preview).toMatchObject({
    state: "available",
    english: { truncated: true },
  });
  expect(
    createConnectionsViewModel(
      input,
      { ...request, withText: false },
      { category: "Commentary" },
    ),
  ).toMatchObject({ entries: [{ preview: { state: "not-requested" } }] });
  input[0]!.text = null;
  expect(
    createConnectionsViewModel(input, request, { category: "Commentary" }),
  ).toMatchObject({ entries: [{ preview: { state: "absent" } }] });
});

test("handles empty, typed API/HTTP errors and out-of-range pages", () => {
  expect(createConnectionsViewModel([], request)).toMatchObject({
    state: "empty",
  });
  expect(
    createConnectionsViewModel({ error: "Bad ref" }, request),
  ).toMatchObject({ state: "error", errorKind: "api" });
  expect(
    createConnectionsViewModel({ error: "Book" }, request, {}, 400),
  ).toMatchObject({ state: "error", errorKind: "http", status: 400 });
  expect(
    createConnectionsViewModel(links(1), request, {
      category: "Commentary",
      page: 3,
    }),
  ).toMatchObject({ state: "data", entries: [], page: 3, total: 1 });
});

test("one links request produces ten previews with pure/async equivalence", async () => {
  const payload = links(10);
  const fetch = vi.fn<typeof globalThis.fetch>(async () =>
    Response.json(payload),
  );
  const client = createSefariaClient({ fetch });
  const projection = { category: "Commentary" };
  expect(
    await loadConnectionsViewModel(request, client, undefined, projection),
  ).toEqual(createConnectionsViewModel(payload, request, projection));
  expect(fetch).toHaveBeenCalledTimes(1);
  const sent = fetch.mock.calls[0]?.[0];
  expect(sent instanceof Request ? sent.url : String(sent)).toContain(
    "with_text=1",
  );
});

test("rejects invalid request before IO and preserves network failures", async () => {
  const failure = new Error("Offline");
  const fetch = vi.fn(async () => {
    throw failure;
  });
  const client = createSefariaClient({ fetch });
  await expect(
    loadConnectionsViewModel({ ...request, tref: " " }, client),
  ).rejects.toThrow(TypeError);
  expect(fetch).not.toHaveBeenCalled();
  await expect(loadConnectionsViewModel(request, client)).rejects.toBe(failure);
  expect(() => createConnectionsViewModel([], request, { page: -1 })).toThrow(
    RangeError,
  );
});
