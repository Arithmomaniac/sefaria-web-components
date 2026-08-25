import {
  comparePositions,
  dataError,
  isDenseArrayOf,
  isRecord,
  isString,
  refError,
} from "./internal.js";
import type {
  BookIndex,
  BookIndexNode,
  ParsedRef,
  RefAddressType,
  RefDataError,
  RefDataErrorCode,
  RefError,
} from "./types.js";

interface ParsedAddress {
  readonly labels: readonly string[];
  readonly positions: readonly number[];
}

// Sefaria clients build their catalog once. Cache validation by immutable index
// identity so parsing the full title catalog remains interactive.
const catalogValidationCache = new WeakMap<
  object,
  RefDataErrorCode | undefined
>();

function hasBookIndexShape(value: unknown): value is BookIndex {
  return isRecord(value) && isRecord(value.aliases) && isRecord(value.nodes);
}

function isBookIndexNode(value: unknown): value is BookIndexNode {
  return (
    isRecord(value) &&
    typeof value.key === "string" &&
    typeof value.title === "string" &&
    typeof value.indexTitle === "string" &&
    isDenseArrayOf(value.nodePath, isString) &&
    isDenseArrayOf(
      value.addressTypes,
      (item): item is RefAddressType => item === "integer" || item === "talmud",
    ) &&
    isDenseArrayOf(value.sectionNames, isString)
  );
}

function validateCatalog(index: BookIndex): RefDataErrorCode | undefined {
  if (catalogValidationCache.has(index)) {
    return catalogValidationCache.get(index);
  }

  if (!Object.values(index.aliases).every(isString)) {
    catalogValidationCache.set(index, "inconsistent-data");
    return "inconsistent-data";
  }

  for (const [key, value] of Object.entries(index.nodes)) {
    if (
      !isBookIndexNode(value) ||
      value.key !== key ||
      !Object.hasOwn(index.aliases, value.title) ||
      index.aliases[value.title] !== key
    ) {
      catalogValidationCache.set(index, "inconsistent-data");
      return "inconsistent-data";
    }
  }

  catalogValidationCache.set(index, undefined);
  return undefined;
}

/**
 * Converts a Talmud page label to the zero-based position used by Sefaria web
 * and mobile helpers.
 *
 * Parsed refs add one to this value because server reference coordinates are
 * one-based.
 */
export function dafToInt(daf: string): number | RefError {
  const match = /^(\d+)([ab])$/.exec(daf);
  if (!match) {
    return refError(daf, "invalid-daf");
  }

  const page = Number(match[1]);
  if (!Number.isSafeInteger(page) || page < 1) {
    return refError(daf, "invalid-daf");
  }

  const position = (page - 1) * 2 + (match[2] === "b" ? 1 : 0);
  return Number.isSafeInteger(position)
    ? position
    : refError(daf, "invalid-daf");
}

function labelToPosition(
  label: string,
  addressType: RefAddressType,
  input: string,
): number | RefError {
  if (addressType === "talmud") {
    const position = dafToInt(label);
    if (typeof position !== "number") {
      return refError(input, "invalid-daf");
    }

    const oneBasedPosition = position + 1;
    return Number.isSafeInteger(oneBasedPosition)
      ? oneBasedPosition
      : refError(input, "invalid-daf");
  }

  if (!/^\d+$/.test(label)) {
    return refError(input, "malformed-sections");
  }

  const position = Number(label);
  return Number.isSafeInteger(position) && position > 0
    ? position
    : refError(input, "malformed-sections");
}

/** Formats one-based coordinates for a configured address system. */
export function positionToLabel(
  position: number,
  addressType: RefAddressType,
): string {
  if (addressType === "integer") {
    return String(position);
  }

  const zeroBased = position - 1;
  const page = Math.floor(zeroBased / 2) + 1;
  return `${page}${zeroBased % 2 === 0 ? "a" : "b"}`;
}

function parseAddress(
  value: string,
  addressTypes: readonly RefAddressType[],
  input: string,
): ParsedAddress | RefError {
  if (value.length === 0) {
    return { labels: [], positions: [] };
  }

  if (/^[.:]|[.:]$|[.:]\s*[.:]/.test(value)) {
    return refError(input, "malformed-sections");
  }

  const rawLabels = value.split(/[.:\s]+/);
  if (rawLabels.some((label) => label.length === 0)) {
    return refError(input, "malformed-sections");
  }

  if (rawLabels.length > addressTypes.length) {
    return refError(input, "unsupported-structure");
  }

  const labels: string[] = [];
  const positions: number[] = [];

  for (const [index, rawLabel] of rawLabels.entries()) {
    const addressType = addressTypes[index]!;
    const position = labelToPosition(rawLabel, addressType, input);
    if (typeof position !== "number") {
      return position;
    }

    labels.push(positionToLabel(position, addressType));
    positions.push(position);
  }

  return { labels, positions };
}

function validateNode(
  node: BookIndexNode,
  index: BookIndex,
  input: string,
): RefDataError | undefined {
  if (
    node.key.length === 0 ||
    node.title.length === 0 ||
    node.indexTitle.length === 0 ||
    node.nodePath.length === 0 ||
    node.nodePath.at(-1) !== node.key ||
    node.addressTypes.length !== node.sectionNames.length
  ) {
    return dataError(input, "inconsistent-data");
  }

  for (const key of node.nodePath) {
    if (!Object.hasOwn(index.nodes, key)) {
      return dataError(input, "missing-hierarchy");
    }

    const ancestor = index.nodes[key];
    if (!isBookIndexNode(ancestor) || ancestor.key !== key) {
      return dataError(input, "inconsistent-data");
    }
  }

  return undefined;
}

