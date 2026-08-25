export type RefAddressType = "integer" | "talmud";

export interface BookIndexNode {
  readonly key: string;
  readonly title: string;
  readonly indexTitle: string;
  readonly nodePath: readonly string[];
  readonly addressTypes: readonly RefAddressType[];
  readonly sectionNames: readonly string[];
}

export interface BookIndex {
  readonly aliases: Readonly<Record<string, string>>;
  readonly nodes: Readonly<Record<string, BookIndexNode>>;
}

export interface RangeTopologyEntry {
  readonly ref: string;
  readonly positions: readonly number[];
}

export interface RangeTopology {
  readonly nodeKey: string;
  readonly depth: number;
  readonly coverageStart: readonly number[];
  readonly coverageEnd: readonly number[];
  readonly refs: readonly RangeTopologyEntry[];
}

export interface ParsedRef {
  readonly book: string;
  readonly index: string;
  readonly nodeKey: string;
  readonly nodePath: readonly string[];
  readonly addressTypes: readonly RefAddressType[];
  readonly sections: readonly string[];
  readonly toSections: readonly string[];
  readonly sectionPositions: readonly number[];
  readonly toSectionPositions: readonly number[];
}

export type RefErrorCode =
  | "unknown-book"
  | "malformed-reference"
  | "malformed-sections"
  | "unsupported-structure"
  | "invalid-range"
  | "range-too-large"
  | "invalid-daf";

export interface RefError {
  readonly type: "invalid-ref";
  readonly code: RefErrorCode;
  readonly input: string;
}

export type RefDataErrorCode =
  | "missing-book-metadata"
  | "missing-hierarchy"
  | "missing-range-topology"
  | "inconsistent-data";

export interface RefDataError {
  readonly type: "ref-data";
  readonly code: RefDataErrorCode;
  readonly input: string;
}

type RefFailure = RefError | RefDataError;

interface ParsedAddress {
  readonly labels: readonly string[];
  readonly positions: readonly number[];
}

const MAX_RANGE_EXPANSION = 10_000;
const catalogValidationCache = new WeakMap<
  object,
  RefDataErrorCode | undefined
>();

function refError(input: string, code: RefErrorCode): RefError {
  return { type: "invalid-ref", code, input };
}

function dataError(input: string, code: RefDataErrorCode): RefDataError {
  return { type: "ref-data", code, input };
}

function isRefFailure(value: ParsedRef | RefFailure): value is RefFailure {
  return "type" in value;
}

function comparePositions(
  left: readonly number[],
  right: readonly number[],
): number {
  for (let index = 0; index < Math.min(left.length, right.length); index += 1) {
    const difference = left[index]! - right[index]!;
    if (difference !== 0) {
      return difference;
    }
  }

  return left.length - right.length;
}

