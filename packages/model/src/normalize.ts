import {
  isModelError,
  isTextDirection,
  type LinkRef,
  type ModelError,
  type ModelResult,
  type Segment,
  type SourceCardData,
  type SourceCardSegment,
  type SourceCardTextBlock,
  type TextDirection,
  type TextResponse,
  type Version,
} from "./types.js";

type Path = readonly (string | number)[];
type UnknownRecord = Record<string, unknown>;

function error(code: ModelError["code"], path: Path): ModelError {
  return { type: "model-error", code, path };
}

function child(path: Path, key: string | number): Path {
  return [...path, key];
}

function record(value: unknown): UnknownRecord | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as UnknownRecord)
    : undefined;
}

function requiredString(
  value: UnknownRecord,
  key: string,
  path: Path,
  allowEmpty = false,
): string | ModelError {
  const fieldPath = child(path, key);
  if (!Object.hasOwn(value, key)) {
    return error("missing-required-field", fieldPath);
  }

  const field = value[key];
  return typeof field === "string" && (allowEmpty || field.length > 0)
    ? field
    : error("invalid-field", fieldPath);
}

function requiredBoolean(
  value: UnknownRecord,
  key: string,
  path: Path,
): boolean | ModelError {
  const fieldPath = child(path, key);
  if (!Object.hasOwn(value, key)) {
    return error("missing-required-field", fieldPath);
  }

  return typeof value[key] === "boolean"
    ? value[key]
    : error("invalid-field", fieldPath);
}

function requiredDirection(
  value: UnknownRecord,
  key: string,
  path: Path,
): TextDirection | ModelError {
  const fieldPath = child(path, key);
  if (!Object.hasOwn(value, key)) {
    return error("missing-required-field", fieldPath);
  }

  return isTextDirection(value[key])
    ? value[key]
    : error("invalid-field", fieldPath);
}

function optionalStrings<const K extends readonly string[]>(
  value: UnknownRecord,
  keys: K,
  path: Path,
): Partial<Record<K[number], string>> | ModelError {
  const result: Partial<Record<K[number], string>> = {};

  for (const key of keys as readonly K[number][]) {
    if (!Object.hasOwn(value, key)) {
      continue;
    }

    const field = value[key];
    if (typeof field !== "string") {
      return error("invalid-field", child(path, key));
    }

    result[key] = field;
  }

  return result;
}

function optionalBooleans<const K extends readonly string[]>(
  value: UnknownRecord,
  keys: K,
  path: Path,
): Partial<Record<K[number], boolean>> | ModelError {
  const result: Partial<Record<K[number], boolean>> = {};

  for (const key of keys as readonly K[number][]) {
    if (!Object.hasOwn(value, key)) {
      continue;
    }

    const field = value[key];
    if (typeof field !== "boolean") {
      return error("invalid-field", child(path, key));
    }

    result[key] = field;
  }

  return result;
}

function stringArray(
  value: UnknownRecord,
  key: string,
  path: Path,
): readonly string[] | ModelError {
  const fieldPath = child(path, key);
  if (!Object.hasOwn(value, key)) {
    return error("missing-required-field", fieldPath);
  }

  const field = value[key];
  if (!Array.isArray(field)) {
    return error("invalid-field", fieldPath);
  }

  for (const [index, item] of field.entries()) {
    if (typeof item !== "string" || item.length === 0) {
      return error("invalid-field", child(fieldPath, index));
    }
  }

  return [...field] as string[];
}

function normalizedArray<T>(
  value: UnknownRecord,
  key: string,
  path: Path,
  normalize: (item: unknown, itemPath: Path) => ModelResult<T>,
): readonly T[] | ModelError {
  const fieldPath = child(path, key);
  if (!Object.hasOwn(value, key)) {
    return error("missing-required-field", fieldPath);
  }

  const field = value[key];
  if (!Array.isArray(field)) {
    return error("invalid-field", fieldPath);
  }

  const result: T[] = [];
  for (const [index, item] of field.entries()) {
    const normalized = normalize(item, child(fieldPath, index));
    if (isModelError(normalized)) {
      return normalized;
    }
    result.push(normalized);
  }

  return result;
}

