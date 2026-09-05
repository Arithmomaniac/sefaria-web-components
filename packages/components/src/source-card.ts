import {
  getV3Texts,
  type CoreV3TextsResponse,
  type CoreV3TextValue,
  type CoreV3Version,
  type GetV3TextsData,
  type SefariaClient,
} from "@sefaria/client";

import type {
  BilingualPairAbsentSide,
  BilingualPairSide,
  BilingualPairViewModel,
} from "./bilingual-pair.js";
import {
  describeAbsentBilingualSide,
  resolveBilingualSides,
  type BilingualSegmentEditionSelection,
  type BilingualSegmentRequest,
} from "./bilingual-segment.js";
import {
  projectTextSegmentValue,
  type TextSegmentDataViewModel,
} from "./text-segment.js";

/** Input owned by the non-DOM source-card factories. */
export interface SourceCardRequest {
  /** Reference passed to the v3 texts endpoint. */
  readonly tref: GetV3TextsData["path"]["tref"];
  /** Exact edition for the primary side, when required. */
  readonly primary?: BilingualSegmentEditionSelection;
  /** Exact edition for the translation side, when required. */
  readonly translation?: BilingualSegmentEditionSelection;
}

/** Payload-derived source-card heading data. */
export interface SourceCardHeaderViewModel {
  /** Normalized English reference label. */
  readonly ref: string;
  /** Hebrew reference label. */
  readonly heRef: string;
  /** English index title. */
  readonly indexTitle: string;
  /** Hebrew index title. */
  readonly heIndexTitle: string;
  /** Primary Sefaria category. */
  readonly primaryCategory: string;
  /** Full Sefaria category path. */
  readonly categories: readonly string[];
}

/** One selected edition attributed once by a source card. */
export interface SourceCardAttributionViewModel {
  /** Role filled by the selected edition. */
  readonly side: BilingualPairSide;
  /** Exact Sefaria version title. */
  readonly versionTitle: string;
  /** Free-form source text, without URL interpretation. */
  readonly versionSource: string | null;
}

/** One positionally identified bilingual item in a source card. */
export interface SourceCardItemViewModel {
  /** Zero-based indexes followed through recursive text arrays. */
  readonly position: readonly number[];
  /** Ref-free bilingual rendering state for this position. */
  readonly pair: BilingualPairViewModel;
}

/** Host-supplied state displayed while a source-card request is pending. */
export interface SourceCardLoadingViewModel {
  /** State discriminator. */
  readonly state: "loading";
  /** Status announcement supplied by the host. */
  readonly message: string;
}

/** Render-ready source card with one or more text items. */
export interface SourceCardDataViewModel {
  /** State discriminator. */
  readonly state: "data";
  /** Payload-derived reference heading. */
  readonly header: SourceCardHeaderViewModel;
  /** Selected editions attributed once for the complete card. */
  readonly attributions: readonly SourceCardAttributionViewModel[];
  /** Ordered bilingual items. */
  readonly items: readonly SourceCardItemViewModel[];
}

/** Valid payload with no renderable text. */
export interface SourceCardEmptyViewModel {
  /** State discriminator. */
  readonly state: "empty";
  /** Payload-derived reference heading. */
  readonly header: SourceCardHeaderViewModel;
  /** Selected editions attributed once for the complete card. */
  readonly attributions: readonly SourceCardAttributionViewModel[];
  /** Both absent roles, in primary-then-translation order. */
  readonly absent: readonly [BilingualPairAbsentSide, BilingualPairAbsentSide];
}

/** Valid payload that cannot be projected as an aligned source card. */
export interface SourceCardProjectionErrorViewModel {
  /** State discriminator. */
  readonly state: "error";
  /** Error classification. */
  readonly errorKind: "projection";
  /** Human-readable projection failure. */
  readonly message: string;
}

