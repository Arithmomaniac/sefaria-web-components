/**
 * Portable extraction of Sefaria reference behavior.
 *
 * Parsing and formatting originate in Sefaria-Project's
 * `static/js/sefaria/sefaria.js` and Sefaria-Mobile's `sefaria.js`. The
 * portable API replaces their process-global title catalog, API caches, and
 * partial fallbacks with caller-supplied immutable data and typed failures.
 * Python `Ref` behavior supplies evidence where both clients are incomplete.
 */
export { humanRef, makeRef, normRef } from "./format.js";
export { refContains, sectionRef, splitLocalRange } from "./operations.js";
export { dafToInt, parseRef } from "./parser.js";
export type {
  BookIndex,
  BookIndexNode,
  ParsedRef,
  RefAddressType,
  RefError,
  RefInvalidInputCode,
  RefLocalDataCode,
  RefRemoteRequiredCode,
  RefResult,
} from "./types.js";
