import {
  createSefariaClient,
  validateGetV3Texts200,
  type CoreV3TextsResponse,
  type CoreV3Version,
} from "@sefaria/client";
import { describe, expect, it, vi } from "vitest";

import { v3SourceBackedPayload } from "../../../tests/compatibility/src/v3-source-backed.fixture.js";
import {
  createBilingualSegmentViewModel,
  loadBilingualSegmentViewModel,
  type BilingualSegmentRequest,
} from "./bilingual-segment.js";

const REQUEST: BilingualSegmentRequest = { tref: "Genesis 1:1" };

function basePayload(): CoreV3TextsResponse {
  if (!validateGetV3Texts200(v3SourceBackedPayload)) {
    throw new TypeError("Expected a valid v3 texts fixture.");
  }
  return structuredClone(v3SourceBackedPayload) as CoreV3TextsResponse;
}

/** The fixture's own version is the source and primary Hebrew text. */
function primaryVersion(overrides: Partial<CoreV3Version> = {}): CoreV3Version {
  const version = basePayload().versions[0];
  if (!version) {
    throw new Error("Source-backed payload must contain one version.");
  }
  return { ...version, ...overrides };
}

function translationVersion(
  overrides: Partial<CoreV3Version> = {},
): CoreV3Version {
  return primaryVersion({
    versionTitle: "Example English",
    versionSource: "Example publisher",
    language: "en",
    actualLanguage: "en",
    languageFamilyName: "english",
    isSource: false,
    isPrimary: false,
    direction: "ltr",
    text: "In the beginning.",
    ...overrides,
  });
}

function payloadWith(
  versions: readonly CoreV3Version[],
  warnings: CoreV3TextsResponse["warnings"] = [],
): CoreV3TextsResponse {
  return { ...basePayload(), versions: [...versions], warnings: [...warnings] };
}

