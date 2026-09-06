import { createClient } from "@hey-api/client-fetch";
import { describe, expect, it, vi } from "vitest";

import {
  createSefariaClient,
  getAsyncTaskStatus,
  getIndexV2,
  getLinks,
  getRef,
  getShape,
  getTextVersions,
  getV3Texts,
  postFindRefs,
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
  it("caches validated public-data GET responses by default", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      jsonResponse([], 200, { headers: { "x-cache-test": "network" } }),
    );
    const client = createSefariaClient({
      baseUrl: "https://example.test",
      fetch: fetchMock,
    });

    const first = await getTextVersions({
      client,
      path: { tref: "Genesis 1:1" },
    });
    const second = await getTextVersions({
      client,
      path: { tref: "Genesis 1:1" },
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(first.data).toEqual([]);
    expect(second.data).toEqual([]);
    expect(first.response).not.toBe(second.response);
    expect(second.response?.headers.get("x-cache-test")).toBe("network");
  });

  it("returns independent parsed data for each cache hit", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      jsonResponse([
        {
          title: "Genesis",
          versionTitle: "Original",
          versionSource: null,
          language: "he",
          status: null,
        },
      ]),
    );
    const client = createSefariaClient({ fetch: fetchMock });
    const first = await getTextVersions({
      client,
      path: { tref: "Genesis 1:1" },
    });
    if (!Array.isArray(first.data)) {
      throw new Error("Expected a versions array.");
    }
    first.data[0]!.versionTitle = "Mutated caller value";

    const second = await getTextVersions({
      client,
      path: { tref: "Genesis 1:1" },
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(Array.isArray(second.data) && second.data[0]?.versionTitle).toBe(
      "Original",
    );
  });

  it("can disable caching and clear a configured cache", async () => {
    const disabledFetch = vi.fn<typeof fetch>(async () => jsonResponse([]));
    const disabled = createSefariaClient({
      fetch: disabledFetch,
      cache: false,
    });

    await getTextVersions({
      client: disabled,
      path: { tref: "Genesis 1:1" },
    });
    await getTextVersions({
      client: disabled,
      path: { tref: "Genesis 1:1" },
    });
    disabled.clearCache();

    expect(disabledFetch).toHaveBeenCalledTimes(2);

    const cachedFetch = vi.fn<typeof fetch>(async () => jsonResponse([]));
    const cached = createSefariaClient({ fetch: cachedFetch });
    await getTextVersions({
      client: cached,
      path: { tref: "Genesis 1:1" },
    });
    cached.clearCache();
    await getTextVersions({
      client: cached,
      path: { tref: "Genesis 1:1" },
    });

    expect(cachedFetch).toHaveBeenCalledTimes(2);
  });

  it("separates request keys and applies TTL, entry, and body-size limits", async () => {
    let responseNumber = 0;
    const fetchMock = vi.fn<typeof fetch>(async () => {
      responseNumber += 1;
      return jsonResponse([
        {
          title: "Genesis",
          versionTitle: `Version ${responseNumber}`,
          versionSource: null,
          language: "he",
          status: null,
        },
      ]);
    });
    const client = createSefariaClient({
      baseUrl: "https://example.test",
      fetch: fetchMock,
      cache: { ttlMs: 20, maxEntries: 1, maxBytes: 1_024 },
    });

    await getTextVersions({ client, path: { tref: "Genesis 1:1" } });
    await getTextVersions({ client, path: { tref: "Exodus 1:1" } });
    await getTextVersions({ client, path: { tref: "Genesis 1:1" } });
    expect(fetchMock).toHaveBeenCalledTimes(3);

    await getTextVersions({ client, path: { tref: "Genesis 1:1" } });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    await new Promise((resolve) => setTimeout(resolve, 30));
    await getTextVersions({ client, path: { tref: "Genesis 1:1" } });
    expect(fetchMock).toHaveBeenCalledTimes(4);

    const oversizedFetch = vi.fn<typeof fetch>(async () =>
      jsonResponse([
        {
          title: "Genesis",
          versionTitle: "Too large",
          versionSource: null,
          language: "he",
          status: null,
        },
      ]),
    );
    const byteBounded = createSefariaClient({
      fetch: oversizedFetch,
      cache: { maxBytes: 1 },
    });
    await getTextVersions({
      client: byteBounded,
      path: { tref: "Genesis 1:1" },
    });
    await getTextVersions({
      client: byteBounded,
      path: { tref: "Genesis 1:1" },
    });
    expect(oversizedFetch).toHaveBeenCalledTimes(2);
  });

  it("does not cache negative, error, polling, or restrictive responses", async () => {
    const negativeFetch = vi.fn<typeof fetch>(async () =>
      jsonResponse({ is_ref: false }),
    );
    const negativeClient = createSefariaClient({ fetch: negativeFetch });
    await getRef({ client: negativeClient, path: { tref: "Missing" } });
    await getRef({ client: negativeClient, path: { tref: "Missing" } });
    expect(negativeFetch).toHaveBeenCalledTimes(2);

    const errorFetch = vi.fn<typeof fetch>(async () =>
      jsonResponse({ error: "missing" }),
    );
    const errorClient = createSefariaClient({ fetch: errorFetch });
    await getTextVersions({
      client: errorClient,
      path: { tref: "Missing" },
    });
    await getTextVersions({
      client: errorClient,
      path: { tref: "Missing" },
    });
    expect(errorFetch).toHaveBeenCalledTimes(2);

    const pollingFetch = vi.fn<typeof fetch>(async () =>
      jsonResponse({
        task_id: "task",
        state: "SUCCESS",
        ready: true,
        result: {},
      }),
    );
    const pollingClient = createSefariaClient({ fetch: pollingFetch });
    await getAsyncTaskStatus({
      client: pollingClient,
      path: { task_id: "task" },
    });
    await getAsyncTaskStatus({
      client: pollingClient,
      path: { task_id: "task" },
    });
    expect(pollingFetch).toHaveBeenCalledTimes(2);

    const privateFetch = vi.fn<typeof fetch>(async () =>
      jsonResponse([], 200, {
        headers: { "cache-control": "private, max-age=600" },
      }),
    );
    const privateClient = createSefariaClient({ fetch: privateFetch });
    await getTextVersions({
      client: privateClient,
      path: { tref: "Genesis 1:1" },
    });
    await getTextVersions({
      client: privateClient,
      path: { tref: "Genesis 1:1" },
    });
    expect(privateFetch).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["malformed age", { "cache-control": "max-age=600", age: "unknown" }],
    ["multi-valued age", { "cache-control": "max-age=600", age: "0, 1" }],
    ["expired age", { "cache-control": "max-age=60", age: "60" }],
    ["zero max-age", { "cache-control": "max-age=0" }],
  ])("does not cache responses with %s", async (_name, headers) => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      jsonResponse([], 200, { headers }),
    );
    const client = createSefariaClient({ fetch: fetchMock });

    await getTextVersions({
      client,
      path: { tref: "Genesis 1:1" },
    });
    await getTextVersions({
      client,
      path: { tref: "Genesis 1:1" },
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("resolves the global fetch implementation when each request starts", async () => {
    const originalFetch = globalThis.fetch;
    const lateFetch = vi.fn<typeof fetch>(async () => jsonResponse([]));
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      value: undefined,
      writable: true,
    });

    try {
      const cached = createSefariaClient({
        baseUrl: "https://example.test",
      });
      const uncached = createSefariaClient({
        baseUrl: "https://example.test",
        cache: false,
      });
      globalThis.fetch = lateFetch;

      await getTextVersions({
        client: cached,
        path: { tref: "Genesis 1:1" },
      });
      await getTextVersions({
        client: uncached,
        path: { tref: "Exodus 1:1" },
      });

      expect(lateFetch).toHaveBeenCalledTimes(2);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("checks the current abort signal on a cache hit", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => jsonResponse([]));
    const client = createSefariaClient({ fetch: fetchMock });
    await getTextVersions({
      client,
      path: { tref: "Genesis 1:1" },
    });

    const controller = new AbortController();
    const abort = new DOMException("cancelled cached read", "AbortError");
    controller.abort(abort);

    await expect(
      getTextVersions({
        client,
        path: { tref: "Genesis 1:1" },
        signal: controller.signal,
      }),
    ).rejects.toBe(abort);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("does not repopulate after clear while a response is pending", async () => {
    let resolveFetch!: (response: Response) => void;
    const firstResponse = new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockImplementationOnce(async () => await firstResponse)
      .mockImplementationOnce(async () => jsonResponse([]));
    const client = createSefariaClient({ fetch: fetchMock });

    const pending = getTextVersions({
      client,
      path: { tref: "Genesis 1:1" },
    });
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    client.clearCache();
    resolveFetch(jsonResponse([]));
    await pending;
    await getTextVersions({
      client,
      path: { tref: "Genesis 1:1" },
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("bypasses requests carrying authorization", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => jsonResponse([]));
    const client = createSefariaClient({ fetch: fetchMock });

    await getTextVersions({
      client,
      path: { tref: "Genesis 1:1" },
      headers: { authorization: "Bearer secret" },
    });
    await getTextVersions({
      client,
      path: { tref: "Genesis 1:1" },
      headers: { authorization: "Bearer secret" },
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("rejects invalid cache limits", () => {
    expect(() => createSefariaClient({ cache: { ttlMs: 0 } })).toThrowError(
      TypeError,
    );
    expect(() =>
      createSefariaClient({ cache: { maxEntries: Number.NaN } }),
    ).toThrowError(TypeError);
    expect(() => createSefariaClient({ cache: { maxBytes: -1 } })).toThrowError(
      TypeError,
    );
  });

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

  it("rejects clients not returned by createSefariaClient", async () => {
    const unsafeClient = createClient({
      fetch: async () => jsonResponse([]),
    });

    expect(() =>
      getTextVersions({
        // @ts-expect-error Runtime callers can still supply untyped JavaScript.
        client: unsafeClient,
        path: { tref: "Genesis 1:1" },
      }),
    ).toThrow("Generated Sefaria SDK functions require createSefariaClient().");

    const validClient = createSefariaClient({
      fetch: async () => jsonResponse([]),
    });
    const inheritedBrand = Object.create(validClient, {
      get: {
        value: async () => ({ data: { unvalidated: true } }),
      },
    }) as {
      get: () => Promise<{ data: unknown }>;
    };

    expect(() =>
      getTextVersions({
        // @ts-expect-error Runtime callers can still supply untyped JavaScript.
        client: inheritedBrand,
        path: { tref: "Genesis 1:1" },
      }),
    ).toThrow("Generated Sefaria SDK functions require createSefariaClient().");
  });

  it("forces fields responses and generated validators at runtime", async () => {
    const replacementValidator = vi.fn(() => {
      throw new Error("caller validator ran");
    });
    const replacementTransformer = vi.fn(async () => ({
      malformed: true,
    }));
    const client = createSefariaClient({
      fetch: async () => jsonResponse([]),
    });

    const styledResult = await getTextVersions({
      client,
      path: { tref: "Genesis 1:1" },
      // @ts-expect-error Untyped JavaScript callers can still pass this option.
      responseStyle: "data",
    });
    const validatedResult = await getTextVersions({
      client,
      path: { tref: "Genesis 1:1" },
      // @ts-expect-error Untyped JavaScript callers can still pass this option.
      responseValidator: replacementValidator,
    });
    const parsedResult = await getTextVersions({
      client,
      path: { tref: "Genesis 1:1" },
      // @ts-expect-error Untyped JavaScript callers can still pass this option.
      parseAs: "text",
    });
    const transformedResult = await getTextVersions({
      client,
      path: { tref: "Genesis 1:1" },
      // @ts-expect-error Untyped JavaScript callers can still pass this option.
      responseTransformer: replacementTransformer,
    });

    expect(styledResult.data).toEqual([]);
    expect(validatedResult.data).toEqual([]);
    expect(parsedResult.data).toEqual([]);
    expect(transformedResult.data).toEqual([]);
    expect(replacementValidator).not.toHaveBeenCalled();
    expect(replacementTransformer).not.toHaveBeenCalled();
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

  it("serializes and validates find-refs submission and task polling", async () => {
    const requests: { url: string; method: string; body: string | null }[] = [];
    const responses = [
      jsonResponse({ task_id: "task" }, 202),
      jsonResponse({
        task_id: "task",
        state: "SUCCESS",
        ready: true,
        result: {
          title: { results: [], refData: {} },
          body: { results: [], refData: {} },
        },
      }),
    ];
    const client = createSefariaClient({
      baseUrl: "https://example.test",
      fetch: async (request, init) => {
        const normalized =
          request instanceof Request ? request : new Request(request, init);
        requests.push({
          url: normalized.url,
          method: normalized.method,
          body: await normalized.clone().text(),
        });
        const response = responses.shift();
        if (response === undefined) {
          throw new Error("Unexpected request.");
        }
        return response;
      },
    });

    await postFindRefs({
      client,
      query: { with_text: "0", debug: "0", max_segments: 20 },
      body: {
        text: { title: "Demo", body: "Genesis 1:1" },
        lang: "en",
      },
    });
    await getAsyncTaskStatus({
      client,
      path: { task_id: "task" },
    });

    expect(requests).toEqual([
      {
        url: "https://example.test/api/find-refs?with_text=0&debug=0&max_segments=20",
        method: "POST",
        body: JSON.stringify({
          text: { title: "Demo", body: "Genesis 1:1" },
          lang: "en",
        }),
      },
      {
        url: "https://example.test/api/async/task",
        method: "GET",
        body: "",
      },
    ]);
  });

  it("encodes getRef paths and validates its response", async () => {
    let requestedUrl = "";
    const body = {
      is_ref: true,
      normalized: "Sheet 643492",
      hebrew: "Sheet",
      url_ref: "Sheet.643492",
      index_title: "Sheet",
      node_type: "SheetNode",
      navigation_refs: {
        shortest_path_to_root: ["Sheet"],
        first_subref: "Sheet 643492:1",
        last_subref: "Sheet 643492:22",
      },
      sheet_id: 643492,
    };
    const client = createSefariaClient({
      baseUrl: "https://example.test",
      fetch: async (request) => {
        requestedUrl =
          request instanceof Request ? request.url : request.toString();
        return jsonResponse(body);
      },
    });

    const result = await getRef({
      client,
      path: { tref: "Sheet 643492" },
    });

    expect(requestedUrl).toBe("https://example.test/api/ref/Sheet%20643492");
    expect(result.data).toEqual(body);
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
