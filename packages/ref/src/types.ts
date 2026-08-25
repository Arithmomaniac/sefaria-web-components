/** Address systems supported by the local parser. */
export type RefAddressType = "integer" | "talmud";

/** Flattened schema metadata for one canonical reference node. */
export interface BookIndexNode {
  /** Stable node key used by aliases and node ancestry. */
  readonly key: string;
  /** Canonical human title for this leaf or node. */
  readonly title: string;
  /** Canonical root index title, which can differ for complex works. */
  readonly indexTitle: string;
  /** Root-to-node key path used for structural containment. */
  readonly nodePath: readonly string[];
  /** Address system for each supported depth. */
  readonly addressTypes: readonly RefAddressType[];
  /** Human name for each supported depth. */
  readonly sectionNames: readonly string[];
}

/**
 * Immutable catalog supplied to every local reference operation.
 *
 * Aliases map accepted input titles to node keys. Every loaded node's canonical
 * title must also occur in `aliases` and map back to that node.
 */
export interface BookIndex {
  readonly aliases: Readonly<Record<string, string>>;
  readonly nodes: Readonly<Record<string, BookIndexNode>>;
}

/** One existing ref and its one-based coordinates within a complete topology. */
export interface RangeTopologyEntry {
  readonly ref: string;
  readonly positions: readonly number[];
}

/**
 * Complete ordered knowledge for a bounded range on one schema node.
 *
 * Entries may be sparse because nonexistent positions are omitted. The caller
 * is responsible for asserting that the declared coverage is complete.
 */
export interface RangeTopology {
  readonly nodeKey: string;
  readonly depth: number;
  readonly coverageStart: readonly number[];
  readonly coverageEnd: readonly number[];
  readonly refs: readonly RangeTopologyEntry[];
}

/**
 * A validated local reference.
 *
 * `sections` preserve display labels such as `2a`; the position arrays use
 * one-based coordinates compatible with server reference responses.
 */
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

/** Expected invalid-input categories. */
export type RefErrorCode =
  | "unknown-book"
  | "malformed-reference"
  | "malformed-sections"
  | "unsupported-structure"
  | "invalid-range"
  | "range-too-large"
  | "invalid-daf";

/** Invalid user input; callers should not retry without changing the ref. */
export interface RefError {
  readonly type: "invalid-ref";
  readonly code: RefErrorCode;
  readonly input: string;
}

/** Missing or inconsistent caller-supplied data categories. */
export type RefDataErrorCode =
  | "missing-book-metadata"
  | "missing-hierarchy"
  | "missing-range-topology"
  | "inconsistent-data";

/** A valid operation that cannot proceed with the supplied catalog or topology. */
export interface RefDataError {
  readonly type: "ref-data";
  readonly code: RefDataErrorCode;
  readonly input: string;
}

/** Failure returned by any fallible local reference operation. */
export type RefFailure = RefError | RefDataError;
