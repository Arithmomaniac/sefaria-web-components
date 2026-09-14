import {
  getLinks,
  type CoreLinkObject,
  type CoreLinkResponse,
  type CoreStringArrayOrNull,
  type GetLinksData,
  type SefariaClient,
} from "@sefaria/client";
import { createTextPreview, type TextPreview } from "@sefaria/text-transform";

import { createConnectionsQuery } from "./connections-request.js";

/** Transport inputs for one connections operation. */
export interface ConnectionsRequest {
  /** Reference whose links are requested. */
  readonly tref: GetLinksData["path"]["tref"];
  /** Includes connected text; defaults to true. */
  readonly withText?: boolean;
}

/** Local projection of an already captured links response. */
export interface ConnectionsProjection {
  /** Exact category to display, or absent for the summary. */
  readonly category?: string;
  /** Zero-based fixed-size page; defaults to zero. */
  readonly page?: number;
}

/** Availability of the links endpoint's legacy language channels. */
export type ConnectionPreview =
  | { readonly state: "not-requested" | "absent" }
  | {
      readonly state: "available";
      readonly english: TextPreview | null;
      readonly hebrew: TextPreview | null;
    };

/** One render-ready connection, never a fabricated v3 text payload. */
export interface ConnectionEntry {
  /** Link identity from the API. */
  readonly id: string;
  /** Target reference supplied by the API. */
  readonly targetRef: string;
  /** Hebrew target label supplied by the API. */
  readonly hebrewRef: string;
  /** Owning book's English title. */
  readonly book: string;
  /** Connected-text availability and bounded content. */
  readonly preview: ConnectionPreview;
  /** Editions reported for the whole connection, not exact fragment attributions. */
  readonly editions: readonly string[];
  /** Licenses reported for the whole connection. */
  readonly licenses: readonly string[];
}

/** A category and its unique-link count. */
export interface ConnectionCategory {
  /** Exact API category identity. */
  readonly id: string;
  /** Number of unique connection IDs in the category. */
  readonly count: number;
}

/** Complete bounded connections rendering state. */
export type ConnectionsViewModel =
  | { readonly state: "loading" | "empty"; readonly message: string }
  | {
      readonly state: "error";
      readonly errorKind: "api" | "http" | "projection";
      readonly message: string;
      readonly status?: number;
    }
  | {
      readonly state: "data";
      readonly reference: string;
      readonly categories: readonly ConnectionCategory[];
      readonly category: string | null;
      readonly entries: readonly ConnectionEntry[];
      readonly total: number;
      readonly page: number;
      readonly pageSize: number;
      readonly previewsIncluded: boolean;
    };

/** Fixed page size for this library slice, not an API pagination parameter. */
export const CONNECTIONS_PAGE_SIZE = 20;

/** Projects one validated response without I/O, caching, or child requests. */
export function createConnectionsViewModel(
  payload: CoreLinkResponse,
  request: ConnectionsRequest,
  projection: ConnectionsProjection = {},
  status: 200 | 400 = 200,
): ConnectionsViewModel {
  validateInputs(request, projection);
  if (!Array.isArray(payload)) {
    return {
      state: "error",
      errorKind: status === 400 ? "http" : "api",
      status,
      message: payload.error,
    };
  }
  const unique = new Map<string, CoreLinkObject>();
  for (const link of payload) {
    if ("isSheet" in link) continue;
    const existing = unique.get(link._id);
    if (existing && !sameJson(existing, link)) {
      return {
        state: "error",
        errorKind: "projection",
        message: `Conflicting connections share ID ${link._id}.`,
      };
    }
    unique.set(link._id, link);
  }
  if (unique.size === 0)
    return { state: "empty", message: "No text connections were returned." };
  const counts = new Map<string, number>();
  for (const link of unique.values())
    counts.set(link.category, (counts.get(link.category) ?? 0) + 1);
  const categories = [...counts]
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) =>
      a.id === b.id
        ? 0
        : a.id === "Commentary"
          ? -1
          : b.id === "Commentary"
            ? 1
            : compare(a.id, b.id),
    );
  const selected = [...unique.values()]
    .filter((link) => link.category === projection.category)
    .sort(
      (a, b) =>
        compare(a.index_title, b.index_title) ||
        a.anchorVerse - b.anchorVerse ||
        a.commentaryNum - b.commentaryNum ||
        compare(a.sourceRef, b.sourceRef) ||
        compare(a._id, b._id),
    );
  const page = projection.page ?? 0;
  return {
    state: "data",
    reference: request.tref,
    categories,
    category: projection.category ?? null,
    total: projection.category === undefined ? unique.size : selected.length,
    page,
    pageSize: CONNECTIONS_PAGE_SIZE,
    previewsIncluded: request.withText !== false,
    entries: selected
      .slice(page * CONNECTIONS_PAGE_SIZE, (page + 1) * CONNECTIONS_PAGE_SIZE)
      .map((link) => projectEntry(link, request.withText !== false)),
  };
}

