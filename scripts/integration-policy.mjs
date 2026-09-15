import { readFile } from "node:fs/promises";
import path from "node:path";

import YAML from "yaml";

const RETIRED_ACTIVE_PREFIXES = [
  "demos/linker/",
  "demos/mcp/",
  "demos/reader-workspace/",
  "demos/showcase/",
];

const PYTHON_RUNTIME_FILES = [
  /(^|\/)pyproject\.toml$/u,
  /(^|\/)requirements[^/]*\.txt$/u,
  /\.py$/u,
];

const PUBLISH_COMMAND =
  /\b(?:npm|pnpm|yarn|changeset)\b[^\n]*\b(?:publish|release)\b/iu;
const PUBLISH_ACTION =
  /(?:deploy-pages|upload-pages-artifact|npm-publish|publish|release)/iu;
const CREDENTIAL_NAME =
  /(?:npm|node)_auth_token|npm_token|github_token|id-token/iu;

export function validateActivePaths(paths) {
  const issues = [];
  for (const candidate of paths.map(normalizePath)) {
    if (
      RETIRED_ACTIVE_PREFIXES.some(
        (prefix) =>
          candidate === prefix.slice(0, -1) || candidate.startsWith(prefix),
      )
    ) {
      issues.push(`retired active path: ${candidate}`);
    }
    if (PYTHON_RUNTIME_FILES.some((pattern) => pattern.test(candidate))) {
      issues.push(`Python runtime/build dependency: ${candidate}`);
    }
  }
  return issues;
}

export function validateManifestPolicy(manifests) {
  const issues = [];
  for (const [filename, manifest] of Object.entries(manifests)) {
    if (manifest.private !== true) {
      issues.push(`non-private manifest: ${filename}`);
    }
    if (filename.startsWith("packages/")) {
      validatePackageExports(filename, manifest.exports, issues);
      if (!Array.isArray(manifest.files) || !manifest.files.includes("dist")) {
        issues.push(`package does not explicitly pack dist: ${filename}`);
      }
    }
  }
  return issues;
}

