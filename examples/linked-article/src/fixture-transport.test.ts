import { expect, test } from "vitest";

import micahPayload from "../../vanilla-vite/src/micah-6-8.json";
import { createLinkedArticleFixtureFetch } from "./fixture-transport.js";

test.each([
  [
    "method",
    "https://example.invalid/api/v3/texts/Micah%206%3A8?version=primary&version=translation&return_format=default",
    { method: "POST" },
  ],
  [
    "origin",
    "https://wrong.invalid/api/v3/texts/Micah%206%3A8?version=primary&version=translation&return_format=default",
    undefined,
  ],
  [
    "path",
    "https://example.invalid/api/v3/texts/Micah%206%3A7?version=primary&version=translation&return_format=default",
    undefined,
  ],
  [
    "query",
    "https://example.invalid/api/v3/texts/Micah%206%3A8?return_format=default&version=primary&version=translation",
    undefined,
  ],
])("rejects an unexpected fixture %s", async (_kind, url, init) => {
  const fetch = createLinkedArticleFixtureFetch(micahPayload);
  await expect(fetch(url, init)).rejects.toThrow(
    "Unexpected linked-article request",
  );
});
