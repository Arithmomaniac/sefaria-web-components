import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseDocument } from "yaml";
import { describe, expect, it } from "vitest";

import { validateWorkflowPolicy } from "../scripts/integration-policy.mjs";

const ciSource = readFileSync(
  resolve(process.cwd(), ".github/workflows/ci.yml"),
  "utf8",
);
const setupSource = readFileSync(
  resolve(process.cwd(), ".github/workflows/copilot-setup-steps.yml"),
  "utf8",
);

type RecordValue = Record<string, unknown>;

function parseWorkflow(source: string): RecordValue {
  const document = parseDocument(source, { prettyErrors: true });
  if (document.errors.length > 0) {
    throw new Error(document.errors.map((error) => error.message).join("\n"));
  }
  const value: unknown = document.toJS();
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(
      "Workflow YAML must contain a mapping at the document root.",
    );
  }
  return value as RecordValue;
}

describe("agent-ready workflow policy", () => {
  it("requires complete Linux and Windows validation behind one check", () => {
    const workflow = parseWorkflow(ciSource);
    const jobs = workflow.jobs as RecordValue;
    const validation = jobs.validation as RecordValue;
    const strategy = validation.strategy as RecordValue;
    const matrix = strategy.matrix as RecordValue;
    const check = jobs.check as RecordValue;

    expect(Object.keys(jobs).sort()).toEqual(["check", "validation"]);
    expect(strategy["fail-fast"]).toBe(false);
    expect(matrix.os).toEqual(["ubuntu-latest", "windows-latest"]);
    expect(validation["continue-on-error"]).toBeUndefined();
    expect(
      (validation.steps as RecordValue[]).filter(
        (step) => step.run === "pnpm check",
      ),
    ).toHaveLength(1);
    expect(check.name).toBe("check");
    expect(check.if).toBe("${{ always() }}");
    expect(check.needs).toBe("validation");
    expect(JSON.stringify(check)).toContain("needs.validation.result");
    expect(JSON.stringify(check)).toContain('!= \\"success\\"');
  });

  it("retains the intended branch and permission boundary", () => {
    const workflow = parseWorkflow(ciSource);

    expect(workflow.permissions).toEqual({ contents: "read" });
    expect(workflow.on).toEqual({
      pull_request: {
        branches: ["main", "feature/avilevin/frontend-toolkit-alpha"],
      },
      push: { branches: ["feature/avilevin/frontend-toolkit-alpha"] },
    });
    expect(ciSource).not.toMatch(
      /deploy-pages|upload-pages-artifact|publish|release|pull_request_target/iu,
    );
  });

  it("keeps Copilot setup read-only and capability-based", () => {
    const workflow = parseWorkflow(setupSource);
    const jobs = workflow.jobs as RecordValue;
    const setup = jobs["copilot-setup-steps"] as RecordValue;

    expect(Object.keys(jobs)).toEqual(["copilot-setup-steps"]);
    expect(workflow.on).toEqual({ workflow_dispatch: null });
    expect(setup.permissions).toEqual({ contents: "read" });
    expect(setupSource).toContain("packages/web-components/package.json");
    expect(setupSource).toContain("@sefaria/web-components");
    expect(setupSource).toContain("pnpm setup:agent");
    expect(setupSource).not.toContain(
      "feature/avilevin/frontend-toolkit-alpha",
    );
    expect(setupSource).not.toMatch(/secrets\.|contents: write|id-token/iu);
  });

  it("surfaces malformed workflow YAML", () => {
    expect(() => parseWorkflow(`${ciSource}\n  - malformed`)).toThrow();
  });

  it("rejects missing platforms, conditional checks, permissive aggregation, and secrets", () => {
    const mutations: Array<[string, string]> = [
      [
        ciSource.replace("          - windows-latest", ""),
        "CI must validate Linux and Windows",
      ],
      [
        ciSource.replace(
          "      - run: pnpm check",
          "      - if: false\n        run: pnpm check",
        ),
        "CI must run one unconditional pnpm check",
      ],
      [
        ciSource.replace(
          'if [ "${{ needs.validation.result }}" != "success" ]',
          'if [ "${{ needs.validation.result }}" != "failure" ]',
        ),
        "CI check aggregation is not fail-closed",
      ],
      [
        setupSource.replace(
          "run: pnpm setup:agent",
          "env:\n          TOKEN: ${{ secrets.GITHUB_TOKEN }}\n        run: pnpm setup:agent",
        ),
        "secret reference",
      ],
    ];

    for (const [candidate, expected] of mutations) {
      const filename = candidate.includes("Copilot Setup Steps")
        ? "copilot-setup-steps.yml"
        : "ci.yml";
      expect(
        validateWorkflowPolicy({ [filename]: candidate }).join("\n"),
      ).toContain(expected);
    }
  });
});
