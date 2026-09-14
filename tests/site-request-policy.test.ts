import { describe, expect, it } from "vitest";

import { classifySiteRequest } from "../scripts/site-request-policy.mjs";

const siteOrigin = "http://127.0.0.1:4179";
const admitted =
  "https://www.sefaria.org/api/v3/texts/Micah%206%3A8?version=primary&version=translation&return_format=default";

describe("documentation site request policy", () => {
  it("admits only the exact fixture-backed text request", () => {
    expect(
      classifySiteRequest({
        method: "GET",
        requestUrl: admitted,
        siteOrigin,
      }),
    ).toBe("fixture");
  });

  it.each([
    ["POST", admitted],
    [
      "GET",
      "https://www.sefaria.org/api/v3/texts/Nahum%201%3A7?version=primary&version=translation&return_format=default",
    ],
    [
      "GET",
      "https://www.sefaria.org/api/v3/texts/Micah%206%3A8?version=primary&return_format=default",
    ],
    [
      "GET",
      "https://www.sefaria.org/api/v3/texts/Micah%206%3A8?version=primary&version=translation&return_format=default&context=1",
    ],
    [
      "GET",
      "https://example.com/api/v3/texts/Micah%206%3A8?version=primary&version=translation&return_format=default",
    ],
  ])("denies unapproved %s request %s", (method, requestUrl) => {
    expect(classifySiteRequest({ method, requestUrl, siteOrigin })).toBe(
      "deny",
    );
  });
});
