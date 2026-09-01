import {
  validateGetV3Texts200,
  type CoreV3TextsResponse,
} from "@sefaria/client";
import {
  applyVocalization,
  applyVocalizationToHtml,
  extractFootnotes,
  sanitize,
  type PaseqMode,
} from "@sefaria/text-transform";

import {
  compareText,
  summarizeCompatibility,
  type CompatibilityCaseResult,
} from "./index.js";
import { v3SourceBackedPayload } from "./v3-source-backed.fixture.js";

const PASEQ_INPUT = "א ׀ ב׀ג";

export const pinnedPaseqReferences: ReadonlyArray<{
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

function textCase(
  id: string,
  category: string,
  expected: string,
  actual: string,
): CompatibilityCaseResult {
  const comparison = compareText(expected, actual, {
    maxDifferences: 3,
    contextRadius: 2,
  });
  if (comparison.status === "passed") {
    return { id, category, status: "passed" };
  }
  if (comparison.status !== "failed") {
    return {
      id,
      category,
      status: "failed",
      message: `comparison unavailable: ${comparison.reason}`,
    };
  }

  const first = comparison.firstDifference;
  return {
    id,
    category,
    status: "failed",
    message:
      `expected=${JSON.stringify(expected)} actual=${JSON.stringify(actual)} ` +
      `first=${first.position}:${first.expectedCodePoint}/${first.actualCodePoint}`,
  };
}

function structuredCase(
  id: string,
  expected: unknown,
  actual: unknown,
): CompatibilityCaseResult {
  const expectedJson = JSON.stringify(expected);
  const actualJson = JSON.stringify(actual);
  return expectedJson === actualJson
    ? { id, category: "structure", status: "passed" }
    : {
        id,
        category: "structure",
        status: "failed",
        message: `expected=${expectedJson} actual=${actualJson}`,
      };
}

function sourceBackedV3Case(): CompatibilityCaseResult {
  if (!validateGetV3Texts200(v3SourceBackedPayload)) {
    return {
      id: "v3-source-backed-pipeline",
      category: "integration",
      status: "failed",
      message: "public v3 response validation rejected the composed payload",
    };
  }

  const response = v3SourceBackedPayload as CoreV3TextsResponse;
  const html = response.versions[0]?.text;
  if (typeof html !== "string") {
    return {
      id: "v3-source-backed-pipeline",
      category: "integration",
      status: "failed",
      message: "selected v3 text was not a string",
    };
  }

  const actual = extractFootnotes(
    applyVocalizationToHtml(sanitize(html), "none"),
  );
  return structuredCase(
    "v3-source-backed-pipeline",
    {
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
    },
    actual,
  );
}

export function evaluateCompatibilityCases(): CompatibilityCaseResult[] {
  const results = pinnedPaseqReferences.map((reference) =>
    textCase(
      `${reference.project.toLowerCase().replaceAll(" ", "-")}-paseq`,
      "vocalization",
      reference.output,
      applyVocalization(PASEQ_INPUT, "nikkud", {
        paseq: reference.policy,
      }),
    ),
  );

  results.push(
    textCase(
      "sof-pasuq-nikkud",
      "vocalization",
      "בָּרָא׃",
      applyVocalization("בָּרָ֖א׃", "nikkud"),
    ),
    textCase(
      "sof-pasuq-none",
      "vocalization",
      "ברא",
      applyVocalization("בָּרָ֖א׃", "none"),
    ),
    textCase(
      "mam-sanitizer-structure",
      "sanitization",
      '<span class="mam-kq-trivial">שְׁעָרָ֗ו</span>',
      sanitize('<span class="mam-kq-trivial">שְׁעָרָ֗ו</span>'),
    ),
    textCase(
      "mam-markup-vocalization",
      "vocalization",
      '<span class="mam-kq-trivial">שערו</span>',
      applyVocalizationToHtml(
        '<span class="mam-kq-trivial">שְׁעָרָ֗ו</span>',
        "none",
      ),
    ),
    structuredCase(
      "source-backed-footnote",
      {
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
      },
      extractFootnotes(
        sanitize(
          'When God began to create<sup class="footnote-marker">*</sup><i class="footnote"><b>When God began to create </b>Others.</i> heaven',
        ),
      ),
    ),
    sourceBackedV3Case(),
  );

  const projectOutput = applyVocalization(PASEQ_INPUT, "nikkud");
  const referenceOutput = pinnedPaseqReferences[0]?.output;
  if (projectOutput !== "א ב׀ג" || referenceOutput !== "א  בג") {
    results.push({
      id: "web-default-paseq",
      category: "vocalization",
      status: "failed",
      message:
        `expected project="א ב׀ג" reference="א  בג" ` +
        `actual project=${JSON.stringify(projectOutput)} reference=${JSON.stringify(referenceOutput)}`,
    });
  } else {
    results.push({
      id: "web-default-paseq",
      category: "vocalization",
      status: "intentional-difference",
      message: 'project="א ב׀ג" reference="א  בג"',
    });
  }

  return results;
}

export function runCompatibilityQualification(
  results: readonly CompatibilityCaseResult[] = evaluateCompatibilityCases(),
  writeLine: (line: string) => void = console.log,
): 0 | 1 {
  const summary = summarizeCompatibility(results);
  for (const line of summary.lines) {
    writeLine(line);
  }
  return summary.exitCode;
}