function bothSides(): CoreV3TextsResponse {
  return payloadWith([primaryVersion(), translationVersion()]);
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function clientReturning(payload: unknown, status = 200) {
  const fetchMock = vi.fn<typeof fetch>(async () =>
    jsonResponse(payload, status),
  );
  return {
    fetchMock,
    client: createSefariaClient({
      baseUrl: "https://example.test",
      fetch: fetchMock,
    }),
  };
}

describe("createBilingualSegmentViewModel role resolution", () => {
  it("pairs the primary and translation sides", () => {
    const result = createBilingualSegmentViewModel(bothSides(), REQUEST);

    expect(result.state).toBe("data");
    if (result.state !== "data") return;
    expect(result.ref).toBe("Genesis 1:1");
    expect(result.primary.attribution.versionTitle).toBe(
      "Explicit source-backed compatibility composition",
    );
    expect(result.primary.direction).toBe("rtl");
    expect(result.translation.attribution.versionTitle).toBe("Example English");
    expect(result.translation.direction).toBe("ltr");
  });

  it("resolves the same sides when the payload order is reversed", () => {
    const forward = createBilingualSegmentViewModel(bothSides(), REQUEST);
    const reversed = createBilingualSegmentViewModel(
      payloadWith([translationVersion(), primaryVersion()]),
      REQUEST,
    );

    expect(reversed).toEqual(forward);
  });

  it("drops a version that fills neither role", () => {
    const surplus = primaryVersion({
      versionTitle: "Unselected source edition",
      isPrimary: false,
      isSource: true,
      text: "A source edition that fills neither role.",
    });

    expect(
      createBilingualSegmentViewModel(
        payloadWith([primaryVersion(), translationVersion(), surplus]),
        REQUEST,
      ),
    ).toEqual(createBilingualSegmentViewModel(bothSides(), REQUEST));
  });
});

describe("createBilingualSegmentViewModel states", () => {
  it("returns partial and names the absent side when translation is missing", () => {
    const result = createBilingualSegmentViewModel(
      payloadWith([primaryVersion()]),
      REQUEST,
    );

    expect(result.state).toBe("partial");
    if (result.state !== "partial") return;
    expect(result.present.side).toBe("primary");
    expect(result.present.view.direction).toBe("rtl");
    expect(result.absent.side).toBe("translation");
  });

  it("returns partial when the primary is absent", () => {
    const result = createBilingualSegmentViewModel(
      payloadWith([translationVersion()]),
      REQUEST,
    );

    expect(result.state).toBe("partial");
    if (result.state !== "partial") return;
    expect(result.present.side).toBe("translation");
    expect(result.absent.side).toBe("primary");
  });

  it("treats a resolved but non-renderable side as absent", () => {
    const result = createBilingualSegmentViewModel(
      payloadWith([primaryVersion(), translationVersion({ text: null })]),
      REQUEST,
    );

    expect(result.state).toBe("partial");
    if (result.state !== "partial") return;
    expect(result.absent.side).toBe("translation");
  });

  it("returns empty and names both sides when neither renders", () => {
    const result = createBilingualSegmentViewModel(
      payloadWith([
        primaryVersion({ text: null }),
        translationVersion({ text: "   " }),
      ]),
      REQUEST,
    );

    expect(result.state).toBe("empty");
    if (result.state !== "empty") return;
    expect(result.absent.map((side) => side.side)).toEqual([
      "primary",
      "translation",
    ]);
  });

  it("returns empty when the payload carries no versions", () => {
    expect(
      createBilingualSegmentViewModel(payloadWith([]), REQUEST).state,
    ).toBe("empty");
  });

  it("surfaces a projection failure instead of dropping the side", () => {
    const result = createBilingualSegmentViewModel(
      payloadWith([
        primaryVersion(),
        translationVersion({ text: ["a segment", "another"] }),
      ]),
      REQUEST,
    );

    expect(result.state).toBe("error");
    if (result.state !== "error") return;
    expect(result.errorKind).toBe("projection");
  });

  it("reports an ambiguous primary rather than choosing a version", () => {
    const result = createBilingualSegmentViewModel(
      payloadWith([primaryVersion(), primaryVersion(), translationVersion()]),
      REQUEST,
    );

    expect(result.state).toBe("error");
    if (result.state !== "error") return;
    expect(result.errorKind).toBe("projection");
  });

  it("reports an ambiguous translation rather than choosing a version", () => {
    const result = createBilingualSegmentViewModel(
      payloadWith([
        primaryVersion(),
        translationVersion(),
        translationVersion({ versionTitle: "Second translation" }),
      ]),
      REQUEST,
    );

    expect(result.state).toBe("error");
    if (result.state !== "error") return;
    expect(result.errorKind).toBe("projection");
  });
});

describe("createBilingualSegmentViewModel warning attribution", () => {
  it("assigns each selector warning to the side that requested it", () => {
    const result = createBilingualSegmentViewModel(
      payloadWith(
        [],
        [
          { primary: { warning_code: 101, message: "No primary text." } },
          { translation: { warning_code: 102, message: "No translation." } },
        ],
      ),
      REQUEST,
    );

    expect(result.state).toBe("empty");
    if (result.state !== "empty") return;
    expect(result.absent).toEqual([
      { side: "primary", message: "No primary text." },
      { side: "translation", message: "No translation." },
    ]);
  });

  it("does not borrow another side's warning", () => {
    const result = createBilingualSegmentViewModel(
      payloadWith(
        [primaryVersion()],
        [{ translation: { warning_code: 102, message: "No translation." } }],
      ),
      REQUEST,
    );

    expect(result.state).toBe("partial");
    if (result.state !== "partial") return;
    expect(result.absent).toEqual({
      side: "translation",
      message: "No translation.",
    });
  });

  it("matches a version-title warning key after underscore substitution", () => {
    const result = createBilingualSegmentViewModel(
      payloadWith(
        [primaryVersion()],
        [
          {
            "translation|The Contemporary Torah": {
              warning_code: 102,
              message: "No such translation edition.",
            },
          },
        ],
      ),
      {
        tref: "Genesis 1:1",
        translation: { versionTitle: "The_Contemporary_Torah" },
      },
    );

    expect(result.state).toBe("partial");
    if (result.state !== "partial") return;
    expect(result.absent.message).toBe("No such translation edition.");
  });

  it("falls back to a component message when no warning key matches", () => {
    const result = createBilingualSegmentViewModel(
      payloadWith(
        [primaryVersion()],
        [{ hebrew: { warning_code: 103, message: "Unrelated selector." } }],
      ),
      REQUEST,
    );

    expect(result.state).toBe("partial");
    if (result.state !== "partial") return;
    expect(result.absent.message).not.toBe("Unrelated selector.");
    expect(result.absent.message.length).toBeGreaterThan(0);
  });
});

describe("loadBilingualSegmentViewModel", () => {
  it("makes exactly one request carrying both role selectors", async () => {
    const { fetchMock, client } = clientReturning(bothSides());

    await loadBilingualSegmentViewModel(REQUEST, client);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const requested = fetchMock.mock.calls[0]?.[0] as Request;
    expect(requested.url).toBe(
      "https://example.test/api/v3/texts/Genesis%201%3A1?version=primary&version=translation&return_format=default",
    );
  });

  it("serializes an exact edition for one side only", async () => {
    const { fetchMock, client } = clientReturning(bothSides());

    await loadBilingualSegmentViewModel(
      { tref: "Genesis 1:1", translation: { versionTitle: "Example English" } },
      client,
    );

    const requested = fetchMock.mock.calls[0]?.[0] as Request;
    expect(decodeURIComponent(requested.url)).toContain(
      "version=translation|Example English",
    );
    expect(decodeURIComponent(requested.url)).toContain("version=primary&");
  });

  it("equals the pure factory for a captured payload", async () => {
    const payload = bothSides();
    const { client } = clientReturning(payload);

    await expect(
      loadBilingualSegmentViewModel(REQUEST, client),
    ).resolves.toEqual(createBilingualSegmentViewModel(payload, REQUEST));
  });

  it("maps a documented HTTP failure to an error view model", async () => {
    const { client } = clientReturning({ error: "No text for that ref." }, 404);

    const result = await loadBilingualSegmentViewModel(REQUEST, client);

    expect(result).toEqual({
      state: "error",
      errorKind: "http",
      status: 404,
      message: "No text for that ref.",
    });
  });

  it("rejects a blank reference before making a request", async () => {
    const { fetchMock, client } = clientReturning(bothSides());

    await expect(
      loadBilingualSegmentViewModel({ tref: "  " }, client),
    ).rejects.toBeInstanceOf(TypeError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a blank version title before making a request", async () => {
    const { fetchMock, client } = clientReturning(bothSides());

    await expect(
      loadBilingualSegmentViewModel(
        { tref: "Genesis 1:1", primary: { versionTitle: " " } },
        client,
      ),
    ).rejects.toBeInstanceOf(TypeError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a network failure rather than returning a state", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => {
      throw new TypeError("Network down.");
    });
    const client = createSefariaClient({
      baseUrl: "https://example.test",
      fetch: fetchMock,
    });

    await expect(
      loadBilingualSegmentViewModel(REQUEST, client),
    ).rejects.toThrow();
  });

  it("preserves an abort by identity", async () => {
    const controller = new AbortController();
    const aborted = new DOMException("Obsolete request", "AbortError");
    const client = createSefariaClient({
      baseUrl: "https://example.test",
      fetch: async () => {
        throw aborted;
      },
    });

    await expect(
      loadBilingualSegmentViewModel(REQUEST, client, controller.signal),
    ).rejects.toBe(aborted);
  });
});
