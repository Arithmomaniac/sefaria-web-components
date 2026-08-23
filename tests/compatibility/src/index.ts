export interface CompatibilityCase {
  ref: string;
  category: string;
}

export interface CompatibilityDifference {
  position: number;
  expectedCodePoint: string;
  actualCodePoint: string;
}

export type CompatibilityResult =
  | { status: "passed" }
  | { status: "failed"; differences: CompatibilityDifference[] }
  | { status: "unavailable"; reason: string };

function codePoint(value: string | undefined): string {
  if (value === undefined) {
    return "<end>";
  }

  return `U+${value.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")}`;
}

export function compareText(
  expected: string,
  actual: string,
): CompatibilityResult {
  const expectedCharacters = Array.from(expected);
  const actualCharacters = Array.from(actual);
  const differences: CompatibilityDifference[] = [];

  for (
    let position = 0;
    position < Math.max(expectedCharacters.length, actualCharacters.length);
    position += 1
  ) {
    const expectedCharacter = expectedCharacters[position];
    const actualCharacter = actualCharacters[position];

    if (expectedCharacter !== actualCharacter) {
      differences.push({
        position,
        expectedCodePoint: codePoint(expectedCharacter),
        actualCodePoint: codePoint(actualCharacter),
      });
    }
  }

  return differences.length === 0
    ? { status: "passed" }
    : { status: "failed", differences };
}
