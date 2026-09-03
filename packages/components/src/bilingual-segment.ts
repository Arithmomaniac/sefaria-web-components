import {
  getV3Texts,
  type CoreV3TextsResponse,
  type CoreV3Version,
  type GetV3TextsData,
  type SefariaClient,
} from "@sefaria/client";

import {
  projectTextSegmentVersion,
  type TextSegmentDataViewModel,
} from "./text-segment.js";

/** Payload role rendered on one bilingual side. */
export type BilingualSegmentSide = "primary" | "translation";

/** Exact edition requested for one bilingual side. */
export interface BilingualSegmentEditionSelection {
  /** Exact Sefaria version title. */
  readonly versionTitle: string;
}

/** Input owned by the non-DOM bilingual-segment factories. */
export interface BilingualSegmentRequest {
  /** Segment reference passed to the v3 texts endpoint. */
  readonly tref: GetV3TextsData["path"]["tref"];
  /** Exact edition for the primary side, when a specific edition is required. */
  readonly primary?: BilingualSegmentEditionSelection;
  /** Exact edition for the translation side, when one is required. */
  readonly translation?: BilingualSegmentEditionSelection;
}

/** Host-supplied state displayed while a bilingual request is pending. */
export interface BilingualSegmentLoadingViewModel {
  /** State discriminator. */
  readonly state: "loading";
  /** Status announcement supplied by the host. */
  readonly message: string;
}

/** One side that the payload did not supply as renderable text. */
export interface BilingualSegmentAbsentSide {
  /** Role that has no renderable version. */
  readonly side: BilingualSegmentSide;
  /** Attributed server warning, or a component-authored message. */
  readonly message: string;
}

/** One side that the payload supplied as renderable text. */
export interface BilingualSegmentPresentSide {
  /** Role that produced the child view model. */
  readonly side: BilingualSegmentSide;
  /** Render-ready child text-segment data. */
  readonly view: TextSegmentDataViewModel;
}

/** Both sides resolved to renderable text. */
export interface BilingualSegmentDataViewModel {
  /** State discriminator. */
  readonly state: "data";
  /** Normalized English reference label from the payload. */
  readonly ref: string;
  /** Hebrew reference label from the payload. */
  readonly heRef: string;
  /** Render-ready primary-side data. */
  readonly primary: TextSegmentDataViewModel;
  /** Render-ready translation-side data. */
  readonly translation: TextSegmentDataViewModel;
}

/** Exactly one side resolved to renderable text. */
export interface BilingualSegmentPartialViewModel {
  /** State discriminator. */
  readonly state: "partial";
  /** Normalized English reference label from the payload. */
  readonly ref: string;
  /** Hebrew reference label from the payload. */
  readonly heRef: string;
  /** The side that produced renderable text. */
  readonly present: BilingualSegmentPresentSide;
  /** The side that produced none. */
  readonly absent: BilingualSegmentAbsentSide;
}

/** Neither side resolved to renderable text. */
export interface BilingualSegmentEmptyViewModel {
  /** State discriminator. */
  readonly state: "empty";
  /** Normalized English reference label from the payload. */
  readonly ref: string;
  /** Hebrew reference label from the payload. */
  readonly heRef: string;
  /** Both sides, in primary-then-translation order. */
  readonly absent: readonly [
    BilingualSegmentAbsentSide,
    BilingualSegmentAbsentSide,
  ];
}

/** Valid payload that cannot represent one aligned pair. */
export interface BilingualSegmentProjectionErrorViewModel {
  /** State discriminator. */
  readonly state: "error";
  /** Error classification. */
  readonly errorKind: "projection";
  /** Human-readable projection failure. */
  readonly message: string;
}

/** Documented v3 texts HTTP failure. */
export interface BilingualSegmentHttpErrorViewModel {
  /** State discriminator. */
  readonly state: "error";
  /** Error classification. */
  readonly errorKind: "http";
  /** Documented response status. */
  readonly status: 400 | 404;
  /** Validated API error message. */
  readonly message: string;
}

/** Complete state union accepted by `<sefaria-bilingual-segment>`. */
export type BilingualSegmentViewModel =
  | BilingualSegmentLoadingViewModel
  | BilingualSegmentDataViewModel
  | BilingualSegmentPartialViewModel
  | BilingualSegmentEmptyViewModel
  | BilingualSegmentProjectionErrorViewModel
  | BilingualSegmentHttpErrorViewModel;

const SIDES: readonly BilingualSegmentSide[] = ["primary", "translation"];

/**
 * Projects one validated v3 texts response into an aligned bilingual pair.
 */
