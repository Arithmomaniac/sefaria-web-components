export const TEXT_DIRECTIONS = ["ltr", "rtl"] as const;

export type TextDirection = (typeof TEXT_DIRECTIONS)[number];

export interface Version {
  versionTitle: string;
  language: string;
  direction: TextDirection;
  actualLanguage?: string;
  languageFamilyName?: string;
  isSource?: boolean;
  isPrimary?: boolean;
  license?: string;
  versionSource?: string;
  versionUrl?: string;
  versionNotes?: string;
  digitizedBySefaria?: boolean;
  shortVersionTitle?: string;
  formatAsPoetry?: boolean;
  hasManuallyWrappedRefs?: boolean;
}

export interface TextResponse {
  ref: string;
  heRef?: string;
  sections: string[];
  toSections: string[];
  sectionRef?: string;
  next?: string;
  prev?: string;
  isSpanning: boolean;
  versions: Version[];
}

export type SourceCardTextBlock = Pick<
  Version,
  | "language"
  | "direction"
  | "versionTitle"
  | "shortVersionTitle"
  | "license"
  | "versionSource"
  | "versionUrl"
  | "versionNotes"
  | "digitizedBySefaria"
> & {
  content: string;
};

export interface SourceCardSegment {
  ref: string;
  source?: SourceCardTextBlock;
  translations: SourceCardTextBlock[];
}

export interface SourceCardData {
  ref: string;
  heRef?: string;
  segments: SourceCardSegment[];
}

export function isTextDirection(value: unknown): value is TextDirection {
  return value === "ltr" || value === "rtl";
}

const SOURCE_CARD_KEYS = new Set(["ref", "heRef", "segments"]);
const SOURCE_CARD_SEGMENT_KEYS = new Set(["ref", "source", "translations"]);
const SOURCE_CARD_TEXT_BLOCK_KEYS = new Set([
  "content",
  "language",
  "direction",
  "versionTitle",
  "shortVersionTitle",
  "license",
  "versionSource",
  "versionUrl",
  "versionNotes",
  "digitizedBySefaria",
]);
const SOURCE_CARD_TEXT_BLOCK_STRING_KEYS = [
  "shortVersionTitle",
  "license",
  "versionSource",
  "versionUrl",
  "versionNotes",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  allowedKeys: ReadonlySet<string>,
): boolean {
  return Object.keys(value).every((key) => allowedKeys.has(key));
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function hasOptionalString(
  value: Record<string, unknown>,
  key: string,
): boolean {
  return !Object.hasOwn(value, key) || typeof value[key] === "string";
}

function isSourceCardTextBlock(value: unknown): value is SourceCardTextBlock {
  if (!isRecord(value) || !hasOnlyKeys(value, SOURCE_CARD_TEXT_BLOCK_KEYS)) {
    return false;
  }

  return (
    typeof value.content === "string" &&
    isNonEmptyString(value.language) &&
    isTextDirection(value.direction) &&
    isNonEmptyString(value.versionTitle) &&
    SOURCE_CARD_TEXT_BLOCK_STRING_KEYS.every((key) =>
      hasOptionalString(value, key),
    ) &&
    (!Object.hasOwn(value, "digitizedBySefaria") ||
      typeof value.digitizedBySefaria === "boolean")
  );
}

export function isSourceCardData(value: unknown): value is SourceCardData {
  if (!isRecord(value) || !hasOnlyKeys(value, SOURCE_CARD_KEYS)) {
    return false;
  }

  if (
    !isNonEmptyString(value.ref) ||
    (Object.hasOwn(value, "heRef") && !isNonEmptyString(value.heRef)) ||
    !Array.isArray(value.segments) ||
    value.segments.length === 0
  ) {
    return false;
  }

  return value.segments.every((segment) => {
    if (!isRecord(segment) || !hasOnlyKeys(segment, SOURCE_CARD_SEGMENT_KEYS)) {
      return false;
    }

    return (
      isNonEmptyString(segment.ref) &&
      (!Object.hasOwn(segment, "source") ||
        isSourceCardTextBlock(segment.source)) &&
      Array.isArray(segment.translations) &&
      segment.translations.every(isSourceCardTextBlock)
    );
  });
}
