import { arraysEqual, isRefFailure } from "./internal.js";
import { parseRef } from "./parser.js";
import type { BookIndex, ParsedRef, RefDataError, RefError } from "./types.js";

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

/**
 * Formats a validated parsed ref in Sefaria's canonical URL form.
 *
 * This is a direct behavioral port of Sefaria web's `makeRef`: title words use
 * underscores, address levels use periods, and unchanged range prefixes are
 * omitted.
 */
export function makeRef(parsed: ParsedRef): string {
  const book = encodeURIComponent(parsed.book.replaceAll(" ", "_"));
  const address = formatRange(parsed.sections, parsed.toSections, ".");
  return address.length > 0 ? `${book}.${address}` : book;
}

/** Formats a validated parsed ref for human display. */
export function makeHumanRef(parsed: ParsedRef): string {
  const address = formatRange(parsed.sections, parsed.toSections, ":");
  return address.length > 0 ? `${parsed.book} ${address}` : parsed.book;
}

/**
 * Parses and formats a ref in canonical URL form.
 *
 * Sefaria web falls back to replacing spaces when parsing fails. The portable
 * contract returns that typed failure instead of a plausible URL.
 */
export function normRef(
  ref: string,
  index: BookIndex,
): string | RefError | RefDataError {
  const parsed = parseRef(ref, index);
  return isRefFailure(parsed) ? parsed : makeRef(parsed);
}

/**
 * Parses and formats a canonical human-readable ref.
 *
 * `BookIndex` replaces the process-global `booksDict` used by Sefaria web.
 */
export function humanRef(
  ref: string,
  index: BookIndex,
): string | RefError | RefDataError {
  const parsed = parseRef(ref, index);
  return isRefFailure(parsed) ? parsed : makeHumanRef(parsed);
}
