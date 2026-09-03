import {
  getV3Texts,
  type CoreV3TextsResponse,
  type CoreV3Version,
  type GetV3TextsData,
  type SefariaClient,
} from "@sefaria/client";
import {
  applyVocalizationToHtml,
  extractFootnotes,
  sanitize,
  type ExtractedFootnote,
  type FootnoteBodyPart,
} from "@sefaria/text-transform";

/** Selects one language or exact version for a text-segment request. */
export interface TextSegmentVersionSelection {
  /** Full English language-family name accepted by the v3 texts API. */
  readonly language: string;
  /** Exact Sefaria version title, when a specific edition is required. */
  readonly versionTitle?: string;
}

/** Input owned by the non-DOM text-segment factories. */
export interface TextSegmentRequest {
  /** Segment reference passed to the v3 texts endpoint. */
  readonly tref: GetV3TextsData["path"]["tref"];
  /** Version selection serialized into one v3 `version` query parameter. */
  readonly version: TextSegmentVersionSelection;
}

/** Host-supplied state displayed while a text-segment request is pending. */
export interface TextSegmentLoadingViewModel {
  /** State discriminator. */
  readonly state: "loading";
  /** Status announcement supplied by the host. */
  readonly message: string;
}

/** Version attribution retained as inert display text. */
export interface TextSegmentAttribution {
  /** Exact Sefaria version title. */
  readonly versionTitle: string;
  /** Free-form source text, without URL interpretation. */
  readonly versionSource: string | null;
}

/** Safe, render-ready data for one text segment. */
export interface TextSegmentDataViewModel {
  /** State discriminator. */
  readonly state: "data";
  /** Normalized English reference label from the payload. */
  readonly ref: string;
  /** Hebrew reference label from the payload. */
  readonly heRef: string;
  /** Selected version language code. */
  readonly language: string;
  /** Selected version's actual language identifier. */
  readonly actualLanguage: string;
  /** Payload-provided text direction. */
  readonly direction: "ltr" | "rtl";
  /** Ordered safe HTML fragments and static footnote marker positions. */
  readonly body: readonly FootnoteBodyPart[];
  /** Ordered static footnotes referenced by body markers. */
  readonly notes: readonly ExtractedFootnote[];
  /** Selected version attribution. */
  readonly attribution: TextSegmentAttribution;
}

/** Valid response with no renderable text for the requested selection. */
export interface TextSegmentEmptyViewModel {
  /** State discriminator. */
  readonly state: "empty";
  /** Normalized English reference label from the payload. */
  readonly ref: string;
  /** Hebrew reference label from the payload. */
  readonly heRef: string;
  /** Human-readable empty-state message. */
  readonly message: string;
  /** Server warning messages retained from the response. */
  readonly warnings: readonly string[];
}

/** Projection failure for a valid payload that cannot represent one segment. */
export interface TextSegmentProjectionErrorViewModel {
  /** State discriminator. */
  readonly state: "error";
  /** Error classification. */
  readonly errorKind: "projection";
  /** Human-readable projection failure. */
  readonly message: string;
}

/** Documented v3 texts HTTP failure. */
export interface TextSegmentHttpErrorViewModel {
  /** State discriminator. */
  readonly state: "error";
  /** Error classification. */
  readonly errorKind: "http";
  /** Documented response status. */
  readonly status: 400 | 404;
  /** Validated API error message. */
  readonly message: string;
}

/** Complete state union accepted by `<sefaria-text-segment>`. */
export type TextSegmentViewModel =
  | TextSegmentLoadingViewModel
  | TextSegmentDataViewModel
  | TextSegmentEmptyViewModel
  | TextSegmentProjectionErrorViewModel
  | TextSegmentHttpErrorViewModel;

const RESERVED_VERSION_SELECTORS = new Set([
  "all",
  "primary",
  "source",
  "translation",
]);

/**
 * Projects one validated v3 texts response into render-ready segment data.
 */
export function createTextSegmentViewModel(
  payload: CoreV3TextsResponse,
  request: TextSegmentRequest,
): TextSegmentViewModel {
  serializeVersionSelection(request.version);
  const language = request.version.language.trim().toLocaleLowerCase("en-US");
  const matches = payload.versions.filter(
    (version) =>
      version.languageFamilyName.toLocaleLowerCase("en-US") === language &&
      (request.version.versionTitle === undefined ||
        version.versionTitle === request.version.versionTitle),
  );

  if (matches.length === 0) {
    return createEmptyViewModel(payload, createRequestEmptyMessage(request));
  }

  if (matches.length > 1) {
    return {
      state: "error",
      errorKind: "projection",
      message: `Text segment requires one matching version; found ${matches.length}.`,
    };
  }

  const version = matches[0];
  if (!version) {
    throw new Error("A single version match was not available.");
  }

  const projected = projectTextSegmentVersion(payload, version);
  if (projected.state === "empty") {
    return createEmptyViewModel(payload, createRequestEmptyMessage(request));
  }
  return projected;
}