function normalizeSegmentAt(value: unknown, path: Path): ModelResult<Segment> {
  const candidate = record(value);
  if (!candidate) {
    return error("invalid-field", path);
  }

  const ref = requiredString(candidate, "ref", path);
  if (isModelError(ref)) {
    return ref;
  }
  const text = requiredString(candidate, "text", path, true);
  if (isModelError(text)) {
    return text;
  }
  const lang = requiredString(candidate, "lang", path);
  if (isModelError(lang)) {
    return lang;
  }
  const direction = requiredDirection(candidate, "direction", path);
  if (isModelError(direction)) {
    return direction;
  }
  const versionTitle = requiredString(candidate, "versionTitle", path);
  if (isModelError(versionTitle)) {
    return versionTitle;
  }

  return { ref, text, lang, direction, versionTitle };
}

export function normalizeSegment(value: unknown): ModelResult<Segment> {
  return normalizeSegmentAt(value, []);
}

const VERSION_STRING_KEYS = [
  "actualLanguage",
  "languageFamilyName",
  "license",
  "versionSource",
  "versionUrl",
  "versionNotes",
  "shortVersionTitle",
] as const;

const VERSION_BOOLEAN_KEYS = [
  "isSource",
  "isPrimary",
  "digitizedBySefaria",
  "formatAsPoetry",
  "hasManuallyWrappedRefs",
] as const;

function normalizeVersionAt(value: unknown, path: Path): ModelResult<Version> {
  const candidate = record(value);
  if (!candidate) {
    return error("invalid-field", path);
  }

  const versionTitle = requiredString(candidate, "versionTitle", path);
  if (isModelError(versionTitle)) {
    return versionTitle;
  }
  const language = requiredString(candidate, "language", path);
  if (isModelError(language)) {
    return language;
  }
  const direction = requiredDirection(candidate, "direction", path);
  if (isModelError(direction)) {
    return direction;
  }
  const strings = optionalStrings(candidate, VERSION_STRING_KEYS, path);
  if (isModelError(strings)) {
    return strings;
  }
  const booleans = optionalBooleans(candidate, VERSION_BOOLEAN_KEYS, path);
  if (isModelError(booleans)) {
    return booleans;
  }

  return { versionTitle, language, direction, ...strings, ...booleans };
}

export function normalizeVersion(value: unknown): ModelResult<Version> {
  return normalizeVersionAt(value, []);
}

const LINK_STRING_KEYS = ["heRef", "category", "commentator"] as const;

function normalizeLinkRefAt(value: unknown, path: Path): ModelResult<LinkRef> {
  const candidate = record(value);
  if (!candidate) {
    return error("invalid-field", path);
  }

  const ref = requiredString(candidate, "ref", path);
  const strings = optionalStrings(candidate, LINK_STRING_KEYS, path);
  if (isModelError(ref)) {
    return ref;
  }
  if (isModelError(strings)) {
    return strings;
  }

  let order: number | undefined;
  if (Object.hasOwn(candidate, "order")) {
    if (
      typeof candidate.order !== "number" ||
      !Number.isFinite(candidate.order)
    ) {
      return error("invalid-field", child(path, "order"));
    }
    order = candidate.order;
  }

  let sourceHasEn: boolean | undefined;
  if (Object.hasOwn(candidate, "sourceHasEn")) {
    if (typeof candidate.sourceHasEn !== "boolean") {
      return error("invalid-field", child(path, "sourceHasEn"));
    }
    sourceHasEn = candidate.sourceHasEn;
  }

  return {
    ref,
    ...strings,
    ...(order === undefined ? {} : { order }),
    ...(sourceHasEn === undefined ? {} : { sourceHasEn }),
  };
}

export function normalizeLinkRef(value: unknown): ModelResult<LinkRef> {
  return normalizeLinkRefAt(value, []);
}

const TEXT_RESPONSE_STRING_KEYS = [
  "heRef",
  "sectionRef",
  "next",
  "prev",
] as const;

