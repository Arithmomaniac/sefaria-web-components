import {
  applyVocalization,
  applyVocalizationToHtml,
  extractFootnotes,
  sanitize,
  type PaseqMode,
} from "@sefaria/text-transform";
import { describe, expect, it } from "vitest";

import "./no-network.js";
import { summarizeCompatibility } from "./index.js";

const PASEQ_INPUT = "א ׀ ב׀ג";

const paseqReferences: ReadonlyArray<{
  project: string;
  source: {
    repository: string;
    commit: string;
    path: string;
    lines: string;
  };
  policy: PaseqMode;
  output: string;
}> = [
  {
    project: "Sefaria Web",
    source: {
      repository: "Sefaria/Sefaria-Project",
      commit: "1f7d0844ca6a9eddc8e48168962aacb09de75bd6",
      path: "static/js/TextRange.jsx",
      lines: "263-278",
    },
    policy: "always",
    output: "א  בג",
  },
  {
    project: "Sefaria Linker",
    source: {
      repository: "Sefaria/Sefaria-Project",
      commit: "1f7d0844ca6a9eddc8e48168962aacb09de75bd6",
      path: "static/js/linker.v3/popup.js",
      lines: "308-319",
    },
    policy: "always",
    output: "א  בג",
  },
  {
    project: "Sefaria Mobile",
    source: {
      repository: "Sefaria/Sefaria-Mobile",
      commit: "925420dcf7dd00a16f8dc4c4191284792fc3f9fa",
      path: "sefaria.js",
      lines: "1286-1292",
    },
    policy: "after-space",
    output: "א ב׀ג",
  },
];

describe("pinned vocalization compatibility", () => {
  it.each(paseqReferences)(
    "matches $project PASEQ behavior at the pinned source",
    ({ source, policy, output }) => {
      expect(source.commit).toMatch(/^[0-9a-f]{40}$/u);
      expect(applyVocalization(PASEQ_INPUT, "nikkud", { paseq: policy })).toBe(
        output,
      );
    },
  );

  it("preserves SOF PASUQ with nikkud and removes it with all vocalization", () => {
    const source = {
      repository: "Sefaria/Sefaria-Project",
      commit: "1f7d0844ca6a9eddc8e48168962aacb09de75bd6",
      webPath: "static/js/TextRange.jsx",
      serverPath: "sefaria/utils/hebrew.py",
    };

    expect(source.commit).toHaveLength(40);
    expect(applyVocalization("בָּרָ֖א׃", "nikkud")).toBe("בָּרָא׃");
    expect(applyVocalization("בָּרָ֖א׃", "none")).toBe("ברא");
  });

  it("records the default Web difference with exact project and reference output", () => {
    const projectOutput = applyVocalization(PASEQ_INPUT, "nikkud");
    const referenceOutput = paseqReferences[0]?.output;

    expect(projectOutput).toBe("א ב׀ג");
    expect(referenceOutput).toBe("א  בג");
    expect(
      summarizeCompatibility([
        {
          id: "web-default-paseq",
          category: "vocalization",
          status: "intentional-difference",
          message: `project=${JSON.stringify(projectOutput)} reference=${JSON.stringify(referenceOutput)}`,
        },
      ]),
    ).toEqual({
      exitCode: 0,
      counts: {
        passed: 0,
        failed: 0,
        unavailable: 0,
        intentionalDifference: 1,
      },
      lines: [
        "passed=0 failed=0 unavailable=0 intentional-difference=1",
        '[intentional-difference] vocalization/web-default-paseq: project="א ב׀ג" reference="א  בג"',
      ],
    });
  });
});

describe("source-backed structural compatibility", () => {
  it("preserves reviewed sanitizer structure while vocalizing only text nodes", () => {
    const fixture = {
      source:
        "https://www.sefaria.org/api/v3/texts/Obadiah%201?version=hebrew%7CMiqra%20according%20to%20the%20Masorah&return_format=default",
      capturedAt: "2026-08-30",
      html: '<span class="mam-kq-trivial">שְׁעָרָ֗ו</span>',
    };

    const sanitized = sanitize(fixture.html);

    expect(fixture.capturedAt).toBe("2026-08-30");
    expect(sanitized).toBe('<span class="mam-kq-trivial">שְׁעָרָ֗ו</span>');
    expect(applyVocalizationToHtml(sanitized, "none")).toBe(
      '<span class="mam-kq-trivial">שערו</span>',
    );
  });

  it("preserves the source-backed footnote structure", () => {
    const fixture = {
      source:
        "https://www.sefaria.org/api/v3/texts/Genesis%201%3A1?version=english%7CThe%20Contemporary%20Torah%2C%20Jewish%20Publication%20Society%2C%202006&return_format=default",
      capturedAt: "2026-08-30",
      html: 'When God began to create<sup class="footnote-marker">*</sup><i class="footnote"><b>When God began to create </b>Others.</i> heaven',
    };

    expect(extractFootnotes(sanitize(fixture.html))).toEqual({
      body: [
        { kind: "html", html: "When God began to create" },
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
});
