export interface CompatibilityCase {
  ref: string;
  category: string;
}

export interface CompatibilityContext {
  startPosition: number;
  expectedCodePoints: string[];
  actualCodePoints: string[];
}

export interface CompatibilityDifference {
  position: number;
  expectedCodePoint: string;
  actualCodePoint: string;
  context: CompatibilityContext;
}

export type CompatibilityResult =
  | {
      status: "passed";
      normalization: "none";
      indexing: "code-point";
    }
  | {
      status: "failed";
      normalization: "none";
      indexing: "code-point";
      differenceCount: number;
      truncated: boolean;
      firstDifference: CompatibilityDifference;
      differences: CompatibilityDifference[];
    }
  | { status: "unavailable"; reason: string };

export interface CompareTextOptions {
  maxDifferences?: number;
  contextRadius?: number;
}

export type CompatibilityCaseResult =
  | {
      id: string;
      category: string;
      status: "passed";
    }
  | {
      id: string;
      category: string;
      status: "failed" | "unavailable" | "intentional-difference";
      message: string;
    };

export interface CompatibilitySummary {
  exitCode: 0 | 1;
  counts: {
    passed: number;
    failed: number;
    unavailable: number;
    intentionalDifference: number;
  };
  lines: string[];
}

function codePoint(value: string | undefined): string {
  if (value === undefined) {
    return "<end>";
  }

  return `U+${value.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")}`;
}

function assertPositiveInteger(value: number, name: string): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new RangeError(`${name} must be a positive integer`);
  }
}

function assertNonnegativeInteger(value: number, name: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a nonnegative integer`);
  }
}

function contextAt(
  expected: readonly string[],
  actual: readonly string[],
  position: number,
  radius: number,
): CompatibilityContext {
  const startPosition = Math.max(0, position - radius);
  const endPosition = Math.min(
    Math.max(expected.length, actual.length),
    position + radius + 1,
  );
  const expectedCodePoints: string[] = [];
  const actualCodePoints: string[] = [];

  for (let index = startPosition; index < endPosition; index += 1) {
    expectedCodePoints.push(codePoint(expected[index]));
    actualCodePoints.push(codePoint(actual[index]));
  }

  return {
    startPosition,
    expectedCodePoints,
    actualCodePoints,
  };
}

export function compareText(
  expected: string,
  actual: string,
  options: CompareTextOptions = {},
): CompatibilityResult {
  const maxDifferences = options.maxDifferences ?? 20;
  const contextRadius = options.contextRadius ?? 2;
  assertPositiveInteger(maxDifferences, "maxDifferences");
  assertNonnegativeInteger(contextRadius, "contextRadius");

  const expectedCharacters = Array.from(expected);
  const actualCharacters = Array.from(actual);
  const differences: CompatibilityDifference[] = [];
  let differenceCount = 0;
  let firstDifference: CompatibilityDifference | undefined;

  for (
    let position = 0;
    position < Math.max(expectedCharacters.length, actualCharacters.length);
    position += 1
  ) {
    const expectedCharacter = expectedCharacters[position];
    const actualCharacter = actualCharacters[position];

    if (expectedCharacter !== actualCharacter) {
      differenceCount += 1;
      const difference = {
        position,
        expectedCodePoint: codePoint(expectedCharacter),
        actualCodePoint: codePoint(actualCharacter),
        context: contextAt(
          expectedCharacters,
          actualCharacters,
          position,
          contextRadius,
        ),
      };
      firstDifference ??= difference;
      if (differences.length < maxDifferences) {
        differences.push(difference);
      }
    }
  }

  return firstDifference === undefined
    ? {
        status: "passed",
        normalization: "none",
        indexing: "code-point",
      }
    : {
        status: "failed",
        normalization: "none",
        indexing: "code-point",
        differenceCount,
        truncated: differenceCount > differences.length,
        firstDifference,
        differences,
      };
}

export function summarizeCompatibility(
  results: readonly CompatibilityCaseResult[],
): CompatibilitySummary {
  const counts = {
    passed: 0,
    failed: 0,
    unavailable: 0,
    intentionalDifference: 0,
  };
  const detailLines: string[] = [];

  for (const result of results) {
    if (result.status === "passed") {
      counts.passed += 1;
      continue;
    }

    if (result.status === "failed") {
      counts.failed += 1;
    } else if (result.status === "unavailable") {
      counts.unavailable += 1;
    } else {
      counts.intentionalDifference += 1;
    }
    detailLines.push(
      `[${result.status}] ${result.category}/${result.id}: ${result.message}`,
    );
  }

  return {
    exitCode: counts.failed === 0 ? 0 : 1,
    counts,
    lines: [
      `passed=${counts.passed} failed=${counts.failed} unavailable=${counts.unavailable} intentional-difference=${counts.intentionalDifference}`,
      ...detailLines,
    ],
  };
}
