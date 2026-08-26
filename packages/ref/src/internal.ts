import type {
  ParsedRef,
  RefError,
  RefInvalidInputCode,
  RefLocalDataCode,
  RefRemoteRequiredCode,
} from "./types.js";

export function inputError(input: string, code: RefInvalidInputCode): RefError {
  return { type: "ref-error", kind: "invalid-input", code, input };
}

export function localDataError(
  input: string,
  code: RefLocalDataCode,
): RefError {
  return { type: "ref-error", kind: "local-data", code, input };
}

export function remoteRequiredError(
  input: string,
  code: RefRemoteRequiredCode,
): RefError {
  return { type: "ref-error", kind: "remote-required", code, input };
}

export function isRefFailure(value: ParsedRef | RefError): value is RefError {
  return "type" in value;
}

/** Lexicographically compares hierarchical one-based coordinates. */
export function comparePositions(
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

export function arraysEqual<T>(
  left: readonly T[],
  right: readonly T[],
): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

export function isPrefix<T>(
  prefix: readonly T[],
  value: readonly T[],
): boolean {
  return (
    prefix.length <= value.length &&
    prefix.every((item, index) => item === value[index])
  );
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Rejects sparse arrays as well as elements of the wrong runtime type. */
export function isDenseArrayOf<T>(
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

export function isString(value: unknown): value is string {
  return typeof value === "string";
}

export function isPositiveSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}
