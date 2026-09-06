import { expect, test, vi } from "vitest";

import { createSefariaClient, getTextVersions } from "../src/index.js";

test("replays an independent validated Response in Chromium", async () => {
  const responseUrl = "data:application/json,%5B%5D";
  const fetchMock = vi.fn<typeof fetch>(async (request) => {
    const normalized =
      request instanceof Request ? request : new Request(request);
    return await fetch(
      new Request(responseUrl, {
        signal: normalized.signal,
      }),
    );
  });
  const client = createSefariaClient({
    baseUrl: "https://example.test",
    fetch: fetchMock,
  });
  const firstController = new AbortController();

  const first = await getTextVersions({
    client,
    path: { tref: "Genesis 1:1" },
    signal: firstController.signal,
  });
  firstController.abort();
  const second = await getTextVersions({
    client,
    path: { tref: "Genesis 1:1" },
    signal: new AbortController().signal,
  });

  expect(fetchMock).toHaveBeenCalledOnce();
  expect(first.data).toEqual([]);
  expect(second.data).toEqual([]);
  expect(first.response).not.toBe(second.response);
  expect(first.response?.url).toBe(responseUrl);
  expect(second.response?.url).toBe(responseUrl);
  expect(first.response?.type).toBe(second.response?.type);
  expect(first.response?.redirected).toBe(second.response?.redirected);
});
