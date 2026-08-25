import { makeHumanRef } from "./format.js";
import {
  arraysEqual,
  comparePositions,
  dataError,
  isDenseArrayOf,
  isPositiveSafeInteger,
  isPrefix,
  isRecord,
  isRefFailure,
  refError,
} from "./internal.js";
import { parseRef, positionToLabel } from "./parser.js";
import type {
  BookIndex,
  ParsedRef,
  RangeTopology,
  RangeTopologyEntry,
  RefDataError,
  RefError,
} from "./types.js";

const MAX_RANGE_EXPANSION = 10_000;

/**
 * Returns the section-level ref for a local reference.
 *
 * Sefaria web prefers cached API data and falls back to string slicing. This
 * implementation derives the result from schema depth, including complex and
 * spanning refs.
 */
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

/**
 * Tests bounded structural containment using schema ancestry and coordinates.
 *
 * Sefaria web contains an apparent self-comparison bug, while Python `Ref` can
 * use database-backed text extent. This local operation deliberately does not
 * claim extensional equality that requires text topology.
 */
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

/**
 * Validates caller-asserted complete topology and returns parsed entries so the
 * split operation does not repeat reference parsing.
 */
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

/**
 * Splits a local range while preserving its addressed depth.
 *
 * Same-parent arithmetic follows Sefaria web. For spanning refs, web returns
 * only the first non-spanning part when cached text is absent; this portable
 * operation requires complete topology and never returns partial data.
 */
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
