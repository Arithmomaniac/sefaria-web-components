import {
  getV3Texts,
  type CoreV3TextsResponse,
  type CoreV3TextValue,
  type CoreV3Version,
  type SefariaClient,
} from "@sefaria/client";

import type { BilingualPairSide } from "./bilingual-pair.js";
import { resolveBilingualSides } from "./bilingual-segment.js";
import {
  createSourceCardViewModel,
  type SourceCardDataViewModel,
  type SourceCardEmptyViewModel,
  type SourceCardRequest,
} from "./source-card.js";

/** Maximum number of aligned source positions rendered in one popup preview. */
export const POPUP_PREVIEW_POSITION_LIMIT = 20;

/** Input owned by the non-DOM popup factories. */
export type PopupRequest = SourceCardRequest;

/** Host-supplied state displayed while a popup request is pending. */
export interface PopupLoadingViewModel {
  /** State discriminator. */
  readonly state: "loading";
  /** Status announcement supplied by the host. */
  readonly message: string;
}

/** Render-ready popup content. */
export interface PopupDataViewModel {
  /** State discriminator. */
  readonly state: "data";
  /** Bounded source-card data rendered inside the popup. */
  readonly card: SourceCardDataViewModel;
  /** Whether aligned positions after the preview limit were omitted. */
  readonly truncated: boolean;
}

/** Valid payload with no renderable popup content. */
export interface PopupEmptyViewModel {
  /** State discriminator. */
  readonly state: "empty";
  /** Source-card empty state rendered inside the popup. */
  readonly card: SourceCardEmptyViewModel;
  /** Whether aligned positions after the preview limit were omitted. */
  readonly truncated: boolean;
}

/** Popup projection or documented HTTP failure. */
export interface PopupErrorViewModel {
  /** State discriminator. */
  readonly state: "error";
  /** Error classification. */
  readonly errorKind: "projection" | "http";
  /** Documented response status for HTTP failures. */
  readonly status?: 400 | 404;
  /** Human-readable failure. */
  readonly message: string;
}

/** Complete state union accepted by `<sefaria-popup>`. */
export type PopupViewModel =
  | PopupLoadingViewModel
  | PopupDataViewModel
  | PopupEmptyViewModel
  | PopupErrorViewModel;

/**
 * Projects one validated v3 response into a bounded popup view model.
 */
export function createPopupViewModel(
  payload: CoreV3TextsResponse,
  request: PopupRequest,
): PopupViewModel {
  serializePopupSelectors(request);
  const bounded = boundPopupPayload(payload, request);
  const card = createSourceCardViewModel(bounded.payload, request);

  if (card.state === "data") {
    return { state: "data", card, truncated: bounded.truncated };
  }
  if (card.state === "empty") {
    return { state: "empty", card, truncated: bounded.truncated };
  }
  if (card.state === "error") {
    return !("status" in card)
      ? {
          state: "error",
          errorKind: card.errorKind,
          message: card.message,
        }
      : {
          state: "error",
          errorKind: card.errorKind,
          status: card.status,
          message: card.message,
        };
  }
  throw new Error("A pure popup projection cannot produce a loading state.");
}

/**
 * Requests one validated v3 payload and projects it with the popup pure factory.
 */
