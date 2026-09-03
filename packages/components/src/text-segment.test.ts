import {
  createSefariaClient,
  SefariaContractError,
  validateGetV3Texts200,
  type CoreV3TextsResponse,
  type CoreV3Version,
} from "@sefaria/client";
import { describe, expect, it, vi } from "vitest";

import spanningFixture from "../../client/test/fixtures/v3-text-spanning-2026-08-29.json";
import { v3SourceBackedPayload } from "../../../tests/compatibility/src/v3-source-backed.fixture.js";
import {
  createTextSegmentViewModel,
  loadTextSegmentViewModel,
  type TextSegmentRequest,
} from "./text-segment.js";

const SOURCE_REQUEST: TextSegmentRequest = {
  tref: "Genesis 1:1",
  version: { language: "hebrew" },
};

function sourcePayload(): CoreV3TextsResponse {
  return validatedPayload(v3SourceBackedPayload);
}

function validatedPayload(value: unknown): CoreV3TextsResponse {
  if (!validateGetV3Texts200(value)) {
    throw new TypeError("Expected a valid v3 texts fixture.");
  }
  return structuredClone(value) as CoreV3TextsResponse;
}

function englishVersion(overrides: Partial<CoreV3Version> = {}): CoreV3Version {
  const sourceVersion = sourcePayload().versions[0];
  if (!sourceVersion) {
    throw new Error("Source-backed payload must contain one version.");
  }

  return {
    ...sourceVersion,
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
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("createTextSegmentViewModel", () => {
  it("selects the requested language instead of the first version", () => {
    const payload = sourcePayload();
    payload.versions = [
      payload.versions[0]!,
      englishVersion({ direction: "rtl" }),
    ];

    expect(
      createTextSegmentViewModel(payload, {
        tref: "Genesis 1:1",
        version: { language: "ENGLISH" },
      }),
    ).toEqual({
      state: "data",
      ref: "Genesis 1:1",
      heRef: "בראשית א׳:א׳",
      language: "en",
      actualLanguage: "en",
      direction: "rtl",
      body: [{ kind: "html", html: "In the beginning." }],
      notes: [],
      attribution: {
        versionTitle: "Example English",
        versionSource: "Example publisher",
      },
    });
  });

  it("selects an exact version title", () => {
    const payload = sourcePayload();
    payload.versions = [
      englishVersion({ versionTitle: "Other", text: "Other text." }),
      englishVersion({ versionTitle: "Exact", text: "Exact text." }),
    ];

    const result = createTextSegmentViewModel(payload, {
      tref: "Genesis 1:1",
      version: { language: "english", versionTitle: "Exact" },
    });

    expect(result.state).toBe("data");
    if (result.state === "data") {
      expect(result.body).toEqual([{ kind: "html", html: "Exact text." }]);
      expect(result.attribution.versionTitle).toBe("Exact");
    }
  });

  it("sanitizes text, preserves vocalization, and extracts static footnotes", () => {
    expect(createTextSegmentViewModel(sourcePayload(), SOURCE_REQUEST)).toEqual(
      {
        state: "data",
        ref: "Genesis 1:1",
        heRef: "בראשית א׳:א׳",
        language: "he",
        actualLanguage: "he",
        direction: "rtl",
        body: [
          {
            kind: "html",
            html: '<span class="mam-kq-trivial">שְׁעָרָ֗ו</span> — When God began to create',
          },
          { kind: "footnote-marker", noteIndex: 0, markerText: "*" },
          { kind: "html", html: " heaven" },
        ],
        notes: [
          {
            index: 0,
            markerText: "*",
            content: "<b>When God began to create </b>Others.",
          },
        ],
        attribution: {
          versionTitle: "Explicit source-backed compatibility composition",
          versionSource: null,
        },
      },
    );
  });

  it("returns an empty state and preserves warnings when no version matches", () => {
    const payload = sourcePayload();
    payload.warnings = [
      {
        english: {
          warning_code: 101,
          message: "No English version is available.",
        },
      },
    ];

    expect(
      createTextSegmentViewModel(payload, {
        tref: "Genesis 1:1",
        version: { language: "english" },
      }),
    ).toEqual({
      state: "empty",
      ref: "Genesis 1:1",
      heRef: "בראשית א׳:א׳",
      message: "No English version is available.",
      warnings: ["No English version is available."],
    });
  });

  it.each([null, "", "   ", "<script>unsafe()</script>"])(
    "returns empty for non-renderable selected text %#",
    (text) => {
      const payload = sourcePayload();
      payload.versions = [englishVersion({ text })];

      expect(
        createTextSegmentViewModel(payload, {
          tref: "Genesis 1:1",
          version: { language: "english" },
        }).state,
      ).toBe("empty");
    },
  );

  it("returns a projection error instead of choosing an ambiguous version", () => {
    const payload = sourcePayload();
    payload.versions = [englishVersion(), englishVersion()];

    expect(
      createTextSegmentViewModel(payload, {
        tref: "Genesis 1:1",
        version: { language: "english" },
      }),
    ).toEqual({
      state: "error",
      errorKind: "projection",
      message: "Text segment requires one matching version; found 2.",
    });
  });

  it("returns a projection error instead of rendering the first child of array text", () => {
    const payload = validatedPayload(spanningFixture);

    expect(
      createTextSegmentViewModel(payload, {
        tref: payload.ref,
        version: {
          language: payload.versions[0]?.languageFamilyName ?? "hebrew",
        },
      }),
    ).toEqual({
      state: "error",
      errorKind: "projection",
      message: "Text segment requires string or null text; received an array.",
    });
  });
});

describe("loadTextSegmentViewModel", () => {
  it("makes one request with a language-only version selector", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      jsonResponse({
        ...sourcePayload(),
        versions: [englishVersion()],
      }),
    );
    const client = createSefariaClient({
      baseUrl: "https://example.test",
      fetch: fetchMock,
    });

    await loadTextSegmentViewModel(
      {
        tref: "Genesis 1:1",
        version: { language: "english" },
      },
      client,
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const requested = fetchMock.mock.calls[0]?.[0];
    expect(requested).toBeInstanceOf(Request);
    expect((requested as Request).url).toBe(
      "https://example.test/api/v3/texts/Genesis%201%3A1?version=english&return_format=default",
    );
  });

  it("makes one request with the exact selected version and return format", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      jsonResponse({
        ...sourcePayload(),
        versions: [englishVersion({ versionTitle: "Example" })],
      }),
    );
    const client = createSefariaClient({
      baseUrl: "https://example.test",
      fetch: fetchMock,
    });
    const request: TextSegmentRequest = {
      tref: "Genesis 1:1",
      version: { language: "english", versionTitle: "Example" },
    };

    const result = await loadTextSegmentViewModel(request, client);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const requested = fetchMock.mock.calls[0]?.[0];
    expect(requested).toBeInstanceOf(Request);
    expect((requested as Request).url).toBe(
      "https://example.test/api/v3/texts/Genesis%201%3A1?version=english%7CExample&return_format=default",
    );
    expect(result).toEqual(
      createTextSegmentViewModel(
        {
          ...sourcePayload(),
          versions: [englishVersion({ versionTitle: "Example" })],
        },
        request,
      ),
    );
  });

  it.each(["", "   ", "source", "TRANSLATION", "primary", "all"])(
    "rejects unsupported language selector %j before requesting",
    async (language) => {
      const fetchMock = vi.fn<typeof fetch>();
      const client = createSefariaClient({ fetch: fetchMock });

      await expect(
        loadTextSegmentViewModel(
          { tref: "Genesis 1:1", version: { language } },
          client,
        ),
      ).rejects.toBeInstanceOf(TypeError);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("rejects a blank exact version title before requesting", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    const client = createSefariaClient({ fetch: fetchMock });

    await expect(
      loadTextSegmentViewModel(
        {
          tref: "Genesis 1:1",
          version: { language: "english", versionTitle: " " },
        },
        client,
      ),
    ).rejects.toBeInstanceOf(TypeError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([400, 404] as const)(
    "maps a documented HTTP %i body to an error view model",
    async (status) => {
      const client = createSefariaClient({
        fetch: async () => jsonResponse({ error: "Missing text." }, status),
      });

      await expect(
        loadTextSegmentViewModel(SOURCE_REQUEST, client),
      ).resolves.toEqual({
        state: "error",
        errorKind: "http",
        status,
        message: "Missing text.",
      });
    },
  );

  it("preserves a network failure by identity", async () => {
    const failure = new Error("offline");
    const client = createSefariaClient({
      fetch: async () => {
        throw failure;
      },
    });

    await expect(loadTextSegmentViewModel(SOURCE_REQUEST, client)).rejects.toBe(
      failure,
    );
  });

  it("preserves an abort by identity", async () => {
    const controller = new AbortController();
    const aborted = new DOMException("Obsolete request", "AbortError");
    const client = createSefariaClient({
      fetch: async () => {
        throw aborted;
      },
    });

    await expect(
      loadTextSegmentViewModel(SOURCE_REQUEST, client, controller.signal),
    ).rejects.toBe(aborted);
  });

  it("preserves a response contract failure", async () => {
    const client = createSefariaClient({
      fetch: async () => jsonResponse({ versions: "invalid" }),
    });

    await expect(
      loadTextSegmentViewModel(SOURCE_REQUEST, client),
    ).rejects.toBeInstanceOf(SefariaContractError);
  });
});