/**
 * Projects one already-selected version into render-ready segment data.
 */
export function projectTextSegmentVersion(
  payload: CoreV3TextsResponse,
  version: CoreV3Version,
):
  | TextSegmentDataViewModel
  | TextSegmentEmptyViewModel
  | TextSegmentProjectionErrorViewModel {
  if (Array.isArray(version.text)) {
    return {
      state: "error",
      errorKind: "projection",
      message: "Text segment requires string or null text; received an array.",
    };
  }

  if (version.text === null) {
    return createSelectedVersionEmptyViewModel(payload, version);
  }

  const sanitized = sanitize(version.text);
  if (sanitized.trim().length === 0) {
    return createSelectedVersionEmptyViewModel(payload, version);
  }

  const vocalized = applyVocalizationToHtml(sanitized, "taamim_and_nikkud");
  const footnotes = extractFootnotes(vocalized);

  return {
    state: "data",
    ref: payload.ref,
    heRef: payload.heRef,
    language: version.language,
    actualLanguage: version.actualLanguage,
    direction: version.direction,
    body: footnotes.body,
    notes: footnotes.notes,
    attribution: {
      versionTitle: version.versionTitle,
      versionSource: version.versionSource,
    },
  };
}

/**
 * Requests one validated v3 payload and projects it with the pure factory.
 */
export async function loadTextSegmentViewModel(
  request: TextSegmentRequest,
  client: SefariaClient,
  signal?: AbortSignal,
): Promise<TextSegmentViewModel> {
  const version = serializeVersionSelection(request.version);
  const result = await getV3Texts({
    client,
    path: { tref: request.tref },
    query: {
      version: [version],
      return_format: "default",
    },
    ...(signal === undefined ? {} : { signal }),
  });

  if (result.data !== undefined) {
    return createTextSegmentViewModel(result.data, request);
  }

  const status = result.response?.status;
  if (result.error !== undefined && (status === 400 || status === 404)) {
    return {
      state: "error",
      errorKind: "http",
      status,
      message: result.error.error,
    };
  }

  throw new Error("The v3 texts request returned no data or documented error.");
}

function createEmptyViewModel(
  payload: CoreV3TextsResponse,
  fallbackMessage: string,
): TextSegmentEmptyViewModel {
  const warnings = payload.warnings.flatMap((warning) =>
    Object.values(warning).map((detail) => detail.message),
  );

  return {
    state: "empty",
    ref: payload.ref,
    heRef: payload.heRef,
    message: warnings[0] ?? fallbackMessage,
    warnings,
  };
}

function createRequestEmptyMessage(request: TextSegmentRequest): string {
  const requestedVersion =
    request.version.versionTitle === undefined
      ? request.version.language
      : `${request.version.language} version "${request.version.versionTitle}"`;
  return `No ${requestedVersion} text is available.`;
}

function createSelectedVersionEmptyMessage(version: CoreV3Version): string {
  return `No ${version.languageFamilyName} version "${version.versionTitle}" text is available.`;
}

function createSelectedVersionEmptyViewModel(
  payload: CoreV3TextsResponse,
  version: CoreV3Version,
): TextSegmentEmptyViewModel {
  return {
    state: "empty",
    ref: payload.ref,
    heRef: payload.heRef,
    message: createSelectedVersionEmptyMessage(version),
    warnings: [],
  };
}

function serializeVersionSelection(
  selection: TextSegmentVersionSelection,
): string {
  const language = selection.language.trim();
  if (language.length === 0) {
    throw new TypeError("Text segment language must not be blank.");
  }
  if (RESERVED_VERSION_SELECTORS.has(language.toLocaleLowerCase("en-US"))) {
    throw new TypeError(
      `Text segment does not support the reserved version selector "${language}".`,
    );
  }

  if (selection.versionTitle === undefined) {
    return language;
  }
  if (selection.versionTitle.trim().length === 0) {
    throw new TypeError("Text segment version title must not be blank.");
  }
  return `${language}|${selection.versionTitle}`;
}
