import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseDocument } from "yaml";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(
  resolve(process.cwd(), ".github/workflows/ci.yml"),
  "utf8",
);

const toolkitBranch = "feature/avilevin/frontend-toolkit-alpha";
type RecordValue = Record<string, unknown>;

function isRecord(value: unknown): value is RecordValue {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseWorkflow(source: string): RecordValue {
  const document = parseDocument(source, { prettyErrors: true });
  if (document.errors.length > 0) {
    throw new Error(document.errors.map((error) => error.message).join("\n"));
  }
  const value: unknown = document.toJS();
  if (!isRecord(value)) {
    throw new Error(
      "Workflow YAML must contain a mapping at the document root.",
    );
  }
  return value;
}

function stringList(value: unknown, path: string, issues: string[]) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    issues.push(`invalid ${path}`);
    return [];
  }
  return value;
}

function policyIssues(workflowValue: RecordValue) {
  const issues: string[] = [];
  const events = workflowValue.on;
  const permissions = workflowValue.permissions;
  const jobs = workflowValue.jobs;

  if (!isRecord(events)) {
    issues.push("missing workflow events");
  } else {
    const eventKeys = Object.keys(events).sort();
    if (
      JSON.stringify(eventKeys) !== JSON.stringify(["pull_request", "push"])
    ) {
      issues.push("unsupported workflow events");
    }
    for (const eventName of ["pull_request", "push"]) {
      const event = events[eventName];
      if (!isRecord(event)) {
        issues.push(`missing ${eventName} event`);
        continue;
      }
      if (
        JSON.stringify(Object.keys(event).sort()) !==
        JSON.stringify(["branches"])
      ) {
        issues.push(`unsupported ${eventName} filters`);
      }
      const branches = stringList(
        event.branches,
        `${eventName}.branches`,
        issues,
      );
      const expected =
        eventName === "push" ? [toolkitBranch] : ["main", toolkitBranch];
      if (
        JSON.stringify([...branches].sort()) !==
        JSON.stringify([...expected].sort())
      ) {
        issues.push(`unexpected ${eventName} branches`);
      }
    }
  }

  if (
    !isRecord(permissions) ||
    JSON.stringify(permissions) !== JSON.stringify({ contents: "read" })
  ) {
    issues.push("unsafe default permissions");
  }

  if (
    !isRecord(jobs) ||
    JSON.stringify(Object.keys(jobs)) !== JSON.stringify(["check"])
  ) {
    issues.push("unexpected jobs");
    return issues;
  }

  const check = jobs.check;
  if (!isRecord(check)) {
    issues.push("invalid check job");
    return issues;
  }
  for (const key of ["permissions", "environment", "if", "continue-on-error"]) {
    if (key in check) {
      issues.push(`unsupported check job field: ${key}`);
    }
  }
  if (!Array.isArray(check.steps)) {
    issues.push("missing check steps");
    return issues;
  }

  let validationStepCount = 0;
  for (const [index, step] of check.steps.entries()) {
    if (!isRecord(step)) {
      issues.push(`invalid check step ${index}`);
      continue;
    }
    for (const key of ["if", "continue-on-error"]) {
      if (key in step) {
        issues.push(`unsupported check step field: ${key}`);
      }
    }
    if (typeof step.run === "string") {
      if (/\b(pnpm|npm|changeset) publish\b|\brelease\b/i.test(step.run)) {
        issues.push("publication or release command");
      }
      if (step.run === "pnpm check") {
        validationStepCount += 1;
      }
    }
    if (
      typeof step.uses === "string" &&
      /(deploy-pages|upload-pages-artifact|release)/i.test(step.uses)
    ) {
      issues.push("deployment or release action");
    }
  }
  if (validationStepCount !== 1) {
    issues.push("missing or duplicated unconditional pnpm check step");
  }
  return issues;
}

describe("integration workflow policy", () => {
  it("parses supported event scopes and the one unconditional check job", () => {
    const parsed = parseWorkflow(workflow);
    expect(policyIssues(parsed)).toEqual([]);
    expect((parsed.on as RecordValue).push).toEqual({
      branches: [toolkitBranch],
    });
    expect((parsed.on as RecordValue).pull_request).toEqual({
      branches: ["main", toolkitBranch],
    });
  });

  it("rejects unsupported PR targets, tags, dispatch, and a main push", () => {
    const unsupportedPr = parseWorkflow(
      workflow.replace(`      - ${toolkitBranch}`, "      - release/*"),
    );
    const tags = parseWorkflow(
      workflow.replace(
        new RegExp(`(push:\\s+branches:\\s+- ${toolkitBranch})`),
        "$1\n    tags:\n      - v*",
      ),
    );
    const dispatch = parseWorkflow(
      workflow.replace("  push:", "  workflow_dispatch:\n  push:"),
    );
    const mainPush = parseWorkflow(
      workflow.replace(
        new RegExp(`(push:\\s+branches:\\s+- ${toolkitBranch})`),
        "$1\n      - main",
      ),
    );

    expect(policyIssues(unsupportedPr)).toContain(
      "unexpected pull_request branches",
    );
    expect(policyIssues(tags)).toContain("unsupported push filters");
    expect(policyIssues(dispatch)).toContain("unsupported workflow events");
    expect(policyIssues(mainPush)).toContain("unexpected push branches");
  });

  it("rejects each unsafe job, action, step, and filter mutation independently", () => {
    const mutations: Array<[string, string]> = [
      [
        "deploy job",
        workflow.replace(
          "jobs:",
          "jobs:\n  deploy:\n    runs-on: ubuntu-latest\n    steps:\n      - run: pnpm publish",
        ),
      ],
      [
        "named publication step",
        workflow.replace(
          "- run: pnpm check",
          "- name: Publish\n        run: pnpm publish",
        ),
      ],
      [
        "named deployment step",
        workflow.replace(
          "- run: pnpm check",
          "- name: Deploy\n        uses: actions/deploy-pages@v5\n      - run: pnpm check",
        ),
      ],
      [
        "conditional validation step",
        workflow.replace(
          "- run: pnpm check",
          "- if: false\n        run: pnpm check",
        ),
      ],
      [
        "continue-on-error validation step",
        workflow.replace(
          "- run: pnpm check",
          "- continue-on-error: true\n        run: pnpm check",
        ),
      ],
      [
        "pull request paths filter",
        workflow.replace(
          "    branches:",
          "    paths:\n      - '**/*.ts'\n    branches:",
        ),
      ],
    ];

    for (const [name, candidate] of mutations) {
      expect(policyIssues(parseWorkflow(candidate)), name).not.toEqual([]);
    }
  });

  it("surfaces malformed workflow YAML", () => {
    expect(() => parseWorkflow(`${workflow}\n  - malformed`)).toThrow();
  });
});
