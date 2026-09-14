import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(
  resolve(process.cwd(), ".github/workflows/ci.yml"),
  "utf8",
);

const toolkitBranch = "feature/avilevin/frontend-toolkit-alpha";

type WorkflowPolicy = {
  events: {
    pull_request: { branches: string[] };
    push: { branches: string[]; tags: string[] };
    workflow_dispatch: boolean;
  };
  permissions: Record<string, string>;
  jobs: Record<
    string,
    {
      if?: string;
      continueOnError?: boolean;
      permissions?: Record<string, string>;
      steps: string[];
    }
  >;
};

function parseWorkflowPolicy(source: string): WorkflowPolicy {
  const lines = source.split(/\r?\n/);
  const policy: WorkflowPolicy = {
    events: {
      pull_request: { branches: [] },
      push: { branches: [], tags: [] },
      workflow_dispatch: false,
    },
    permissions: {},
    jobs: {},
  };
  let section = "";
  let event = "";
  let eventList = "";
  let job = "";
  let nestedJobPermissions = false;

  for (const line of lines) {
    if (line === "on:") {
      section = "events";
      continue;
    }
    if (line === "permissions:") {
      section = "permissions";
      nestedJobPermissions = false;
      continue;
    }
    if (line === "jobs:") {
      section = "jobs";
      continue;
    }
    if (
      section === "events" &&
      /^ {2}(pull_request|push|workflow_dispatch):$/.test(line)
    ) {
      event = line.trim().slice(0, -1);
      if (event === "workflow_dispatch") {
        policy.events.workflow_dispatch = true;
      }
      continue;
    }
    if (section === "events" && /^ {4}(branches|tags):/.test(line)) {
      eventList = line.trim().slice(0, -1);
      continue;
    }
    if (
      section === "events" &&
      /^ {6}- /.test(line) &&
      (event === "pull_request" || event === "push")
    ) {
      const value = line.trim().slice(2);
      if (eventList === "tags") {
        policy.events.push.tags.push(value);
      } else {
        policy.events[event].branches.push(value);
      }
      continue;
    }
    if (section === "permissions" && /^ {2}[a-z-]+: /.test(line)) {
      const [name, value] = line.trim().split(": ");
      policy.permissions[name] = value;
      continue;
    }
    if (section === "jobs" && /^ {2}[a-z-]+:$/.test(line)) {
      job = line.trim().slice(0, -1);
      policy.jobs[job] = { steps: [] };
      nestedJobPermissions = false;
      continue;
    }
    if (section === "jobs" && job && /^ {4}permissions:$/.test(line)) {
      nestedJobPermissions = true;
      policy.jobs[job].permissions = {};
      continue;
    }
    if (
      section === "jobs" &&
      job &&
      nestedJobPermissions &&
      /^ {6}[a-z-]+: /.test(line)
    ) {
      const [name, value] = line.trim().split(": ");
      policy.jobs[job].permissions![name] = value;
      continue;
    }
    if (section === "jobs" && job && /^ {4}if: /.test(line)) {
      policy.jobs[job].if = line.trim().slice(4);
      continue;
    }
    if (section === "jobs" && job && /^ {4}continue-on-error: /.test(line)) {
      policy.jobs[job].continueOnError = line.trim().slice(19) === "true";
      continue;
    }
    if (section === "jobs" && job && /^ {6}- uses: /.test(line)) {
      policy.jobs[job].steps.push(line.trim().slice(8));
      nestedJobPermissions = false;
      continue;
    }
    if (section === "jobs" && job && /^ {6}- run: /.test(line)) {
      policy.jobs[job].steps.push(line.trim().slice(7));
      nestedJobPermissions = false;
    }
  }

  return policy;
}

