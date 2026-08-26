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

export type RefInvalidInputCode =
  | "malformed-reference"
  | "malformed-sections"
  | "invalid-range"
  | "range-too-large"
  | "invalid-daf";

export type RefLocalDataCode =
  | "title-not-loaded"
  | "missing-book-metadata"
  | "missing-hierarchy"
  | "inconsistent-data";

export type RefRemoteRequiredCode =
  "unsupported-local-grammar" | "remote-shape-required";

/**
 * Actionable failure from local reference handling.
 *
 * - `invalid-input`: change the input.
 * - `local-data`: fetch or repair the selected `BookIndex`.
 * - `remote-required`: use an explicit client operation.
 */
export type RefError =
  | {
      readonly type: "ref-error";
      readonly kind: "invalid-input";
      readonly code: RefInvalidInputCode;
      readonly input: string;
    }
  | {
      readonly type: "ref-error";
      readonly kind: "local-data";
      readonly code: RefLocalDataCode;
      readonly input: string;
    }
  | {
      readonly type: "ref-error";
      readonly kind: "remote-required";
      readonly code: RefRemoteRequiredCode;
      readonly input: string;
    };

/** A successful parse result or actionable local failure. */
export type RefResult = ParsedRef | RefError;
