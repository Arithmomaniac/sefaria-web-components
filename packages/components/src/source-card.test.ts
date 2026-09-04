import {
  createSefariaClient,
  validateGetV3Texts200,
  type CoreV3TextsResponse,
  type CoreV3TextValue,
  type CoreV3Version,
} from "@sefaria/client";
import { describe, expect, it, vi } from "vitest";

import { v3SourceBackedPayload } from "../../../tests/compatibility/src/v3-source-backed.fixture.js";
import {
  createSourceCardViewModel,
  loadSourceCardViewModel,
  type SourceCardRequest,
} from "./source-card.js";

const REQUEST: SourceCardRequest = { tref: "Genesis 1:1-3" };

function basePayload(): CoreV3TextsResponse {
  if (!validateGetV3Texts200(v3SourceBackedPayload)) {
    throw new TypeError("Expected a valid v3 texts fixture.");
  }
  return structuredClone(v3SourceBackedPayload) as CoreV3TextsResponse;
}

function primaryVersion(text: CoreV3TextValue): CoreV3Version {
  const version = basePayload().versions[0];
  if (!version) {
    throw new Error("Source-backed payload must contain one version.");
  }
  return { ...version, text };
}

function translationVersion(text: CoreV3TextValue): CoreV3Version {
  return {
    ...primaryVersion(text),
    versionTitle: "Example English",
    versionSource: "Example publisher",
    language: "en",
    actualLanguage: "en",
    languageFamilyName: "english",
    isSource: false,
    isPrimary: false,
    direction: "ltr",
    text,
  };
}