export function normalizeTextResponse(
  value: unknown,
): ModelResult<TextResponse> {
  const candidate = record(value);
  if (!candidate) {
    return error("invalid-field", []);
  }

  const ref = requiredString(candidate, "ref", []);
  if (isModelError(ref)) {
    return ref;
  }
  const strings = optionalStrings(candidate, TEXT_RESPONSE_STRING_KEYS, []);
  if (isModelError(strings)) {
    return strings;
  }
  const sections = stringArray(candidate, "sections", []);
  if (isModelError(sections)) {
    return sections;
  }
  const toSections = stringArray(candidate, "toSections", []);
  if (isModelError(toSections)) {
    return toSections;
  }
  const isSpanning = requiredBoolean(candidate, "isSpanning", []);
  if (isModelError(isSpanning)) {
    return isSpanning;
  }
  const versions = normalizedArray(
    candidate,
    "versions",
    [],
    normalizeVersionAt,
  );
  if (isModelError(versions)) {
    return versions;
  }
  const versionIdentities = new Map<string, Set<string>>();
  for (let index = 0; index < versions.length; index += 1) {
    const version = versions[index]!;
    const languageVersions =
      versionIdentities.get(version.language) ?? new Set<string>();
    if (languageVersions.has(version.versionTitle)) {
      return error("invalid-field", ["versions", index, "versionTitle"]);
    }
    languageVersions.add(version.versionTitle);
    versionIdentities.set(version.language, languageVersions);
  }
  const segments = normalizedArray(
    candidate,
    "segments",
    [],
    normalizeSegmentAt,
  );
  if (isModelError(segments)) {
    return segments;
  }

  for (const [index, segment] of segments.entries()) {
    const version = versions.find(
      ({ language, versionTitle }) =>
        language === segment.lang && versionTitle === segment.versionTitle,
    );
    if (!version) {
      return error("invalid-field", ["segments", index, "versionTitle"]);
    }
    if (version.direction !== segment.direction) {
      return error("invalid-field", ["segments", index, "direction"]);
    }
  }

  return {
    ref,
    ...strings,
    sections,
    toSections,
    isSpanning,
    versions,
    segments,
  };
}

const SOURCE_CARD_STRING_KEYS = [
  "shortVersionTitle",
  "license",
  "versionSource",
  "versionUrl",
  "versionNotes",
] as const;

function normalizeSourceCardTextBlockAt(
  value: unknown,
  path: Path,
): ModelResult<SourceCardTextBlock> {
  const candidate = record(value);
  if (!candidate) {
    return error("invalid-field", path);
  }

  const content = requiredString(candidate, "content", path, true);
  if (isModelError(content)) {
    return content;
  }
  const language = requiredString(candidate, "language", path);
  if (isModelError(language)) {
    return language;
  }
  const direction = requiredDirection(candidate, "direction", path);
  if (isModelError(direction)) {
    return direction;
  }
  const versionTitle = requiredString(candidate, "versionTitle", path);
  if (isModelError(versionTitle)) {
    return versionTitle;
  }
  const strings = optionalStrings(candidate, SOURCE_CARD_STRING_KEYS, path);
  if (isModelError(strings)) {
    return strings;
  }
  const booleans = optionalBooleans(
    candidate,
    ["digitizedBySefaria"] as const,
    path,
  );
  if (isModelError(booleans)) {
    return booleans;
  }

  return {
    content,
    language,
    direction,
    versionTitle,
    ...strings,
    ...booleans,
  };
}

function normalizeSourceCardSegmentAt(
  value: unknown,
  path: Path,
): ModelResult<SourceCardSegment> {
  const candidate = record(value);
  if (!candidate) {
    return error("invalid-field", path);
  }

  const ref = requiredString(candidate, "ref", path);
  const translations = normalizedArray(
    candidate,
    "translations",
    path,
    normalizeSourceCardTextBlockAt,
  );
  if (isModelError(ref)) {
    return ref;
  }
  if (isModelError(translations)) {
    return translations;
  }

  let source: SourceCardTextBlock | undefined;
  if (Object.hasOwn(candidate, "source")) {
    const normalized = normalizeSourceCardTextBlockAt(
      candidate.source,
      child(path, "source"),
    );
    if (isModelError(normalized)) {
      return normalized;
    }
    source = normalized;
  }

  return {
    ref,
    ...(source === undefined ? {} : { source }),
    translations,
  };
}

export function normalizeSourceCardData(
  value: unknown,
): ModelResult<SourceCardData> {
  const candidate = record(value);
  if (!candidate) {
    return error("invalid-field", []);
  }

  const ref = requiredString(candidate, "ref", []);
  if (isModelError(ref)) {
    return ref;
  }
  const strings = optionalStrings(candidate, ["heRef"] as const, []);
  if (isModelError(strings)) {
    return strings;
  }
  if (strings.heRef === "") {
    return error("invalid-field", ["heRef"]);
  }
  const segments = normalizedArray(
    candidate,
    "segments",
    [],
    normalizeSourceCardSegmentAt,
  );
  if (isModelError(segments)) {
    return segments;
  }

  if (segments.length === 0) {
    return error("invalid-field", ["segments"]);
  }

  return { ref, ...strings, segments };
}