/** Documented v3 texts HTTP failure. */
export interface SourceCardHttpErrorViewModel {
  /** State discriminator. */
  readonly state: "error";
  /** Error classification. */
  readonly errorKind: "http";
  /** Documented response status. */
  readonly status: 400 | 404;
  /** Validated API error message. */
  readonly message: string;
}

/** Complete state union accepted by `<sefaria-source-card>`. */
export type SourceCardViewModel =
  | SourceCardLoadingViewModel
  | SourceCardDataViewModel
  | SourceCardEmptyViewModel
  | SourceCardProjectionErrorViewModel
  | SourceCardHttpErrorViewModel;

const SIDES: readonly BilingualPairSide[] = ["primary", "translation"];

/**
 * Projects one validated v3 texts response into a source card.
 */
export function createSourceCardViewModel(
  payload: CoreV3TextsResponse,
  request: SourceCardRequest,
): SourceCardViewModel {
  serializeSourceCardSelectors(request);
  const bilingualRequest: BilingualSegmentRequest = request;
  const resolved = resolveBilingualSides(payload.versions, bilingualRequest);
  if (resolved.ambiguousSide !== undefined) {
    return {
      state: "error",
      errorKind: "projection",
      message: `Source card requires at most one ${resolved.ambiguousSide} version; the payload supplies more.`,
    };
  }

  const projected = projectAlignedItems(
    payload,
    bilingualRequest,
    resolved.versions,
  );
  if ("message" in projected) {
    return {
      state: "error",
      errorKind: "projection",
      message: projected.message,
    };
  }

  const header = createHeader(payload);
  const attributions = createAttributions(resolved.versions);
  if (projected.items.length === 0) {
    return {
      state: "empty",
      header,
      attributions,
      absent: [
        absentForSide(
          payload,
          bilingualRequest,
          "primary",
          resolved.versions.primary,
        ),
        absentForSide(
          payload,
          bilingualRequest,
          "translation",
          resolved.versions.translation,
        ),
      ],
    };
  }

  return { state: "data", header, attributions, items: projected.items };
}

/**
 * Requests one validated v3 payload and projects it with the pure factory.
 */
