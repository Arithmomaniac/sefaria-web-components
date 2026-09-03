import {
  createSefariaClient,
  SefariaContractError,
  validateGetRef200,
  type CoreRefResponse,
} from "@sefaria/client";
import { describe, expect, it, vi } from "vitest";

import rangeFixture from "../../client/test/fixtures/ref-genesis-range-2026-09-03.json";
import segmentFixture from "../../client/test/fixtures/ref-genesis-segment-2026-09-03.json";
import spanningFixture from "../../client/test/fixtures/ref-genesis-spanning-2026-09-03.json";
import commentaryFixture from "../../client/test/fixtures/ref-rashi-commentary-2026-09-03.json";
import unresolvedFixture from "../../client/test/fixtures/ref-unresolved-2026-09-03.json";
import {
  createRefLabelViewModel,
  loadRefLabelViewModel,
  type RefLabelRequest,
} from "./ref-label.js";

const REQUEST: RefLabelRequest = { tref: "Genesis 1:1" };

function validatedPayload(value: unknown): CoreRefResponse {
  if (!validateGetRef200(value)) {
    throw new TypeError("Expected a valid reference fixture.");
  }
  return structuredClone(value) as CoreRefResponse;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("createRefLabelViewModel", () => {
  it.each([
    {
      fixture: segmentFixture,
      tref: "Genesis 1:1",
      normalized: "Genesis 1:1",
      hebrew: "בראשית א׳:א׳",
      urlRef: "Genesis.1.1",
      url: "https://www.sefaria.org/Genesis.1.1",
      indexTitle: "Genesis",
    },
    {
      fixture: rangeFixture,
      tref: "Genesis 1:1-3",
      normalized: "Genesis 1:1-3",
      hebrew: "בראשית א׳:א׳-ג׳",
      urlRef: "Genesis.1.1-3",
      url: "https://www.sefaria.org/Genesis.1.1-3",
      indexTitle: "Genesis",
    },
    {
      fixture: spanningFixture,
      tref: "Genesis 1:31-2:2",
      normalized: "Genesis 1:31-2:2",
      hebrew: "בראשית א׳:ל״א-ב׳:ב׳",
      urlRef: "Genesis.1.31-2.2",
      url: "https://www.sefaria.org/Genesis.1.31-2.2",
      indexTitle: "Genesis",
    },
    {
      fixture: commentaryFixture,
      tref: "Rashi on Genesis 1:1:1",
      normalized: "Rashi on Genesis 1:1:1",
      hebrew: 'רש"י על בראשית א׳:א׳:א׳',
      urlRef: "Rashi_on_Genesis.1.1.1",
      url: "https://www.sefaria.org/Rashi_on_Genesis.1.1.1",
      indexTitle: "Rashi on Genesis",
    },
  ])(
    "projects the deployed $tref payload",
    ({ fixture, tref, normalized, hebrew, urlRef, url, indexTitle }) => {
      expect(
        createRefLabelViewModel(validatedPayload(fixture), { tref }),
      ).toEqual({
        state: "data",
        normalized,
        hebrew,
        urlRef,
        url,
        indexTitle,
        nodeType: "JaggedArrayNode",
      });
    },
  );

  it("returns empty for a deployed unresolvable reference payload", () => {
    expect(
      createRefLabelViewModel(validatedPayload(unresolvedFixture), {
        tref: "__missing_ref_label_probe__",
      }),
    ).toEqual({
      state: "empty",
      tref: "__missing_ref_label_probe__",
      message:
        '"__missing_ref_label_probe__" is not a recognized Sefaria reference.',
    });
  });

  it.each([
    ["Genesis.1.1", "Genesis.1.1"],
    ["Rashi_on_Genesis.1.1.1", "Rashi_on_Genesis.1.1.1"],
    ["Shulchan_Arukh,_Orach_Chayim.1.1", "Shulchan_Arukh,_Orach_Chayim.1.1"],
    ["What_Is_This%3F.1", "What_Is_This%3F.1"],
    ["Weird#Title.1", "Weird%23Title.1"],
  ])("safely encodes url_ref %j", (urlRef, expectedPath) => {
    const payload = validatedPayload(segmentFixture);
    if (!payload.is_ref) {
      throw new Error("The segment fixture must resolve.");
    }
    payload.url_ref = urlRef;

    const result = createRefLabelViewModel(payload, REQUEST, {
      siteOrigin: "https://texts.example.test/some/base",
    });

    expect(result.state).toBe("data");
    if (result.state === "data") {
      expect(result.url).toBe(`https://texts.example.test/${expectedPath}`);
    }
  });

  it.each(["", "   "])("rejects blank tref %j", (tref) => {
    expect(() =>
      createRefLabelViewModel(validatedPayload(segmentFixture), { tref }),
    ).toThrow(TypeError);
  });

  it("rejects a non-HTTP site origin", () => {
    expect(() =>
      createRefLabelViewModel(validatedPayload(segmentFixture), REQUEST, {
        siteOrigin: "javascript:alert(1)",
      }),
    ).toThrow(TypeError);
  });
});

describe("loadRefLabelViewModel", () => {
  it("makes exactly one typed reference request", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      jsonResponse(segmentFixture),
    );
    const client = createSefariaClient({
      baseUrl: "https://example.test",
      fetch: fetchMock,
    });

    await loadRefLabelViewModel(REQUEST, client);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const requested = fetchMock.mock.calls[0]?.[0];
    expect(requested).toBeInstanceOf(Request);
    expect((requested as Request).url).toBe(
      "https://example.test/api/ref/Genesis%201%3A1",
    );
  });

  it("equals the pure result for every captured successful payload", async () => {
    for (const [fixture, request] of [
      [segmentFixture, { tref: "Genesis 1:1" }],
      [rangeFixture, { tref: "Genesis 1:1-3" }],
      [spanningFixture, { tref: "Genesis 1:31-2:2" }],
      [commentaryFixture, { tref: "Rashi on Genesis 1:1:1" }],
    ] as const) {
      const payload = validatedPayload(fixture);
      const client = createSefariaClient({
        fetch: async () => jsonResponse(fixture),
      });

      await expect(loadRefLabelViewModel(request, client)).resolves.toEqual(
        createRefLabelViewModel(payload, request),
      );
    }
  });

  it("rejects a blank tref before requesting", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    const client = createSefariaClient({ fetch: fetchMock });

    await expect(
      loadRefLabelViewModel({ tref: " " }, client),
    ).rejects.toBeInstanceOf(TypeError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid site origin before requesting", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    const client = createSefariaClient({ fetch: fetchMock });

    await expect(
      loadRefLabelViewModel(REQUEST, client, undefined, {
        siteOrigin: "mailto:invalid@example.test",
      }),
    ).rejects.toBeInstanceOf(TypeError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps a documented HTTP 404 body to an error view model", async () => {
    const client = createSefariaClient({
      fetch: async () => jsonResponse({ error: "Reference failed." }, 404),
    });

    await expect(loadRefLabelViewModel(REQUEST, client)).resolves.toEqual({
      state: "error",
      errorKind: "http",
      status: 404,
      message: "Reference failed.",
    });
  });

  it("preserves a network failure by identity", async () => {
    const failure = new Error("offline");
    const client = createSefariaClient({
      fetch: async () => {
        throw failure;
      },
    });

    await expect(loadRefLabelViewModel(REQUEST, client)).rejects.toBe(failure);
  });

  it("preserves an abort by identity", async () => {
    const aborted = new DOMException("Obsolete request", "AbortError");
    const client = createSefariaClient({
      fetch: async () => {
        throw aborted;
      },
    });

    await expect(
      loadRefLabelViewModel(REQUEST, client, new AbortController().signal),
    ).rejects.toBe(aborted);
  });

  it.each([
    [{ is_ref: true }, 200],
    [{ error: "Undocumented failure." }, 500],
  ])("rejects malformed or undocumented response %#", async (body, status) => {
    const client = createSefariaClient({
      fetch: async () => jsonResponse(body, status),
    });

    await expect(loadRefLabelViewModel(REQUEST, client)).rejects.toBeInstanceOf(
      SefariaContractError,
    );
  });
});