export async function loadPopupViewModel(
  request: PopupRequest,
  client: SefariaClient,
  signal?: AbortSignal,
): Promise<PopupViewModel> {
  const version = serializePopupSelectors(request);
  const result = await getV3Texts({
    client,
    path: { tref: request.tref },
    query: { version, return_format: "default" },
    ...(signal === undefined ? {} : { signal }),
  });

  if (result.data !== undefined) {
    return createPopupViewModel(result.data, request);
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

  throw new Error("The popup request returned no data or documented error.");
}

function boundPopupPayload(
  payload: CoreV3TextsResponse,
  request: PopupRequest,
): { readonly payload: CoreV3TextsResponse; readonly truncated: boolean } {
  const resolved = resolveBilingualSides(payload.versions, request);
  if (resolved.ambiguousSide !== undefined) {
    return { payload, truncated: false };
  }

  const bounded = takeAlignedPositions(
    resolved.versions.primary?.text,
    resolved.versions.translation?.text,
    POPUP_PREVIEW_POSITION_LIMIT,
  );
  if (!bounded.truncated) {
    return { payload, truncated: false };
  }

  const replacements = new Map<CoreV3Version, CoreV3TextValue>();
  if (
    resolved.versions.primary !== undefined &&
    bounded.primary !== undefined
  ) {
    replacements.set(resolved.versions.primary, bounded.primary);
  }
  if (
    resolved.versions.translation !== undefined &&
    bounded.translation !== undefined
  ) {
    replacements.set(resolved.versions.translation, bounded.translation);
  }

  return {
    payload: {
      ...payload,
      versions: payload.versions.map((version) => {
        const text = replacements.get(version);
        return text === undefined ? version : { ...version, text };
      }),
    },
    truncated: true,
  };
}

function takeAlignedPositions(
  primary: CoreV3TextValue | undefined,
  translation: CoreV3TextValue | undefined,
  limit: number,
): {
  readonly primary: CoreV3TextValue | undefined;
  readonly translation: CoreV3TextValue | undefined;
  readonly truncated: boolean;
} {
  let visited = 0;
  let truncated = false;

  function visit(
    primaryValue: CoreV3TextValue | undefined,
    translationValue: CoreV3TextValue | undefined,
  ): {
    readonly primary: CoreV3TextValue | undefined;
    readonly translation: CoreV3TextValue | undefined;
    readonly stopped: boolean;
  } {
    const primaryArray = Array.isArray(primaryValue);
    const translationArray = Array.isArray(translationValue);
    if (
      (primaryArray && translationValue !== undefined && !translationArray) ||
      (translationArray && primaryValue !== undefined && !primaryArray)
    ) {
      return {
        primary: primaryValue,
        translation: translationValue,
        stopped: false,
      };
    }

    if (primaryArray || translationArray) {
      const primaryItems = primaryArray ? primaryValue : [];
      const translationItems = translationArray ? translationValue : [];
      const primaryOutput: CoreV3TextValue[] = [];
      const translationOutput: CoreV3TextValue[] = [];
      const length = Math.max(primaryItems.length, translationItems.length);
      for (let index = 0; index < length; index += 1) {
        const child = visit(primaryItems[index], translationItems[index]);
        if (child.stopped) {
          return {
            primary: primaryArray ? primaryOutput : undefined,
            translation: translationArray ? translationOutput : undefined,
            stopped: true,
          };
        }
        if (primaryArray) {
          primaryOutput.push(child.primary ?? null);
        }
        if (translationArray) {
          translationOutput.push(child.translation ?? null);
        }
      }
      return {
        primary: primaryArray ? primaryOutput : undefined,
        translation: translationArray ? translationOutput : undefined,
        stopped: false,
      };
    }

    if (visited >= limit) {
      truncated = true;
      return { primary: undefined, translation: undefined, stopped: true };
    }
    visited += 1;
    return {
      primary: primaryValue,
      translation: translationValue,
      stopped: false,
    };
  }

  const result = visit(primary, translation);
  return {
    primary: result.primary,
    translation: result.translation,
    truncated,
  };
}

function serializePopupSelectors(request: PopupRequest): string[] {
  if (request.tref.trim().length === 0) {
    throw new TypeError("Popup reference must not be blank.");
  }
  const sides: readonly BilingualPairSide[] = ["primary", "translation"];
  return sides.map((side) => {
    const versionTitle = request[side]?.versionTitle;
    if (versionTitle === undefined) {
      return side;
    }
    if (versionTitle.trim().length === 0) {
      throw new TypeError(`Popup ${side} version title must not be blank.`);
    }
    return `${side}|${versionTitle}`;
  });
}
