export const TEXT_DIRECTIONS = ["ltr", "rtl"] as const;

export type TextDirection = (typeof TEXT_DIRECTIONS)[number];

export interface Segment {
  readonly ref: string;
  readonly text: string;
  readonly lang: string;
  readonly direction: TextDirection;
  readonly versionTitle: string;
}

export interface Version {
  readonly versionTitle: string;
  readonly language: string;
  readonly direction: TextDirection;
  readonly actualLanguage?: string;
  readonly languageFamilyName?: string;
  readonly isSource?: boolean;
  readonly isPrimary?: boolean;
  readonly license?: string;
  readonly versionSource?: string;
  readonly versionUrl?: string;
  readonly versionNotes?: string;
  readonly digitizedBySefaria?: boolean;
  readonly shortVersionTitle?: string;
  readonly formatAsPoetry?: boolean;
  readonly hasManuallyWrappedRefs?: boolean;
}

export interface LinkRef {
  readonly ref: string;
  readonly heRef?: string;
  readonly category?: string;
  readonly commentator?: string;
  readonly order?: number;
  readonly sourceHasEn?: boolean;
}

export interface TextResponse {
  readonly ref: string;
  readonly heRef?: string;
  readonly sections: readonly string[];
  readonly toSections: readonly string[];
  readonly sectionRef?: string;
  readonly next?: string;
  readonly prev?: string;
  readonly isSpanning: boolean;
  readonly versions: readonly Version[];
  readonly segments: readonly Segment[];
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
  readonly content: string;
};

export interface SourceCardSegment {
  readonly ref: string;
  readonly source?: SourceCardTextBlock;
  readonly translations: readonly SourceCardTextBlock[];
}

export interface SourceCardData {
  readonly ref: string;
  readonly heRef?: string;
  readonly segments: readonly SourceCardSegment[];
}

export type ModelErrorCode = "missing-required-field" | "invalid-field";

export interface ModelError {
  readonly type: "model-error";
  readonly code: ModelErrorCode;
  readonly path: readonly (string | number)[];
}

export type ModelResult<T> = T | ModelError;

export function isModelError(value: unknown): value is ModelError {
  if (
    typeof value !== "object" ||
    value === null ||
    !("type" in value) ||
    value.type !== "model-error" ||
    !("code" in value) ||
    (value.code !== "missing-required-field" &&
      value.code !== "invalid-field") ||
    !("path" in value) ||
    !Array.isArray(value.path)
  ) {
    return false;
  }

  for (let index = 0; index < value.path.length; index += 1) {
    if (!Object.hasOwn(value.path, index)) {
      return false;
    }

    const part = value.path[index];
    if (
      typeof part !== "string" &&
      (typeof part !== "number" || !Number.isFinite(part))
    ) {
      return false;
    }
  }

  return true;
}

export function isTextDirection(value: unknown): value is TextDirection {
  return value === "ltr" || value === "rtl";
}