/** Makes one links request and delegates all rendering projection to the pure factory. */
export async function loadConnectionsViewModel(
  request: ConnectionsRequest,
  client: SefariaClient,
  signal?: AbortSignal,
  projection: ConnectionsProjection = {},
): Promise<ConnectionsViewModel> {
  validateInputs(request, projection);
  const result = await getLinks({
    client,
    path: { tref: request.tref },
    query: createConnectionsQuery(request),
    ...(signal === undefined ? {} : { signal }),
  });
  if (result.data !== undefined)
    return createConnectionsViewModel(result.data, request, projection);
  if (result.error !== undefined && result.response.status === 400) {
    return createConnectionsViewModel(result.error, request, projection, 400);
  }
  throw new Error("The links request returned no data or documented error.");
}

function validateInputs(
  request: ConnectionsRequest,
  projection: ConnectionsProjection,
): void {
  if (request.tref.trim().length === 0)
    throw new TypeError("Connections reference must not be blank.");
  const page = projection.page ?? 0;
  if (
    !Number.isSafeInteger(page) ||
    page < 0 ||
    page >= Number.MAX_SAFE_INTEGER / CONNECTIONS_PAGE_SIZE
  ) {
    throw new RangeError(
      "Connections page must be a nonnegative bounded integer.",
    );
  }
  if (
    projection.category !== undefined &&
    projection.category.trim().length === 0
  ) {
    throw new TypeError("Connections category must not be blank.");
  }
}

function compare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sameJson(left: unknown, right: unknown): boolean {
  const pairs: [unknown, unknown][] = [[left, right]];
  while (pairs.length) {
    const pair = pairs.pop();
    if (!pair) break;
    const [a, b] = pair;
    if (a === b) continue;
    if (
      typeof a !== "object" ||
      a === null ||
      typeof b !== "object" ||
      b === null ||
      Array.isArray(a) !== Array.isArray(b)
    )
      return false;
    const entries = Object.entries(a);
    const other = new Map(Object.entries(b));
    if (entries.length !== other.size) return false;
    for (const [key, value] of entries) {
      if (!other.has(key)) return false;
      pairs.push([value, other.get(key)]);
    }
  }
  return true;
}

function* leaves(value: CoreStringArrayOrNull | undefined): Generator<string> {
  const stack = [value];
  while (stack.length) {
    const item = stack.pop();
    if (typeof item === "string") yield item;
    else if (Array.isArray(item)) {
      for (let index = item.length - 1; index >= 0; index--)
        stack.push(item[index]);
    }
  }
}

function preview(value: CoreStringArrayOrNull | undefined): TextPreview | null {
  const chunks: string[] = [];
  const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
  let count = 0;
  let leafTruncated = false;
  for (const leaf of leaves(value)) {
    const part = createTextPreview(leaf, 3501);
    if (part.text.trim().length === 0) continue;
    if (chunks.length) count++;
    chunks.push(part.html);
    for (const _segment of segmenter.segment(part.text)) {
      void _segment;
      count++;
    }
    leafTruncated ||= part.truncated;
    if (count > 3500) break;
  }
  if (!chunks.length) return null;
  const result = createTextPreview(chunks.join("<br>"), 3500);
  return { ...result, truncated: result.truncated || leafTruncated };
}

function projectEntry(
  link: CoreLinkObject,
  withText: boolean,
): ConnectionEntry {
  const english = withText ? preview(link.text) : null;
  const hebrew = withText ? preview(link.he) : null;
  return {
    id: link._id,
    targetRef: link.sourceRef,
    hebrewRef: link.sourceHeRef,
    book: link.index_title,
    preview: !withText
      ? { state: "not-requested" }
      : english === null && hebrew === null
        ? { state: "absent" }
        : { state: "available", english, hebrew },
    editions: [
      ...new Set([
        ...leaves(link.versionTitle),
        ...leaves(link.heVersionTitle),
      ]),
    ]
      .filter(Boolean)
      .sort(compare),
    licenses: [...new Set([...leaves(link.license), ...leaves(link.heLicense)])]
      .filter(Boolean)
      .sort(compare),
  };
}