export function createBilingualSegmentViewModel(
  payload: CoreV3TextsResponse,
  request: BilingualSegmentRequest,
): BilingualSegmentViewModel {
  serializeSelectors(request);

  const resolved = resolveSides(payload.versions, request);
  if (resolved.ambiguousSide !== undefined) {
    return {
      state: "error",
      errorKind: "projection",
      message: `Bilingual segment requires at most one ${resolved.ambiguousSide} version; the payload supplies more.`,
    };
  }

  const projected: Partial<
    Record<BilingualSegmentSide, TextSegmentDataViewModel>
  > = {};

  for (const side of SIDES) {
    const version = resolved.versions[side];
    if (version === undefined) {
      continue;
    }

    const result = projectTextSegmentVersion(payload, version);
    if (result.state === "error") {
      return {
        state: "error",
        errorKind: "projection",
        message: `The ${side} side could not be projected. ${result.message}`,
      };
    }
    if (result.state === "data") {
      projected[side] = result;
    }
  }

  const primary = projected.primary;
  const translation = projected.translation;

  if (primary !== undefined && translation !== undefined) {
    return {
      state: "data",
      ref: payload.ref,
      heRef: payload.heRef,
      primary,
      translation,
    };
  }

  if (primary !== undefined) {
    return {
      state: "partial",
      ref: payload.ref,
      heRef: payload.heRef,
      present: { side: "primary", view: primary },
      absent: describeAbsentSide(payload, request, "translation"),
    };
  }

  if (translation !== undefined) {
    return {
      state: "partial",
      ref: payload.ref,
      heRef: payload.heRef,
      present: { side: "translation", view: translation },
      absent: describeAbsentSide(payload, request, "primary"),
    };
  }

  return {
    state: "empty",
    ref: payload.ref,
    heRef: payload.heRef,
    absent: [
      describeAbsentSide(payload, request, "primary"),
      describeAbsentSide(payload, request, "translation"),
    ],
  };
}

/**
 * Requests one validated v3 payload and projects it with the pure factory.
 */
export async function loadBilingualSegmentViewModel(
  request: BilingualSegmentRequest,
  client: SefariaClient,
  signal?: AbortSignal,
): Promise<BilingualSegmentViewModel> {
  const version = serializeSelectors(request);
  const result = await getV3Texts({
    client,
    path: { tref: request.tref },
    query: { version, return_format: "default" },
    ...(signal === undefined ? {} : { signal }),
  });

  if (result.data !== undefined) {
    return createBilingualSegmentViewModel(result.data, request);
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

function resolveSides(
  versions: readonly CoreV3Version[],
  request: BilingualSegmentRequest,
): {
  readonly versions: Partial<Record<BilingualSegmentSide, CoreV3Version>>;
  readonly ambiguousSide?: BilingualSegmentSide;
} {
  const exactPrimaryMatches = exactSideMatches(versions, request, "primary");
  if (exactPrimaryMatches.length > 1) {
    return { versions: {}, ambiguousSide: "primary" };
  }

  const exactTranslationMatches = exactSideMatches(
    versions,
    request,
    "translation",
  );
  if (exactTranslationMatches.length > 1) {
    return { versions: {}, ambiguousSide: "translation" };
  }

  const exactTranslation = exactTranslationMatches[0];
  let primary = exactPrimaryMatches[0];
  if (primary === undefined && request.primary === undefined) {
    const primaryMatches = versions.filter(
      (version) => version !== exactTranslation && version.isPrimary,
    );
    if (primaryMatches.length > 1) {
      return { versions: {}, ambiguousSide: "primary" };
    }
    primary = primaryMatches[0];
  }

  let translation = exactTranslation;
  if (translation === undefined && request.translation === undefined) {
    const translationMatches = versions.filter(
      (version) => version !== primary && !version.isSource,
    );
    if (translationMatches.length > 1) {
      return { versions: {}, ambiguousSide: "translation" };
    }
    translation = translationMatches[0];
  }

  const resolved: Partial<Record<BilingualSegmentSide, CoreV3Version>> = {};
  if (primary !== undefined) {
    resolved.primary = primary;
  }
  if (translation !== undefined) {
    resolved.translation = translation;
  }
  return { versions: resolved };
}

function exactSideMatches(
  versions: readonly CoreV3Version[],
  request: BilingualSegmentRequest,
  side: BilingualSegmentSide,
): CoreV3Version[] {
  const versionTitle = request[side]?.versionTitle;
  if (versionTitle === undefined) {
    return [];
  }
  const normalizedTitle = versionTitle.replaceAll("_", " ");
  return versions.filter(
    (version) =>
      version.versionTitle === normalizedTitle &&
      (side === "primary" ? version.isPrimary : !version.isSource),
  );
}

function describeAbsentSide(
  payload: CoreV3TextsResponse,
  request: BilingualSegmentRequest,
  side: BilingualSegmentSide,
): BilingualSegmentAbsentSide {
  const key = warningKeyForSide(request, side);
  for (const warning of payload.warnings) {
    const detail = warning[key];
    if (detail !== undefined) {
      return { side, message: detail.message };
    }
  }
  return { side, message: `No ${side} text is available.` };
}

/**
 * Rebuilds the warning key the API derives from one serialized selector.
 *
 * The API replaces `_` with a space in a piped version title before it keys
 * the warning, so an exact-title selector cannot be matched verbatim.
 */
function warningKeyForSide(
  request: BilingualSegmentRequest,
  side: BilingualSegmentSide,
): string {
  const versionTitle = request[side]?.versionTitle;
  if (versionTitle === undefined) {
    return side;
  }
  return `${side}|${versionTitle.replaceAll("_", " ")}`;
}

function serializeSelectors(request: BilingualSegmentRequest): string[] {
  if (request.tref.trim().length === 0) {
    throw new TypeError("Bilingual segment reference must not be blank.");
  }
  return SIDES.map((side) => serializeSideSelector(request, side));
}

function serializeSideSelector(
  request: BilingualSegmentRequest,
  side: BilingualSegmentSide,
): string {
  const versionTitle = request[side]?.versionTitle;
  if (versionTitle === undefined) {
    return side;
  }
  if (versionTitle.trim().length === 0) {
    throw new TypeError(
      `Bilingual segment ${side} version title must not be blank.`,
    );
  }
  return `${side}|${versionTitle}`;
}
