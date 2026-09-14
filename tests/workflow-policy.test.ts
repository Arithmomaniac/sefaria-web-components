import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(
  resolve(process.cwd(), ".github/workflows/ci.yml"),
  "utf8",
);

const toolkitBranch = "feature/avilevin/frontend-toolkit-alpha";

function workflowRunsFor(
  event: "pull_request" | "push" | "schedule" | "workflow_dispatch",
  ref: string,
) {
  if (event === "pull_request") {
    return workflow.includes(`      - ${ref}`);
  }

  if (event === "push") {
    return workflow.includes(`      - ${ref}`);
  }

  return workflow.includes(`  ${event}:`);
}

function isSafePolicy(candidate: string) {
  return (
    candidate.includes("permissions:\n  contents: read") &&
    candidate.includes("jobs:\n  check:") &&
    !candidate.includes("      - release/*") &&
    !candidate.includes("pages: write") &&
    !candidate.includes("id-token: write") &&
    !candidate.includes("actions/deploy-pages") &&
    !candidate.includes("actions/upload-pages-artifact") &&
    !/\b(npm publish|pnpm publish|changeset publish|softprops\/action-gh-release)\b/.test(
      candidate,
    )
  );
}

describe("integration workflow policy", () => {
  it("runs the stable check for toolkit PRs and toolkit integration pushes", () => {
    expect(workflowRunsFor("pull_request", "main")).toBe(true);
    expect(workflowRunsFor("pull_request", toolkitBranch)).toBe(true);
    expect(workflowRunsFor("push", toolkitBranch)).toBe(true);
    expect(workflow).toContain("  check:");
    expect(workflow).toContain("permissions:\n  contents: read");
  });

  it("does not acquire tag, manual-dispatch, or deployment paths", () => {
    expect(workflow).not.toContain("  tags:");
    expect(workflow).not.toContain("  workflow_dispatch:");
    expect(workflow).not.toContain("  deploy:");
    expect(workflow).not.toContain("actions/deploy-pages");
    expect(workflow).not.toContain("actions/upload-pages-artifact");
    expect(workflow).not.toContain("pages: write");
    expect(workflow).not.toContain("id-token: write");
    expect(workflow).not.toMatch(
      /\b(npm publish|pnpm publish|changeset publish|softprops\/action-gh-release)\b/,
    );
  });

  it("rejects broadening a deployment path or adding unsafe permissions", () => {
    const unsafeWorkflow = workflow
      .replace(
        "      - " + toolkitBranch,
        "      - " + toolkitBranch + "\n      - release/*",
      )
      .replace(
        "permissions:\n  contents: read",
        "permissions:\n  contents: write\n  pages: write",
      );

    expect(isSafePolicy(workflow)).toBe(true);
    expect(isSafePolicy(unsafeWorkflow)).toBe(false);
  });

  it("keeps the required check present on every supported event", () => {
    expect(workflow).toContain("jobs:\n  check:");
    expect(workflow).not.toContain("if: false");
    expect(workflow).not.toMatch(/if:.*github\.ref.*main/);
  });
});
