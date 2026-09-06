import type { CoreV3TextsResponse, CoreV3TextValue } from "@sefaria/client";
import type { SourceCardNavigation } from "./source-card.js";

interface Addresses {
  readonly navigation: SourceCardNavigation;
  readonly refAt: (position: readonly number[]) => string | undefined;
  readonly labelAt: (position: readonly number[]) => string | undefined;
}

const INTEGER_ADDRESS_TYPES = new Set([
  "Integer",
  "Year",
  "Aliyah",
  "Perek",
  "Pasuk",
  "Mishnah",
  "Volume",
  "Siman",
  "Halakhah",
  "Seif",
  "SeifKatan",
  "Section",
]);

/** Resolves only the source-card address shapes qualified by its contract. */
export function sourceCardAddresses(
  payload: CoreV3TextsResponse,
  texts: readonly (CoreV3TextValue | undefined)[],
): Addresses {
  const unavailable = (
    message: string,
    paths?: readonly (readonly (string | number)[])[],
  ): Addresses => ({
    navigation: {
      state: "unavailable",
      message,
      ...(paths === undefined ? {} : { paths }),
    },
    refAt: () => undefined,
    labelAt: () => undefined,
  });
  if (payload.isSpanning) {
    const contextRef = payload.spanningRefs?.find(
      (ref) => ref.trim().length > 0,
    );
    return contextRef === undefined
      ? unavailable(
          "Selection requires a server-provided first spanning section.",
        )
      : {
          navigation: { state: "context-required", contextRef },
          refAt: () => undefined,
          labelAt: () => undefined,
        };
  }
  const depth = payload.textDepth;
  if (
    depth === null ||
    !Number.isSafeInteger(depth) ||
    depth < 1 ||
    !INTEGER_ADDRESS_TYPES.has(payload.addressTypes?.[depth - 1] ?? "") ||
    texts.some((text) => Array.isArray(text) && text.some(Array.isArray))
  ) {
    return unavailable(
      "Selection requires a single section with numbered segments.",
    );
  }
  const section = payload.sections.length === depth - 1;
  const segment = payload.sections.length === depth;
  if (
    (!section && !segment) ||
    payload.toSections.length !== payload.sections.length ||
    payload.sections.some(
      (address, index) =>
        index < depth - 1 && address !== payload.toSections[index],
    )
  ) {
    return unavailable("Selection is unavailable for this reference shape.");
  }
  const scalar = texts.every((text) => !Array.isArray(text));
  if (
    scalar &&
    (!segment || payload.sections[depth - 1] !== payload.toSections[depth - 1])
  ) {
    return unavailable("Text shape does not establish a single segment.");
  }
  let start: number;
  if (section) {
    const key = String(depth);
    let offset: unknown = payload.index_offsets_by_depth?.[key] ?? 0;
    const path: (string | number)[] = ["index_offsets_by_depth", key];
    // Trimmed section offsets may retain singleton enclosing address levels.
    for (
      let level = 0;
      Array.isArray(offset) && offset.length === 1 && level < depth;
      level++
    ) {
      offset = offset[0];
      path.push(0);
    }
    if (
      typeof offset !== "number" ||
      !Number.isSafeInteger(offset) ||
      offset < 0 ||
      offset >= Number.MAX_SAFE_INTEGER
    ) {
      return unavailable(`Invalid segment offset at ${path.join(".")}.`, [
        path,
      ]);
    }
    start = offset + 1;
  } else {
    const label = payload.sections[depth - 1];
    const end = payload.toSections[depth - 1];
    if (
      !label ||
      !end ||
      !/^[1-9]\d*$/.test(label) ||
      !/^[1-9]\d*$/.test(end) ||
      !Number.isSafeInteger(Number(label)) ||
      !Number.isSafeInteger(Number(end)) ||
      Number(end) < Number(label)
    ) {
      return unavailable(
        "Selection requires positive integer segment addresses.",
      );
    }
    start = Number(label);
  }
  const refAt = (position: readonly number[]): string | undefined => {
    if (scalar) return payload.ref;
    const index = position[0];
    if (
      position.length !== 1 ||
      index === undefined ||
      !Number.isSafeInteger(start + index)
    )
      return undefined;
    return `${payload.sectionRef}${depth === 1 ? " " : ":"}${start + index}`;
  };
  const labelAt = (position: readonly number[]): string | undefined => {
    if (scalar) return String(start);
    const index = position[0];
    if (
      position.length !== 1 ||
      index === undefined ||
      !Number.isSafeInteger(start + index)
    )
      return undefined;
    return String(start + index);
  };
  return {
    navigation: {
      state: "available",
      sectionRef: payload.sectionRef,
      firstRef: scalar
        ? payload.ref
        : `${payload.sectionRef}${depth === 1 ? " " : ":"}${start}`,
    },
    refAt,
    labelAt,
  };
}
