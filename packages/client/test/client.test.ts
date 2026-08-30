import { describe, expect, it, vi } from "vitest";

import {
  createSefariaClient,
  getIndexV2,
  getLinks,
  getShape,
  getTextVersions,
  getV3Texts,
  type SefariaClientOptions,
} from "../src/index.js";
import { SefariaContractError } from "../src/contract-error.js";
import {
  validateResponse,
  type ResponseValidatorLookup,
} from "../src/validation.js";

function jsonResponse(
  body: unknown,
  status = 200,
  init: Omit<ResponseInit, "status"> = {},
): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...init.headers,
    },
  });
}

describe("generated Sefaria SDK", () => {
  it("returns a validated documented success payload", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => jsonResponse([]));
    const client = createSefariaClient({ fetch: fetchMock });

    const result = await getTextVersions({
      client,
      path: { tref: "Genesis 1:1" },
    });

    expect(result.data).toEqual([]);
    expect(result.error).toBeUndefined();
    expect(result.response?.status).toBe(200);
  });

  it("keeps a validated documented HTTP error as a typed error result", async () => {
    const body = {
      error: "with_text is not supported for whole-book refs.",
      ref: "Genesis",
    };
    const client = createSefariaClient({
      fetch: async () => jsonResponse(body, 400),
    });

    const result = await getLinks({
      client,
      path: { tref: "Genesis" },
    });

    expect(result.data).toBeUndefined();
    expect(result.error).toEqual(body);
    expect(result.response?.status).toBe(400);
  });

  it("uses the configurable baseUrl and injected fetch", async () => {
    let requestedUrl = "";
    const options: SefariaClientOptions = {
      baseUrl: "https://example.test/root",
      fetch: async (request) => {
        requestedUrl =
          request instanceof Request ? request.url : request.toString();
        return jsonResponse([]);
      },
    };
    const client = createSefariaClient(options);

    await getTextVersions({
      client,
      path: { tref: "Genesis 1:1" },
    });

    expect(requestedUrl).toBe(
      "https://example.test/root/api/texts/versions/Genesis%201%3A1",
    );
  });

  it("serializes repeatable v3 versions, link categories, and shape flags", async () => {
    const requestedUrls: string[] = [];
    const client = createSefariaClient({
      baseUrl: "https://example.test",
      fetch: async (request) => {
        requestedUrls.push(
          request instanceof Request ? request.url : request.toString(),
        );
        return requestedUrls.length === 1
          ? jsonResponse({ error: "fixture" }, 400)
          : jsonResponse({ error: "fixture" });
      },
    });

    await getV3Texts({
      client,
      path: { tref: "Genesis 1:1" },
      query: { version: ["hebrew", "english|Test Version"] },
    });
    await getShape({
      client,
      path: { title: "Tanakh" },
      query: { dependents: "1" },
    });
    await getLinks({
      client,
      path: { tref: "Genesis 1:1" },
      query: {
        category: ["Commentary", "Midrash"],
        with_text: "0",
      },
    });

    expect(requestedUrls).toEqual([
      "https://example.test/api/v3/texts/Genesis%201%3A1?version=hebrew&version=english%7CTest%20Version",
      "https://example.test/api/shape/Tanakh?dependents=1",
      "https://example.test/api/links/Genesis%201%3A1?category=Commentary&category=Midrash&with_text=0",
    ]);
  });

  it("returns HTTP 200 versions and links errors through their response unions", async () => {
    const bodies = [
      { error: "invalid text reference" },
      { error: "invalid link reference" },
    ];
    const client = createSefariaClient({
      fetch: async () => jsonResponse(bodies.shift()),
    });

    const versions = await getTextVersions({
      client,
      path: { tref: "Invalid" },
    });
    const links = await getLinks({
      client,
      path: { tref: "Invalid" },
    });

    expect(versions.data).toEqual({ error: "invalid text reference" });
    expect(links.data).toEqual({ error: "invalid link reference" });
  });

  it("returns an HTTP 200 index error as its documented response union", async () => {
    const body = { error: "No book named 'Missing'." };
    const client = createSefariaClient({
      fetch: async () => jsonResponse(body),
    });

    const result = await getIndexV2({
      client,
      path: { title: "Missing" },
    });

    expect(result.data).toEqual(body);
    expect(result.error).toBeUndefined();
  });

  it("accepts nullable version metadata returned by the versions endpoint", async () => {
    const body = [
      {
        title: "Rashi on Genesis",
        versionTitle: "test",
        versionSource: null,
        language: "he",
        status: null,
      },
    ];
    const client = createSefariaClient({
      fetch: async () => jsonResponse(body),
    });

    await expect(
      getTextVersions({
        client,
        path: { tref: "Rashi on Genesis" },
      }),
    ).resolves.toMatchObject({ data: body });
  });

  it("rejects malformed JSON without consuming the original response", async () => {
    const response = new Response("{", {
      status: 200,
      statusText: "OK",
      headers: {
        "content-type": "application/json",
        "x-contract-test": "malformed",
      },
    });
    const client = createSefariaClient({
      fetch: async () => response,
    });

    try {
      await getTextVersions({
        client,
        path: { tref: "Genesis 1:1" },
      });
      throw new Error("Expected malformed JSON to reject.");
    } catch (error) {
      expect(error).toBeInstanceOf(SefariaContractError);
      if (!(error instanceof SefariaContractError)) {
        throw error;
      }
      expect(error).toMatchObject({
        operationId: "get-versions",
        method: "GET",
        path: "/api/texts/versions/{tref}",
        status: 200,
        issues: [{ instancePath: "", keyword: "invalid-json" }],
        response,
      });
      expect(error.response.statusText).toBe("OK");
      expect(error.response.headers.get("x-contract-test")).toBe("malformed");
      expect(await error.response.text()).toBe("{");
    }
  });

  it("rejects a documented error whose JSON body violates its schema", async () => {
    const response = jsonResponse({ error: 400, ref: "Genesis" }, 400);
    const client = createSefariaClient({
      fetch: async () => response,
    });

    await expect(
      getLinks({
        client,
        path: { tref: "Genesis" },
      }),
    ).rejects.toMatchObject({
      operationId: "get-links",
      status: 400,
      response,
    });
  });

  it("rejects non-JSON content when JSON is documented", async () => {
    const client = createSefariaClient({
      fetch: async () =>
        new Response("[]", {
          status: 200,
          headers: { "content-type": "text/plain" },
        }),
    });

    await expect(
      getTextVersions({
        client,
        path: { tref: "Genesis 1:1" },
      }),
    ).rejects.toMatchObject({
      issues: [{ instancePath: "", keyword: "content-type" }],
    });
  });

  it("rejects a schema mismatch and leaves the original body readable", async () => {
    const response = jsonResponse({ versions: "wrong" });
    const client = createSefariaClient({
      fetch: async () => response,
    });

    try {
      await getV3Texts({
        client,
        path: { tref: "Genesis 1:1" },
      });
      throw new Error("Expected contract validation to reject.");
    } catch (error) {
      expect(error).toBeInstanceOf(SefariaContractError);
      if (!(error instanceof SefariaContractError)) {
        throw error;
      }
      expect(
        error.issues.some((issue) => issue.instancePath === "/versions"),
      ).toBe(true);
      expect(await error.response.json()).toEqual({ versions: "wrong" });
    }
  });

  it("rejects an undocumented status", async () => {
    const client = createSefariaClient({
      fetch: async () => jsonResponse({ error: "teapot" }, 418),
    });

    await expect(
      getTextVersions({
        client,
        path: { tref: "Genesis 1:1" },
      }),
    ).rejects.toMatchObject({
      operationId: "get-versions",
      status: 418,
      issues: [{ instancePath: "", keyword: "undocumented-status" }],
    });
  });

  it("rejects a documented response when its generated validator is missing", async () => {
    const response = jsonResponse([]);
    const missing: ResponseValidatorLookup = () => undefined;

    await expect(
      validateResponse(
        {
          method: "GET",
          path: "/api/texts/versions/{tref}",
          response,
        },
        missing,
      ),
    ).rejects.toMatchObject({
      operationId: "get-versions",
      status: 200,
      issues: [{ instancePath: "", keyword: "missing-validator" }],
      response,
    });
  });

  it("propagates a network rejection unchanged", async () => {
    const failure = new TypeError("network unavailable");
    const client = createSefariaClient({
      fetch: async () => {
        throw failure;
      },
    });

    await expect(
      getTextVersions({
        client,
        path: { tref: "Genesis 1:1" },
      }),
    ).rejects.toBe(failure);
  });

  it("preserves an abort rejection", async () => {
    const controller = new AbortController();
    const abort = new DOMException("cancelled", "AbortError");
    controller.abort(abort);
    const client = createSefariaClient({
      fetch: async (request) => {
        if (request instanceof Request && request.signal.aborted) {
          throw request.signal.reason;
        }
        return jsonResponse([]);
      },
    });

    await expect(
      getTextVersions({
        client,
        path: { tref: "Genesis 1:1" },
        signal: controller.signal,
      }),
    ).rejects.toBe(abort);
  });

  it("preserves an abort that occurs while reading a returned response body", async () => {
    const controller = new AbortController();
    const abort = new DOMException("body cancelled", "AbortError");
    const client = createSefariaClient({
      fetch: async () =>
        new Response(
          new ReadableStream<Uint8Array>({
            pull(stream) {
              controller.abort(abort);
              stream.error(abort);
            },
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        ),
    });

    await expect(
      getTextVersions({
        client,
        path: { tref: "Genesis 1:1" },
        signal: controller.signal,
      }),
    ).rejects.toBe(abort);
  });

  it("preserves a response body stream TypeError", async () => {
    const failure = new TypeError("response stream failed");
    const client = createSefariaClient({
      fetch: async () =>
        new Response(
          new ReadableStream<Uint8Array>({
            pull(stream) {
              stream.error(failure);
            },
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        ),
    });

    await expect(
      getTextVersions({
        client,
        path: { tref: "Genesis 1:1" },
      }),
    ).rejects.toBe(failure);
  });
});
