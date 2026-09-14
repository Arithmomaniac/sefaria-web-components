import { describe, expect, it } from "vitest";

import { classifySiteRequest } from "../scripts/site-request-policy.mjs";

const siteOrigin = "http://127.0.0.1:4179";
const admittedText =
  "https://www.sefaria.org/api/v3/texts/Micah%206%3A8?version=primary&version=translation&return_format=default";
const admittedLinks =
  "https://www.sefaria.org/api/links/Micah%206%3A8?with_text=1&with_sheet_links=0";

describe("documentation site request policy", () => {
  it("admits only exact fixture-backed Reader requests", () => {
    expect(
      classifySiteRequest({
        method: "GET",
        requestUrl: admittedText,
        siteOrigin,
      }),
    ).toBe("text-fixture");
    expect(
      classifySiteRequest({
        method: "GET",
        requestUrl:
          "https://www.sefaria.org/api/v3/texts/Micah%206%3A8?version=translation&return_format=default&version=primary",
        siteOrigin,
      }),
    ).toBe("text-fixture");
    expect(
      classifySiteRequest({
        method: "GET",
        requestUrl: admittedLinks,
        siteOrigin,
      }),
    ).toBe("links-fixture");
    expect(
      classifySiteRequest({
        method: "GET",
        requestUrl:
          "https://www.sefaria.org/api/v3/texts/Micah%206?version=primary&version=translation&return_format=default",
        siteOrigin,
      }),
    ).toBe("text-fixture");
  });

  it.each([
    ["POST", admittedText],
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
    ["GET", "https://www.sefaria.org/api/links/Micah%206%3A8?with_text=1"],
  ])("denies unapproved %s request %s", (method, requestUrl) => {
    expect(classifySiteRequest({ method, requestUrl, siteOrigin })).toBe(
      "deny",
    );
  });
});