export async function loadSourceCardViewModel(
  request: SourceCardRequest,
  client: SefariaClient,
  signal?: AbortSignal,
): Promise<SourceCardViewModel> {
  const version = serializeSourceCardSelectors(request);
  const result = await getV3Texts({
    client,
    path: { tref: request.tref },
    query: { version, return_format: "default" },
    ...(signal === undefined ? {} : { signal }),
  });

  if (result.data !== undefined) {
    return createSourceCardViewModel(result.data, request);
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

function projectAlignedItems(
  payload: CoreV3TextsResponse,
  request: BilingualSegmentRequest,
  versions: Partial<Record<BilingualPairSide, CoreV3Version>>,
):
  | { readonly items: readonly SourceCardItemViewModel[] }
  | { readonly message: string } {
  const items: SourceCardItemViewModel[] = [];
  const failure = visitAlignedText(
    payload,
    request,
    versions,
    versions.primary?.text,
    versions.translation?.text,
    [],
    items,
  );
  return failure === undefined ? { items } : { message: failure };
}

function visitAlignedText(
  payload: CoreV3TextsResponse,
  request: BilingualSegmentRequest,
  versions: Partial<Record<BilingualPairSide, CoreV3Version>>,
  primary: CoreV3TextValue | undefined,
  translation: CoreV3TextValue | undefined,
  position: readonly number[],
  items: SourceCardItemViewModel[],
): string | undefined {
  const primaryArray = Array.isArray(primary);
  const translationArray = Array.isArray(translation);

  if (
    (primaryArray && translation !== undefined && !translationArray) ||
    (translationArray && primary !== undefined && !primaryArray)
  ) {
    return `Source-card sides disagree structurally at position ${formatPosition(position)}.`;
  }

  if (primaryArray || translationArray) {
    const primaryItems = primaryArray ? primary : [];
    const translationItems = translationArray ? translation : [];
    const length = Math.max(primaryItems.length, translationItems.length);
    for (let index = 0; index < length; index += 1) {
      const failure = visitAlignedText(
        payload,
        request,
        versions,
        primaryItems[index],
        translationItems[index],
        [...position, index],
        items,
      );
      if (failure !== undefined) {
        return failure;
      }
    }
    return undefined;
  }

  const primaryResult = projectLeaf(
    payload,
    request,
    "primary",
    versions.primary,
    primary,
  );
  const translationResult = projectLeaf(
    payload,
    request,
    "translation",
    versions.translation,
    translation,
  );
  const pair = createPair(primaryResult, translationResult);
  if (pair !== undefined) {
    items.push({ position: [...position], pair });
  }
  return undefined;
}

type ProjectedLeaf =
  | { readonly state: "data"; readonly view: TextSegmentDataViewModel }
  | { readonly state: "empty"; readonly absent: BilingualPairAbsentSide };

function projectLeaf(
  payload: CoreV3TextsResponse,
  request: BilingualSegmentRequest,
  side: BilingualPairSide,
  version: CoreV3Version | undefined,
  text: string | null | undefined,
): ProjectedLeaf {
  if (version === undefined) {
    return {
      state: "empty",
      absent: describeAbsentBilingualSide(payload, request, side),
    };
  }

  const projected = projectTextSegmentValue(payload, version, text ?? null);
  return projected.state === "data"
    ? { state: "data", view: projected }
    : { state: "empty", absent: { side, message: projected.message } };
}

function createPair(
  primary: ProjectedLeaf,
  translation: ProjectedLeaf,
): BilingualPairViewModel | undefined {
  if (primary.state === "data" && translation.state === "data") {
    return {
      state: "data",
      primary: primary.view,
      translation: translation.view,
    };
  }
  if (primary.state === "data" && translation.state === "empty") {
    return {
      state: "partial",
      present: { side: "primary", view: primary.view },
      absent: translation.absent,
    };
  }
  if (translation.state === "data" && primary.state === "empty") {
    return {
      state: "partial",
      present: { side: "translation", view: translation.view },
      absent: primary.absent,
    };
  }
  return undefined;
}

function absentForSide(
  payload: CoreV3TextsResponse,
  request: BilingualSegmentRequest,
  side: BilingualPairSide,
  version: CoreV3Version | undefined,
): BilingualPairAbsentSide {
  if (version === undefined) {
    return describeAbsentBilingualSide(payload, request, side);
  }
  const projected = projectTextSegmentValue(payload, version, null);
  if (projected.state !== "empty") {
    throw new Error("Null text unexpectedly produced renderable data.");
  }
  return { side, message: projected.message };
}

function createHeader(payload: CoreV3TextsResponse): SourceCardHeaderViewModel {
  return {
    ref: payload.ref,
    heRef: payload.heRef,
    indexTitle: payload.indexTitle,
    heIndexTitle: payload.heIndexTitle,
    primaryCategory: payload.primary_category,
    categories: [...payload.categories],
  };
}

function createAttributions(
  versions: Partial<Record<BilingualPairSide, CoreV3Version>>,
): SourceCardAttributionViewModel[] {
  return SIDES.flatMap((side) => {
    const version = versions[side];
    return version === undefined
      ? []
      : [
          {
            side,
            versionTitle: version.versionTitle,
            versionSource: version.versionSource,
          },
        ];
  });
}

function formatPosition(position: readonly number[]): string {
  return position.length === 0 ? "the root" : `[${position.join(", ")}]`;
}

function serializeSourceCardSelectors(request: SourceCardRequest): string[] {
  if (request.tref.trim().length === 0) {
    throw new TypeError("Source card reference must not be blank.");
  }
  return SIDES.map((side) => {
    const versionTitle = request[side]?.versionTitle;
    if (versionTitle === undefined) {
      return side;
    }
    if (versionTitle.trim().length === 0) {
      throw new TypeError(
        `Source card ${side} version title must not be blank.`,
      );
    }
    return `${side}|${versionTitle}`;
  });
}