function payloadWith(
  primaryText: CoreV3TextValue | undefined,
  translationText: CoreV3TextValue | undefined,
): CoreV3TextsResponse {
  const payload = basePayload();
  payload.ref = REQUEST.tref;
  payload.heRef = "בראשית א׳:א׳-ג׳";
  payload.primary_category = "Tanakh";
  payload.indexTitle = "Genesis";
  payload.heIndexTitle = "בראשית";
  payload.categories = ["Tanakh", "Torah"];
  payload.versions = [
    ...(primaryText === undefined ? [] : [primaryVersion(primaryText)]),
    ...(translationText === undefined
      ? []
      : [translationVersion(translationText)]),
  ];
  payload.warnings = [];
  return payload;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("createSourceCardViewModel", () => {
  it("treats a scalar segment as one item", () => {
    const result = createSourceCardViewModel(
      payloadWith("Primary.", "Translation."),
      { tref: "Genesis 1:1" },
    );

    expect(result.state).toBe("data");
    if (result.state !== "data") return;
    expect(result.header).toEqual({
      ref: "Genesis 1:1-3",
      heRef: "בראשית א׳:א׳-ג׳",
      indexTitle: "Genesis",
      heIndexTitle: "בראשית",
      primaryCategory: "Tanakh",
      categories: ["Tanakh", "Torah"],
    });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.position).toEqual([]);
    expect(result.items[0]?.pair.state).toBe("data");
  });

  it("flattens nested text by position even when isSpanning is false", () => {
    const payload = payloadWith(
      [["Primary 1.", "Primary 2."], ["Primary 3."]],
      [["Translation 1.", "Translation 2."], ["Translation 3."]],
    );
    payload.isSpanning = false;

    const result = createSourceCardViewModel(payload, REQUEST);

    expect(result.state).toBe("data");
    if (result.state !== "data") return;
    expect(result.items.map((item) => item.position)).toEqual([
      [0, 0],
      [0, 1],
      [1, 0],
    ]);
  });

  it("aligns the union of position paths instead of dropping one-sided leaves", () => {
    const result = createSourceCardViewModel(
      payloadWith([["Primary 1.", "Primary 2."]], [[]]),
      REQUEST,
    );

    expect(result.state).toBe("data");
    if (result.state !== "data") return;
    expect(result.items.map((item) => item.position)).toEqual([
      [0, 0],
      [0, 1],
    ]);
    expect(
      result.items.map((item) =>
        item.pair.state === "partial" ? item.pair.absent.side : undefined,
      ),
    ).toEqual(["translation", "translation"]);
  });

  it("skips empty groups without creating blank items", () => {
    const result = createSourceCardViewModel(
      payloadWith(
        [["One.", "Two.", "Three."], [], [], ["Four."], [], [], ["Five."]],
        undefined,
      ),
      REQUEST,
    );

    expect(result.state).toBe("data");
    if (result.state !== "data") return;
    expect(result.items.map((item) => item.position)).toEqual([
      [0, 0],
      [0, 1],
      [0, 2],
      [3, 0],
      [6, 0],
    ]);
  });

  it("uses an attributed selector warning for a globally absent side", () => {
    const payload = payloadWith(["One.", "Two."], undefined);
    payload.warnings = [
      {
        translation: {
          warning_code: 102,
          message: "No translation is available.",
        },
      },
    ];

    const result = createSourceCardViewModel(payload, REQUEST);

    expect(result.state).toBe("data");
    if (result.state !== "data") return;
    expect(
      result.items.map((item) =>
        item.pair.state === "partial" ? item.pair.absent.message : undefined,
      ),
    ).toEqual(["No translation is available.", "No translation is available."]);
  });

  it("returns empty when neither side has a renderable leaf", () => {
    const result = createSourceCardViewModel(
      payloadWith([null, " "], [null, "<script>unsafe()</script>"]),
      REQUEST,
    );

    expect(result.state).toBe("empty");
    if (result.state !== "empty") return;
    expect(result.absent.map((side) => side.side)).toEqual([
      "primary",
      "translation",
    ]);
  });

  it("returns a projection error for scalar-array disagreement", () => {
    const result = createSourceCardViewModel(
      payloadWith(["Primary."], [["Translation."]]),
      REQUEST,
    );

    expect(result).toMatchObject({
      state: "error",
      errorKind: "projection",
    });
  });

  it("returns a projection error for null-array disagreement", () => {
    const result = createSourceCardViewModel(
      payloadWith([null], [["Translation."]]),
      REQUEST,
    );

    expect(result).toMatchObject({
      state: "error",
      errorKind: "projection",
    });
  });

  it("projects a realistic large payload without truncation", () => {
    const text = Array.from({ length: 500 }, (_, index) => `Segment ${index}.`);

    const result = createSourceCardViewModel(payloadWith(text, text), REQUEST);

    expect(result.state).toBe("data");
    if (result.state !== "data") return;
    expect(result.items).toHaveLength(500);
    expect(result.items.at(-1)?.position).toEqual([499]);
  });
});

describe("loadSourceCardViewModel", () => {
  it("makes one request and equals the pure result for ten items", async () => {
    const payload = payloadWith(
      Array.from({ length: 10 }, (_, index) => `Primary ${index}.`),
      Array.from({ length: 10 }, (_, index) => `Translation ${index}.`),
    );
    const fetchMock = vi.fn<typeof fetch>(async () => jsonResponse(payload));
    const client = createSefariaClient({
      baseUrl: "https://example.test",
      fetch: fetchMock,
    });

    await expect(loadSourceCardViewModel(REQUEST, client)).resolves.toEqual(
      createSourceCardViewModel(payload, REQUEST),
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects blank input before making a request", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    const client = createSefariaClient({
      baseUrl: "https://example.test",
      fetch: fetchMock,
    });

    await expect(
      loadSourceCardViewModel({ tref: " " }, client),
    ).rejects.toThrow(TypeError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([400, 404] as const)(
    "maps a documented HTTP %i response",
    async (status) => {
      const client = createSefariaClient({
        baseUrl: "https://example.test",
        fetch: async () => jsonResponse({ error: "Bad reference." }, status),
      });

      await expect(loadSourceCardViewModel(REQUEST, client)).resolves.toEqual({
        state: "error",
        errorKind: "http",
        status,
        message: "Bad reference.",
      });
    },
  );
});