export function validateWorkflowPolicy(workflows) {
  const issues = [];
  for (const [filename, source] of Object.entries(workflows)) {
    const workflow = YAML.parse(source);
    if (isRecord(workflow)) {
      const events = workflow.on;
      if (!isRecord(events)) {
        issues.push(`unsupported workflow events in ${filename}`);
      } else {
        const eventNames = Object.keys(events).sort();
        const expectedEvents =
          filename.endsWith("/copilot-setup-steps.yml") ||
          filename === "copilot-setup-steps.yml"
            ? ["workflow_dispatch"]
            : ["pull_request", "push"];
        if (JSON.stringify(eventNames) !== JSON.stringify(expectedEvents)) {
          issues.push(`unsupported workflow events in ${filename}`);
        }
      }
      if (filename.endsWith("/ci.yml") || filename === "ci.yml") {
        validateCiWorkflow(workflow, issues, filename);
      } else if (
        filename.endsWith("/copilot-setup-steps.yml") ||
        filename === "copilot-setup-steps.yml"
      ) {
        validateCopilotSetupWorkflow(workflow, issues, filename);
      }
    }
    if (/\$\{\{\s*secrets\./iu.test(source)) {
      issues.push(`secret reference in ${filename}`);
    }
    walkWorkflow(workflow, [], issues, filename);
  }
  return issues;
}

function validateCiWorkflow(workflow, issues, filename) {
  const events = workflow.on;
  const jobs = workflow.jobs;
  if (
    !isRecord(events) ||
    JSON.stringify(events.pull_request) !==
      JSON.stringify({
        branches: ["main", "feature/avilevin/frontend-toolkit-alpha"],
      }) ||
    JSON.stringify(events.push) !==
      JSON.stringify({
        branches: ["feature/avilevin/frontend-toolkit-alpha"],
      })
  ) {
    issues.push(`unexpected CI branch scope in ${filename}`);
  }
  if (
    !isRecord(jobs) ||
    JSON.stringify(Object.keys(jobs).sort()) !==
      JSON.stringify(["check", "validation"])
  ) {
    issues.push(`unexpected CI jobs in ${filename}`);
    return;
  }

  const validation = jobs.validation;
  const check = jobs.check;
  if (!isRecord(validation) || !isRecord(check)) {
    issues.push(`invalid CI jobs in ${filename}`);
    return;
  }
  const strategy = validation.strategy;
  const matrix = isRecord(strategy) ? strategy.matrix : undefined;
  if (
    !isRecord(strategy) ||
    strategy["fail-fast"] !== false ||
    !isRecord(matrix) ||
    JSON.stringify(matrix.os) !==
      JSON.stringify(["ubuntu-latest", "windows-latest"])
  ) {
    issues.push(`CI must validate Linux and Windows in ${filename}`);
  }
  if (validation["continue-on-error"] !== undefined) {
    issues.push(`CI validation cannot continue on error in ${filename}`);
  }
  const steps = Array.isArray(validation.steps) ? validation.steps : [];
  const fullChecks = steps.filter(
    (step) => isRecord(step) && step.run === "pnpm check",
  );
  if (
    fullChecks.length !== 1 ||
    fullChecks.some(
      (step) =>
        step.if !== undefined || step["continue-on-error"] !== undefined,
    )
  ) {
    issues.push(`CI must run one unconditional pnpm check in ${filename}`);
  }
  if (
    !steps.some((step) => isRecord(step) && step.run === "pnpm setup:agent")
  ) {
    issues.push(`CI must run the shared agent setup in ${filename}`);
  }
  if (
    check.name !== "check" ||
    check.if !== "${{ always() }}" ||
    check.needs !== "validation" ||
    JSON.stringify(check).includes("continue-on-error") ||
    !JSON.stringify(check).includes(
      'needs.validation.result }}\\" != \\"success\\"',
    )
  ) {
    issues.push(`CI check aggregation is not fail-closed in ${filename}`);
  }
}

function validateCopilotSetupWorkflow(workflow, issues, filename) {
  const jobs = workflow.jobs;
  if (
    !isRecord(jobs) ||
    JSON.stringify(Object.keys(jobs)) !==
      JSON.stringify(["copilot-setup-steps"])
  ) {
    issues.push(`unexpected Copilot setup jobs in ${filename}`);
    return;
  }
  const setup = jobs["copilot-setup-steps"];
  const source = JSON.stringify(setup);
  if (
    !isRecord(setup) ||
    JSON.stringify(setup.permissions) !== JSON.stringify({ contents: "read" })
  ) {
    issues.push(`unsafe Copilot setup job in ${filename}`);
  }
  if (
    !source.includes("packages/web-components/package.json") ||
    !source.includes("@sefaria/web-components") ||
    !source.includes("pnpm setup:agent") ||
    source.includes("feature/avilevin/frontend-toolkit-alpha")
  ) {
    issues.push(`Copilot setup is not toolkit-capability based in ${filename}`);
  }
}

export function validateLockfilePolicy(source) {
  const issues = [];
  const lockfile = YAML.parse(source);
  walkObject(lockfile, [], (value, valuePath) => {
    if (
      valuePath.at(-1) === "tarball" &&
      typeof value === "string" &&
      /^https?:\/\//iu.test(value)
    ) {
      issues.push(`nonportable tarball URL at ${valuePath.join(".")}`);
    }
  });
  return issues;
}

export function validateDocumentationClaims(files) {
  const issues = [];
  for (const [filename, source] of Object.entries(files)) {
    const prose = stripFencedCode(source);
    if (/(?:npm install|pnpm add|yarn add)\s+@sefaria\//iu.test(source)) {
      issues.push(`unsupported registry installation command: ${filename}`);
    }
    for (const line of prose.split(/\r?\n/u)) {
      if (
        /\b(?:official\s+Sefaria|Sefaria-(?:maintained|supported))\b/iu.test(
          line,
        ) &&
        !/\b(?:not|isn't|is not|does not|no)\b/iu.test(line)
      ) {
        issues.push(`unsupported official ownership claim: ${filename}`);
        break;
      }
    }
    for (const line of prose.split(/\r?\n/u)) {
      if (
        /\b(?:(?:toolkit|documentation site)\s+(?:is\s+)?(?:deployed|hosted)|deployed\s+(?:toolkit|documentation(?:\s+site)?))\b/iu.test(
          line,
        ) &&
        !/\b(?:not|unpublished|local-only|does not)\b/iu.test(line)
      ) {
        issues.push(`unsupported deployment claim: ${filename}`);
        break;
      }
    }
  }
  return issues;
}

export async function readJsonFiles(root, filenames) {
  return Object.fromEntries(
    await Promise.all(
      filenames.map(async (filename) => [
        normalizePath(filename),
        JSON.parse(await readFile(path.join(root, filename), "utf8")),
      ]),
    ),
  );
}

function validatePackageExports(filename, exportsField, issues) {
  if (exportsField === undefined) {
    issues.push(`package exports are missing: ${filename}`);
    return;
  }
  walkObject(exportsField, ["exports"], (value, valuePath) => {
    if (
      typeof value === "string" &&
      !value.startsWith("./dist/") &&
      value !== "./dist/index.js" &&
      value !== "./dist/index.d.ts"
    ) {
      issues.push(
        `source export fallback at ${filename}:${valuePath.join(".")} -> ${value}`,
      );
    }
  });
}

function walkWorkflow(value, valuePath, issues, filename) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      walkWorkflow(entry, [...valuePath, String(index)], issues, filename),
    );
    return;
  }
  if (!isRecord(value)) return;

  for (const [key, entry] of Object.entries(value)) {
    const nextPath = [...valuePath, key];
    if (CREDENTIAL_NAME.test(key)) {
      issues.push(
        `publication credential in ${filename}:${nextPath.join(".")}`,
      );
    }
    if (key === "permissions" && isRecord(entry)) {
      for (const [permission, access] of Object.entries(entry)) {
        if (permission !== "contents" || access !== "read") {
          issues.push(
            `unsafe workflow permission in ${filename}:${nextPath.join(".")}.${permission}`,
          );
        }
      }
    }
    if (key === "permissions" && !isRecord(entry)) {
      issues.push(
        `unsafe workflow permission in ${filename}:${nextPath.join(".")}`,
      );
    }
    if (key === "tags" || key === "tags-ignore") {
      issues.push(
        `unsupported tag trigger in ${filename}:${nextPath.join(".")}`,
      );
    }
    if (
      key === "run" &&
      typeof entry === "string" &&
      PUBLISH_COMMAND.test(entry)
    ) {
      issues.push(`publication command in ${filename}:${nextPath.join(".")}`);
    }
    if (
      key === "uses" &&
      typeof entry === "string" &&
      PUBLISH_ACTION.test(entry)
    ) {
      issues.push(
        `publication/deployment action in ${filename}:${nextPath.join(".")}`,
      );
    }
    walkWorkflow(entry, nextPath, issues, filename);
  }
}

function walkObject(value, valuePath, visit) {
  visit(value, valuePath);
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      walkObject(entry, [...valuePath, String(index)], visit),
    );
    return;
  }
  if (!isRecord(value)) return;
  for (const [key, entry] of Object.entries(value)) {
    walkObject(entry, [...valuePath, key], visit);
  }
}

function stripFencedCode(source) {
  return source.replace(/```[\s\S]*?```/gu, "");
}

function normalizePath(candidate) {
  return candidate.replaceAll("\\", "/").replace(/^\.\//u, "");
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
