import { humanRef } from "./format.js";
import {
  arraysEqual,
  comparePositions,
  inputError,
  isPrefix,
  remoteRequiredError,
} from "./internal.js";
import { positionToLabel } from "./parser.js";
import type { ParsedRef, RefError } from "./types.js";

const MAX_RANGE_EXPANSION = 10_000;

/**
 * Returns the structured section-level ref.
 *
 * Sefaria Web prefers cached API data and falls back to string slicing. This
 * implementation derives the result from the schema depth stored in the
 * validated ref.
 */
export function sectionRef(parsed: ParsedRef): ParsedRef {
  const sectionDepth = Math.max(0, parsed.addressTypes.length - 1);
  if (parsed.sections.length <= sectionDepth) {
    return parsed;
  }

  return {
    ...parsed,
    sections: parsed.sections.slice(0, sectionDepth),
    toSections: parsed.toSections.slice(0, sectionDepth),
    sectionPositions: parsed.sectionPositions.slice(0, sectionDepth),
    toSectionPositions: parsed.toSectionPositions.slice(0, sectionDepth),
  };
}

/**
 * Tests bounded structural containment using schema ancestry and coordinates.
 *
 * This operation does not claim Python `Ref`'s database-backed equality
 * between a section and its complete segment range.
 */
export function refContains(outer: ParsedRef, inner: ParsedRef): boolean {
  if (outer.index !== inner.index) {
    return false;
  }

  if (!isPrefix(outer.nodePath, inner.nodePath)) {
    return false;
  }

  if (outer.nodeKey !== inner.nodeKey) {
    return outer.sectionPositions.length === 0;
  }

  const depth = outer.sectionPositions.length;
  if (inner.sectionPositions.length < depth) {
    return false;
  }

  return (
    comparePositions(
      outer.sectionPositions,
      inner.sectionPositions.slice(0, depth),
    ) <= 0 &&
    comparePositions(
      outer.toSectionPositions,
      inner.toSectionPositions.slice(0, depth),
    ) >= 0
  );
}

function expandArithmeticRange(
  parsed: ParsedRef,
): readonly ParsedRef[] | RefError {
  const depth = parsed.sectionPositions.length;
  const addressType = parsed.addressTypes[depth - 1]!;
  const start = parsed.sectionPositions[depth - 1]!;
  const end = parsed.toSectionPositions[depth - 1]!;
  const count = end - start + 1;

  if (
    !Number.isSafeInteger(count) ||
    count < 1 ||
    count > MAX_RANGE_EXPANSION
  ) {
    return inputError(humanRef(parsed), "range-too-large");
  }

  const refs: ParsedRef[] = [];
  for (let position = start; position <= end; position += 1) {
    const label = positionToLabel(position, addressType);
    refs.push({
      ...parsed,
      sections: [...parsed.sections.slice(0, -1), label],
      toSections: [...parsed.sections.slice(0, -1), label],
      sectionPositions: [...parsed.sectionPositions.slice(0, -1), position],
      toSectionPositions: [...parsed.sectionPositions.slice(0, -1), position],
    });
  }

  return refs;
}

/**
 * Splits ranges whose members are decidable from their endpoints alone.
 *
 * Cross-parent terminal ranges require Sefaria shape data and return
 * `remote-shape-required`; `@sefaria/client.expandRef()` owns that operation.
 */
export function splitLocalRange(
  parsed: ParsedRef,
): readonly ParsedRef[] | RefError {
  if (arraysEqual(parsed.sectionPositions, parsed.toSectionPositions)) {
    return [parsed];
  }

  const prefixLength = parsed.sectionPositions.length - 1;
  if (
    prefixLength === 0 ||
    arraysEqual(
      parsed.sectionPositions.slice(0, prefixLength),
      parsed.toSectionPositions.slice(0, prefixLength),
    )
  ) {
    return expandArithmeticRange(parsed);
  }

  return remoteRequiredError(humanRef(parsed), "remote-shape-required");
}
