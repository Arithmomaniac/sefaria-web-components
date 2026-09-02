import { describe, expect, it } from "vitest";

import "./no-network.js";
import {
  evaluateCompatibilityCases,
  pinnedPaseqReferences,
  runCompatibilityQualification,
} from "./qualification.js";

describe("compatibility qualification command", () => {
  it("evaluates the pinned focused cases and prints only the intentional difference", () => {
    const results = evaluateCompatibilityCases();
    const lines: string[] = [];

    expect(
      pinnedPaseqReferences.map(({ project, source }) => ({ project, source })),
    ).toEqual([
      {
        project: "Sefaria Web",
        source: {
          repository: "Sefaria/Sefaria-Project",
          commit: "1f7d0844ca6a9eddc8e48168962aacb09de75bd6",
          path: "static/js/TextRange.jsx",
          lines: "263-278",
        },
      },
      {
        project: "Sefaria Linker",
        source: {
          repository: "Sefaria/Sefaria-Project",
          commit: "1f7d0844ca6a9eddc8e48168962aacb09de75bd6",
          path: "static/js/linker.v3/popup.js",
          lines: "308-319",
        },
      },
      {
        project: "Sefaria Mobile",
        source: {
          repository: "Sefaria/Sefaria-Mobile",
          commit: "925420dcf7dd00a16f8dc4c4191284792fc3f9fa",
          path: "sefaria.js",
          lines: "1286-1292",
        },
      },
    ]);
    expect(runCompatibilityQualification(results, lines.push.bind(lines))).toBe(
      0,
    );
    expect(lines).toEqual([
      "passed=9 failed=0 unavailable=0 intentional-difference=1",
      '[intentional-difference] vocalization/web-default-paseq: project="א ב׀ג" reference="א  בג"',
    ]);
  });

  it("returns nonzero and prints one line for an unexpected failure", () => {
    const lines: string[] = [];

    expect(
      runCompatibilityQualification(
        [
          { id: "ordinary", category: "text", status: "passed" },
          {
            id: "unexpected",
            category: "text",
            status: "failed",
            message: "exact mismatch",
          },
        ],
        lines.push.bind(lines),
      ),
    ).toBe(1);
    expect(lines).toEqual([
      "passed=1 failed=1 unavailable=0 intentional-difference=0",
      "[failed] text/unexpected: exact mismatch",
    ]);
  });
});
