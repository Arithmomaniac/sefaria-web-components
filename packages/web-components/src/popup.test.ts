import {
  createSefariaClient,
  validateGetV3Texts200,
  type CoreV3TextsResponse,
  type CoreV3Version,
} from "@sefaria/client";
import { describe, expect, it, vi } from "vitest";

import { v3SourceBackedPayload } from "../../../tests/compatibility/src/v3-source-backed.fixture.js";
import {
  createPopupViewModel,
  loadPopupViewModel,
  type PopupRequest,
} from "./popup.js";

const REQUEST: PopupRequest = { tref: "Genesis 1:1-25" };

function payloadWithPositions(count: number): CoreV3TextsResponse {
  if (!validateGetV3Texts200(v3SourceBackedPayload)) {
    throw new TypeError("Expected a valid v3 texts fixture.");
  }
  const payload = structuredClone(v3SourceBackedPayload) as CoreV3TextsResponse;
  const primary = payload.versions[0];
  if (!primary) {
    throw new Error("Source-backed payload must contain one version.");
  }
  const translation: CoreV3Version = {
    ...primary,
    versionTitle: "Example translation",
    versionSource: "Example publisher",
    language: "en",
    actualLanguage: "en",
    languageFamilyName: "english",
    isSource: false,
    isPrimary: false,
    direction: "ltr",
    text: Array.from({ length: count }, (_, index) => `Translation ${index}.`),
  };
  primary.text = Array.from(
    { length: count },
    (_, index) => `Primary ${index}.`,
  );
  payload.versions = [primary, translation];
  payload.ref = REQUEST.tref;
  payload.warnings = [];
  return payload;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("createPopupViewModel", () => {
  it("projects at most twenty aligned positions and declares truncation", () => {
    const result = createPopupViewModel(payloadWithPositions(21), REQUEST);

    expect(result.state).toBe("data");
    if (result.state !== "data") return;
    expect(result.card.items).toHaveLength(20);
    expect(result.card.items.at(-1)?.position).toEqual([19]);
    expect(result.truncated).toBe(true);
  });

  it("does not declare truncation for exactly twenty positions", () => {
    const result = createPopupViewModel(payloadWithPositions(20), REQUEST);

    expect(result.state).toBe("data");
    if (result.state !== "data") return;
    expect(result.card.items).toHaveLength(20);
    expect(result.truncated).toBe(false);
  });
});

describe("loadPopupViewModel", () => {
  it("makes one request and equals the pure result", async () => {
    const payload = payloadWithPositions(10);
    const fetchMock = vi.fn<typeof fetch>(async () => jsonResponse(payload));
    const client = createSefariaClient({
      baseUrl: "https://example.test",
      fetch: fetchMock,
    });

    await expect(loadPopupViewModel(REQUEST, client)).resolves.toEqual(
      createPopupViewModel(payload, REQUEST),
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects a blank reference before requesting", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    const client = createSefariaClient({ fetch: fetchMock });

    await expect(loadPopupViewModel({ tref: " " }, client)).rejects.toThrow(
      TypeError,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