function policyIssues(policy: WorkflowPolicy) {
  const issues: string[] = [];
  const check = policy.jobs.check;
  if (!check) issues.push("missing check job");
  if (
    JSON.stringify(policy.permissions) !== JSON.stringify({ contents: "read" })
  ) {
    issues.push("unsafe default permissions");
  }
  if (
    JSON.stringify(policy.events.pull_request.branches.sort()) !==
    JSON.stringify(["main", toolkitBranch].sort())
  ) {
    issues.push("unexpected pull request branches");
  }
  if (
    JSON.stringify(policy.events.push.branches) !==
    JSON.stringify([toolkitBranch])
  ) {
    issues.push("unexpected push branches");
  }
  if (policy.events.push.tags.length > 0) issues.push("tag trigger");
  if (policy.events.workflow_dispatch) issues.push("manual dispatch");
  if (!check) return issues;
  if (check.permissions) issues.push("job-level permissions");
  if (check.if) issues.push("conditionally skipped check");
  if (check.continueOnError) issues.push("continue-on-error check");
  if (!check.steps.includes("pnpm check"))
    issues.push("missing validation step");
  if (
    check.steps.some((step) =>
      /deploy-pages|upload-pages-artifact|publish|release/i.test(step),
    )
  ) {
    issues.push("deployment or publication action");
  }
  return issues;
}

describe("integration workflow policy", () => {
  it("scopes validation to supported pull requests and toolkit pushes", () => {
    const parsed = parseWorkflowPolicy(workflow);
    expect(parsed.events.pull_request.branches).toEqual(
      expect.arrayContaining(["main", toolkitBranch]),
    );
    expect(parsed.events.push.branches).toEqual([toolkitBranch]);
    expect(parsed.events.push.branches).not.toContain("main");
    expect(parsed.events.pull_request.branches).not.toContain("release/*");
    expect(policyIssues(parsed)).toEqual([]);
  });

  it("rejects unsupported PR targets, tags, and manual dispatch", () => {
    const unsupportedPr = parseWorkflowPolicy(
      workflow.replace(`      - ${toolkitBranch}`, "      - release/*"),
    );
    const tags = parseWorkflowPolicy(
      workflow.replace(
        new RegExp(`    branches:\\s+- ${toolkitBranch}`),
        "    tags:\n      - v*",
      ),
    );
    const dispatch = parseWorkflowPolicy(
      workflow.replace("  push:", "  workflow_dispatch:\n  push:"),
    );

    expect(policyIssues(unsupportedPr)).toContain(
      "unexpected pull request branches",
    );
    expect(policyIssues(tags)).toContain("tag trigger");
    expect(policyIssues(dispatch)).toContain("manual dispatch");
  });

  it("rejects each unsafe permission, action, and skip mutation independently", () => {
    const mutations: Array<[string, string, string]> = [
      [
        "default permission",
        workflow.replace("  contents: read", "  contents: write"),
        "unsafe default permissions",
      ],
      [
        "job permission",
        workflow.replace(
          "    runs-on: ubuntu-latest",
          "    permissions:\n      contents: write\n    runs-on: ubuntu-latest",
        ),
        "job-level permissions",
      ],
      [
        "deployment action",
        workflow.replace(
          "      - run: pnpm check",
          "      - uses: actions/deploy-pages@v5\n      - run: pnpm check",
        ),
        "deployment or publication action",
      ],
      [
        "publication action",
        workflow.replace(
          "      - run: pnpm check",
          "      - run: pnpm publish\n      - run: pnpm check",
        ),
        "deployment or publication action",
      ],
      [
        "missing check",
        workflow.replace("  check:", "  validation:"),
        "missing check job",
      ],
      [
        "conditional check",
        workflow.replace(
          "    runs-on: ubuntu-latest",
          "    if: false\n    runs-on: ubuntu-latest",
        ),
        "conditionally skipped check",
      ],
      [
        "continue-on-error check",
        workflow.replace(
          "    runs-on: ubuntu-latest",
          "    continue-on-error: true\n    runs-on: ubuntu-latest",
        ),
        "continue-on-error check",
      ],
    ];

    for (const [name, candidate, issue] of mutations) {
      expect(policyIssues(parseWorkflowPolicy(candidate)), name).toContain(
        issue,
      );
    }
  });
});