function arraysEqual<T>(left: readonly T[], right: readonly T[]): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function isPrefix<T>(prefix: readonly T[], value: readonly T[]): boolean {
  return (
    prefix.length <= value.length &&
    prefix.every((item, index) => item === value[index])
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDenseArrayOf<T>(
  value: unknown,
  predicate: (item: unknown) => item is T,
): value is T[] {
  if (!Array.isArray(value)) {
    return false;
  }

  for (let index = 0; index < value.length; index += 1) {
    if (!Object.hasOwn(value, index) || !predicate(value[index])) {
      return false;
    }
  }

  return true;
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isPositiveSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

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

function positionToLabel(
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
      sections: readonly string[];
      toSections: readonly string[];
      sectionPositions: readonly number[];
      toSectionPositions: readonly number[];
    }
  | RefError {
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

function firstDifference(
  sections: readonly string[],
  toSections: readonly string[],
): number {
  const difference = sections.findIndex(
    (section, index) => section !== toSections[index],
  );
  return difference === -1 ? sections.length : difference;
}

function formatRange(
  sections: readonly string[],
  toSections: readonly string[],
  separator: string,
): string {
  if (sections.length === 0) {
    return "";
  }

  let address = sections.join(separator);
  if (!arraysEqual(sections, toSections)) {
    address += `-${toSections
      .slice(firstDifference(sections, toSections))
      .join(separator)}`;
  }

  return address;
}

export function makeRef(parsed: ParsedRef): string {
  const book = encodeURIComponent(parsed.book.replaceAll(" ", "_"));
  const address = formatRange(parsed.sections, parsed.toSections, ".");
  return address.length > 0 ? `${book}.${address}` : book;
}

function makeHumanRef(parsed: ParsedRef): string {
  const address = formatRange(parsed.sections, parsed.toSections, ":");
  return address.length > 0 ? `${parsed.book} ${address}` : parsed.book;
}

export function normRef(
  ref: string,
  index: BookIndex,
): string | RefError | RefDataError {
  const parsed = parseRef(ref, index);
  return isRefFailure(parsed) ? parsed : makeRef(parsed);
}

export function humanRef(
  ref: string,
  index: BookIndex,
): string | RefError | RefDataError {
  const parsed = parseRef(ref, index);
  return isRefFailure(parsed) ? parsed : makeHumanRef(parsed);
}

export function sectionRef(
  ref: string,
  index: BookIndex,
): string | RefError | RefDataError {
  const parsed = parseRef(ref, index);
  if (isRefFailure(parsed)) {
    return parsed;
  }

  const sectionDepth = Math.max(0, parsed.addressTypes.length - 1);
  if (parsed.sections.length <= sectionDepth) {
    return makeHumanRef(parsed);
  }

  return makeHumanRef({
    ...parsed,
    sections: parsed.sections.slice(0, sectionDepth),
    toSections: parsed.toSections.slice(0, sectionDepth),
    sectionPositions: parsed.sectionPositions.slice(0, sectionDepth),
    toSectionPositions: parsed.toSectionPositions.slice(0, sectionDepth),
  });
}

export function refContains(
  outer: string,
  inner: string,
  index: BookIndex,
): boolean | RefError | RefDataError {
  const outerRef = parseRef(outer, index);
  if (isRefFailure(outerRef)) {
    return outerRef;
  }

  const innerRef = parseRef(inner, index);
  if (isRefFailure(innerRef)) {
    return innerRef;
  }

  if (!isPrefix(outerRef.nodePath, innerRef.nodePath)) {
    return false;
  }

  if (outerRef.nodeKey !== innerRef.nodeKey) {
    return outerRef.sectionPositions.length === 0;
  }

  const depth = outerRef.sectionPositions.length;
  if (innerRef.sectionPositions.length < depth) {
    return false;
  }

  return (
    comparePositions(
      outerRef.sectionPositions,
      innerRef.sectionPositions.slice(0, depth),
    ) <= 0 &&
    comparePositions(
      outerRef.toSectionPositions,
      innerRef.toSectionPositions.slice(0, depth),
    ) >= 0
  );
}

function isRangeTopology(value: unknown): value is RangeTopology {
  return (
    isRecord(value) &&
    typeof value.nodeKey === "string" &&
    isPositiveSafeInteger(value.depth) &&
    isDenseArrayOf(value.coverageStart, isPositiveSafeInteger) &&
    isDenseArrayOf(value.coverageEnd, isPositiveSafeInteger) &&
    isDenseArrayOf(
      value.refs,
      (entry): entry is RangeTopologyEntry =>
        isRecord(entry) &&
        typeof entry.ref === "string" &&
        isDenseArrayOf(entry.positions, isPositiveSafeInteger),
    )
  );
}

function validateTopology(
  topology: RangeTopology,
  parsed: ParsedRef,
  index: BookIndex,
): readonly ParsedRef[] | undefined {
  if (
    topology.nodeKey !== parsed.nodeKey ||
    topology.depth !== parsed.sectionPositions.length ||
    topology.coverageStart.length !== topology.depth ||
    topology.coverageEnd.length !== topology.depth ||
    comparePositions(topology.coverageStart, topology.coverageEnd) > 0
  ) {
    return undefined;
  }

  const parsedEntries: ParsedRef[] = [];
  let previous: readonly number[] | undefined;
  for (const entry of topology.refs) {
    const entryRef = parseRef(entry.ref, index);
    if (
      entry.positions.length !== topology.depth ||
      comparePositions(entry.positions, topology.coverageStart) < 0 ||
      comparePositions(entry.positions, topology.coverageEnd) > 0 ||
      (previous && comparePositions(previous, entry.positions) >= 0) ||
      isRefFailure(entryRef) ||
      entryRef.nodeKey !== topology.nodeKey ||
      !arraysEqual(entryRef.sectionPositions, entry.positions) ||
      !arraysEqual(entryRef.toSectionPositions, entry.positions)
    ) {
      return undefined;
    }
    parsedEntries.push(entryRef);
    previous = entry.positions;
  }

  return parsedEntries;
}

function expandArithmeticRange(
  parsed: ParsedRef,
  input: string,
): readonly string[] | RefError {
  const depth = parsed.sectionPositions.length;
  const addressType = parsed.addressTypes[depth - 1]!;
  const refs: string[] = [];
  const start = parsed.sectionPositions[depth - 1]!;
  const end = parsed.toSectionPositions[depth - 1]!;
  const count = end - start + 1;

  if (
    !Number.isSafeInteger(count) ||
    count < 1 ||
    count > MAX_RANGE_EXPANSION
  ) {
    return refError(input, "range-too-large");
  }

  for (let position = start; position <= end; position += 1) {
    const label = positionToLabel(position, addressType);
    refs.push(
      makeHumanRef({
        ...parsed,
        sections: [...parsed.sections.slice(0, -1), label],
        toSections: [...parsed.sections.slice(0, -1), label],
        sectionPositions: [...parsed.sectionPositions.slice(0, -1), position],
        toSectionPositions: [...parsed.sectionPositions.slice(0, -1), position],
      }),
    );
  }

  return refs;
}

export function splitRangingRef(
  ref: string,
  index: BookIndex,
  topology?: RangeTopology,
): readonly string[] | RefError | RefDataError {
  const parsed = parseRef(ref, index);
  if (isRefFailure(parsed)) {
    return parsed;
  }

  if (arraysEqual(parsed.sectionPositions, parsed.toSectionPositions)) {
    return [makeHumanRef(parsed)];
  }

  const prefixLength = parsed.sectionPositions.length - 1;
  if (
    prefixLength === 0 ||
    arraysEqual(
      parsed.sectionPositions.slice(0, prefixLength),
      parsed.toSectionPositions.slice(0, prefixLength),
    )
  ) {
    return expandArithmeticRange(parsed, ref);
  }

  if (!topology) {
    return dataError(ref, "missing-range-topology");
  }

  if (!isRangeTopology(topology)) {
    return dataError(ref, "inconsistent-data");
  }

  const topologyEntries = validateTopology(topology, parsed, index);
  if (!topologyEntries) {
    return dataError(ref, "inconsistent-data");
  }

  if (
    comparePositions(topology.coverageStart, parsed.sectionPositions) > 0 ||
    comparePositions(topology.coverageEnd, parsed.toSectionPositions) < 0
  ) {
    return dataError(ref, "missing-range-topology");
  }

  const refs = topologyEntries
    .filter(
      (entry) =>
        comparePositions(entry.sectionPositions, parsed.sectionPositions) >=
          0 &&
        comparePositions(entry.sectionPositions, parsed.toSectionPositions) <=
          0,
    )
    .map(makeHumanRef);

  return refs.length <= MAX_RANGE_EXPANSION
    ? refs
    : refError(ref, "range-too-large");
}
