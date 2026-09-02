import {
  validateGetV3Texts200,
  type CoreV3TextsResponse,
} from "@sefaria/client";
import {
  applyVocalizationToHtml,
  extractFootnotes,
  sanitize,
} from "@sefaria/text-transform";
import { expect, it } from "vitest";

import "./no-network.js";
import {
  v3SourceBackedFixtureMetadata,
  v3SourceBackedPayload,
} from "./v3-source-backed.fixture.js";

it("validates and transforms one complete source-backed v3 payload", () => {
  const valid = validateGetV3Texts200(v3SourceBackedPayload);

  expect(valid).toBe(true);
  if (!valid) {
    throw new TypeError("Expected the source-backed v3 payload to be valid.");
  }

  const response = v3SourceBackedPayload as CoreV3TextsResponse;
  const html = response.versions[0]?.text;
  expect(typeof html).toBe("string");
  if (typeof html !== "string") {
    throw new TypeError("Expected the selected v3 version text to be HTML.");
  }

  expect(v3SourceBackedFixtureMetadata.textSources).toHaveLength(2);
  const sanitized = sanitize(html);
  const vocalized = applyVocalizationToHtml(sanitized, "none");

  expect(extractFootnotes(vocalized)).toEqual({
    body: [
      {
        kind: "html",
        html: '<span class="mam-kq-trivial">שערו</span> — When God began to create',
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
  });
});