function normalizeInput(input: string): string | RefError {
  // Mirrors the web parser's decoding, underscore handling, whitespace
  // normalization, and first-letter capitalization without its global cache.
  let decoded: string;
  try {
    decoded = decodeURIComponent(input);
  } catch {
    return refError(input, "malformed-reference");
  }

  const normalized = decoded.replaceAll("_", " ").trim().replace(/\s+/g, " ");
  if (normalized.length === 0) {
    return refError(input, "malformed-reference");
  }

  return `${normalized[0]!.toUpperCase()}${normalized.slice(1)}`;
}

function parseSheet(input: string, normalized: string): ParsedRef | RefError {
  // The web parser treats Sheet as a virtual book. This package ports only its
  // reference grammar, not sheet loading or rendering.
  const match = /^Sheet(?:\s+|[.:])(\d+)$/.exec(normalized);
  if (!match) {
    return refError(input, "malformed-sections");
  }

  const position = Number(match[1]);
  if (!Number.isSafeInteger(position) || position < 1) {
    return refError(input, "malformed-sections");
  }

  return {
    book: "Sheet",
    index: "Sheet",
    nodeKey: "sheet",
    nodePath: ["sheet"],
    addressTypes: ["integer"],
    sections: [String(position)],
    toSections: [String(position)],
    sectionPositions: [position],
    toSectionPositions: [position],
  };
}

function findAlias(
  normalized: string,
  index: BookIndex,
): { alias: string; nodeKey: string } | undefined {
  // This is the web/mobile longest-title-prefix algorithm expressed as direct
  // lookups instead of a per-parse sort of the full catalog.
  for (let length = normalized.length; length > 0; length -= 1) {
    const boundary = normalized[length];
    if (boundary !== undefined && boundary !== " " && boundary !== ".") {
      continue;
    }

    const alias = normalized.slice(0, length);
    if (Object.hasOwn(index.aliases, alias)) {
      return { alias, nodeKey: index.aliases[alias]! };
    }
  }

  return undefined;
}

function parseRange(
  value: string,
  addressTypes: readonly RefAddressType[],
  input: string,
):
  | {
      readonly sections: readonly string[];
      readonly toSections: readonly string[];
      readonly sectionPositions: readonly number[];
      readonly toSectionPositions: readonly number[];
    }
  | RefError {
  // Port of the web parser's abbreviated range-end rule: missing leading
  // levels come from the start ref (Genesis 1:1-3 => Genesis 1:1-1:3).
  const parts = value.split("-");
  if (parts.length > 2) {
    return refError(input, "invalid-range");
  }

  const start = parseAddress(parts[0]!.trim(), addressTypes, input);
  if ("type" in start) {
    return start;
  }

  if (parts.length === 1) {
    return {
      sections: start.labels,
      toSections: [...start.labels],
      sectionPositions: start.positions,
      toSectionPositions: [...start.positions],
    };
  }

  const endValue = parts[1]!.trim();
  const endLabelCount =
    endValue.length === 0 ? 0 : endValue.split(/[.:\s]+/).length;
  if (
    start.labels.length === 0 ||
    endLabelCount === 0 ||
    endLabelCount > start.labels.length
  ) {
    return refError(input, "invalid-range");
  }

  const prefixLength = start.labels.length - endLabelCount;
  const end = parseAddress(
    endValue,
    addressTypes.slice(prefixLength, start.labels.length),
    input,
  );
  if ("type" in end) {
    return end;
  }

  const toSections = [...start.labels.slice(0, prefixLength), ...end.labels];
  const toSectionPositions = [
    ...start.positions.slice(0, prefixLength),
    ...end.positions,
  ];

  if (comparePositions(start.positions, toSectionPositions) > 0) {
    return refError(input, "invalid-range");
  }

  return {
    sections: start.labels,
    toSections,
    sectionPositions: start.positions,
    toSectionPositions,
  };
}

/**
 * Parses a local Sefaria reference against caller-supplied immutable metadata.
 *
 * Unlike Sefaria web, this function reads no process-global catalog and makes
 * no network request. Invalid input and missing catalog data remain distinct.
 */
export function parseRef(
  ref: string,
  index: BookIndex,
): ParsedRef | RefError | RefDataError {
  const normalized = normalizeInput(ref);
  if (typeof normalized !== "string") {
    return normalized;
  }

  if (/^Sheet(?:$|[\s.:])/.test(normalized)) {
    return parseSheet(ref, normalized);
  }

  if (!hasBookIndexShape(index)) {
    return dataError(ref, "inconsistent-data");
  }

  const catalogError = validateCatalog(index);
  if (catalogError) {
    return dataError(ref, catalogError);
  }

  const match = findAlias(normalized, index);
  if (!match) {
    return refError(ref, "unknown-book");
  }

  if (!Object.hasOwn(index.nodes, match.nodeKey)) {
    return dataError(ref, "missing-book-metadata");
  }
  const node = index.nodes[match.nodeKey];

  if (!isBookIndexNode(node) || node.key !== match.nodeKey) {
    return dataError(ref, "inconsistent-data");
  }

  const nodeError = validateNode(node, index, ref);
  if (nodeError) {
    return nodeError;
  }

  const suffix = normalized.slice(match.alias.length);
  const address = suffix.length === 0 ? "" : suffix.slice(1);
  if (suffix.length > 0 && address.length === 0) {
    return refError(ref, "malformed-sections");
  }

  const range = parseRange(address, node.addressTypes, ref);
  if ("type" in range) {
    return range;
  }

  return {
    book: node.title,
    index: node.indexTitle,
    nodeKey: node.key,
    nodePath: [...node.nodePath],
    addressTypes: [...node.addressTypes],
    ...range,
  };
}
