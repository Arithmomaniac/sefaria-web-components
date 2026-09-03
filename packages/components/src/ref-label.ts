import {
  getRef,
  type CoreRefResponse,
  type GetRefData,
  type SefariaClient,
} from "@sefaria/client";

const DEFAULT_SITE_ORIGIN = "https://www.sefaria.org";
const PATH_CHARACTER = /^[A-Za-z0-9\-._~!$&'()*+,;=:@]$/u;
const ESCAPED_OCTET = /^%[0-9A-Fa-f]{2}$/u;

/** Typed inputs owned by the non-DOM reference-label factories. */
export interface RefLabelRequest {
  /** Reference passed to `GET /api/ref/{tref}`. */
  readonly tref: GetRefData["path"]["tref"];
}

/** Deterministic options used while projecting a reference label. */
export interface RefLabelFactoryOptions {
  /** HTTP(S) origin used to build the canonical absolute URL. */
  readonly siteOrigin?: string;
}

/** Host-supplied state displayed while a reference-label request is pending. */
export interface RefLabelLoadingViewModel {
  /** State discriminator. */
  readonly state: "loading";
  /** Status announcement supplied by the host. */
  readonly message: string;
}

/** Canonical render-ready identity for one Sefaria reference. */
export interface RefLabelDataViewModel {
  /** State discriminator. */
  readonly state: "data";
  /** Canonical human-readable English reference. */
  readonly normalized: string;
  /** Hebrew reference form supplied by Sefaria. */
  readonly hebrew: string;
  /** Canonical Sefaria path form returned by the API. */
  readonly urlRef: string;
  /** Canonical absolute HTTP(S) link target. */
  readonly url: string;
  /** Canonical owning index title. */
  readonly indexTitle: string;
  /** Sefaria node class that resolved the reference. */
  readonly nodeType: string;
}

/** Valid HTTP 200 result for a string that is not a Sefaria reference. */
export interface RefLabelEmptyViewModel {
  /** State discriminator. */
  readonly state: "empty";
  /** Original reference string that could not be resolved. */
  readonly tref: string;
  /** Human-readable empty-state message. */
  readonly message: string;
}

/** Documented reference endpoint HTTP failure. */
export interface RefLabelHttpErrorViewModel {
  /** State discriminator. */
  readonly state: "error";
  /** Error classification. */
  readonly errorKind: "http";
  /** Documented response status. */
  readonly status: 404;
  /** Validated API error message. */
  readonly message: string;
}

/** Complete state union accepted by `<sefaria-ref-label>`. */
export type RefLabelViewModel =
  | RefLabelLoadingViewModel
  | RefLabelDataViewModel
  | RefLabelEmptyViewModel
  | RefLabelHttpErrorViewModel;

/** Projects one validated reference response into a render-ready label. */
export function createRefLabelViewModel(
  payload: CoreRefResponse,
  request: RefLabelRequest,
  options: RefLabelFactoryOptions = {},
): RefLabelViewModel {
  const tref = requireTref(request.tref);
  const siteOrigin = requireSiteOrigin(options.siteOrigin);

  if (!payload.is_ref) {
    return {
      state: "empty",
      tref,
      message: `"${tref}" is not a recognized Sefaria reference.`,
    };
  }

  return {
    state: "data",
    normalized: payload.normalized,
    hebrew: payload.hebrew,
    urlRef: payload.url_ref,
    url: createCanonicalUrl(payload.url_ref, siteOrigin),
    indexTitle: payload.index_title,
    nodeType: payload.node_type,
  };
}

/** Requests one validated reference payload and delegates to the pure factory. */
export async function loadRefLabelViewModel(
  request: RefLabelRequest,
  client: SefariaClient,
  signal?: AbortSignal,
  options: RefLabelFactoryOptions = {},
): Promise<RefLabelViewModel> {
  const tref = requireTref(request.tref);
  requireSiteOrigin(options.siteOrigin);
  const result = await getRef({
    client,
    path: { tref },
    ...(signal === undefined ? {} : { signal }),
  });

  if (result.data !== undefined) {
    return createRefLabelViewModel(result.data, { tref }, options);
  }

  if (result.error !== undefined && result.response?.status === 404) {
    return {
      state: "error",
      errorKind: "http",
      status: 404,
      message: result.error.error,
    };
  }

  throw new Error(
    "The reference request returned no data or documented error.",
  );
}

function requireTref(tref: string): string {
  const trimmed = tref.trim();
  if (trimmed.length === 0) {
    throw new TypeError("Reference label tref must not be blank.");
  }
  return trimmed;
}

function requireSiteOrigin(siteOrigin: string | undefined): URL {
  const parsed = new URL(siteOrigin ?? DEFAULT_SITE_ORIGIN);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new TypeError("Reference label site origin must use HTTP or HTTPS.");
  }
  return parsed;
}

function createCanonicalUrl(urlRef: string, siteOrigin: URL): string {
  return new URL(`/${encodeUrlRef(urlRef)}`, siteOrigin.origin).href;
}

function encodeUrlRef(urlRef: string): string {
  return urlRef.replaceAll(/%[0-9A-Fa-f]{2}|./gu, (character) => {
    if (ESCAPED_OCTET.test(character) || PATH_CHARACTER.test(character)) {
      return character;
    }
    return encodeURIComponent(character);
  });
}
