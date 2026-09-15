import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  validateActivePaths,
  validateDocumentationClaims,
  validateLockfilePolicy,
  validateManifestPolicy,
  validateWorkflowPolicy,
} from "../scripts/integration-policy.mjs";

const root = path.resolve(import.meta.dirname, "..");

describe("Wave 4 integration policy", () => {
  it("rejects active Python and retired runtime paths without banning historical prose", () => {
    expect(
      validateActivePaths([
        "examples/mcp-app/src/server.py",
        "demos/showcase/index.html",
        "docs/evidence.md",
      ]),
    ).toEqual([
      "Python runtime/build dependency: examples/mcp-app/src/server.py",
      "retired active path: demos/showcase/index.html",
    ]);
  });

  it("requires private manifests and built package exports", () => {
    const valid = {
      "packages/client/package.json": {
        private: true,
        files: ["dist", "README.md"],
        exports: {
          ".": { types: "./dist/index.d.ts", import: "./dist/index.js" },
        },
      },
      "examples/react-vite/package.json": { private: true },
    };
    expect(validateManifestPolicy(valid)).toEqual([]);

    expect(
      validateManifestPolicy({
        ...valid,
        "packages/client/package.json": {
          private: false,
          files: ["src"],
          exports: { ".": "./src/index.ts" },
        },
      }),
    ).toEqual([
      "non-private manifest: packages/client/package.json",
      "source export fallback at packages/client/package.json:exports.. -> ./src/index.ts",
      "package does not explicitly pack dist: packages/client/package.json",
    ]);
  });

  it("parses workflow structure and rejects publication capabilities", async () => {
    const [workflow, setupWorkflow] = await Promise.all([
      readFile(path.join(root, ".github", "workflows", "ci.yml"), "utf8"),
      readFile(
        path.join(root, ".github", "workflows", "copilot-setup-steps.yml"),
        "utf8",
      ),
    ]);
    expect(
      validateWorkflowPolicy({
        "ci.yml": workflow,
        "copilot-setup-steps.yml": setupWorkflow,
      }),
    ).toEqual([]);

    const unsafe = workflow
      .replace(
        /permissions:\r?\n {2}contents: read/u,
        "permissions:\n  contents: write\n  id-token: write",
      )
      .replace(
        "- run: pnpm check",
        "- uses: actions/deploy-pages@v4\n      - run: pnpm publish",
      );
    expect(validateWorkflowPolicy({ "ci.yml": unsafe })).toEqual(
      expect.arrayContaining([
        "unsafe workflow permission in ci.yml:permissions.contents",
        "publication credential in ci.yml:permissions.id-token",
        "unsafe workflow permission in ci.yml:permissions.id-token",
      ]),
    );
    const triggerAndScalarPermissions = workflow
      .replace(/permissions:\r?\n {2}contents: read/u, "permissions: write-all")
      .replace("  push:", "  workflow_dispatch:\n  push:")
      .replace(
        /(push:\r?\n {4}branches:\r?\n {6}- feature\/avilevin\/frontend-toolkit-alpha)/u,
        "$1\n    tags:\n      - v*",
      );
    expect(
      validateWorkflowPolicy({ "ci.yml": triggerAndScalarPermissions }),
    ).toEqual(
      expect.arrayContaining([
        "unsupported workflow events in ci.yml",
        "unsafe workflow permission in ci.yml:permissions",
        "unsupported tag trigger in ci.yml:on.push.tags",
      ]),
    );
    expect(validateWorkflowPolicy({ "ci.yml": unsafe })).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/publication\/deployment action/),
        expect.stringMatching(/publication command/),
      ]),
    );
    expect(
      validateWorkflowPolicy({
        "copilot-setup-steps.yml": setupWorkflow.replace(
          "contents: read",
          "contents: write",
        ),
      }),
    ).toContain(
      "unsafe workflow permission in copilot-setup-steps.yml:jobs.copilot-setup-steps.permissions.contents",
    );
  });

  it("rejects only structured remote tarball resolutions", async () => {
    const lockfile = await readFile(path.join(root, "pnpm-lock.yaml"), "utf8");
    expect(validateLockfilePolicy(lockfile)).toEqual([]);
    expect(
      validateLockfilePolicy(
        "lockfileVersion: '9.0'\npackages:\n  pkg:\n    resolution:\n      tarball: https://packagefeedproxy.microsoft.io/npm/pkg.tgz\n",
      ),
    ).toEqual(["nonportable tarball URL at packages.pkg.resolution.tarball"]);
  });

  it("rejects unsupported install, ownership, and deployment claims while allowing explicit denials", () => {
    expect(
      validateDocumentationClaims({
        "README.md":
          "This is not an official Sefaria product. The site is local-only and not deployed.",
      }),
    ).toEqual([]);
    expect(
      validateDocumentationClaims({
        "README.md":
          "This official Sefaria toolkit is deployed documentation.\n```powershell\nnpm install @sefaria/client\n```",
      }),
    ).toEqual([
      "unsupported registry installation command: README.md",
      "unsupported official ownership claim: README.md",
      "unsupported deployment claim: README.md",
    ]);
    expect(
      validateDocumentationClaims({
        "README.md":
          "The toolkit is deployed publicly.\nThis is not an official Microsoft product.",
      }),
    ).toEqual(["unsupported deployment claim: README.md"]);
  });
});
