import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repository = path.resolve(import.meta.dirname, "..");

describe("TypeScript compiler ownership", () => {
  it("keeps the workspace compiler on TypeScript 7", async () => {
    const rootPackage = await readJson<{
      devDependencies: { typescript: string };
    }>(path.join(repository, "package.json"));
    const rootRequire = createRequire(path.join(repository, "package.json"));
    const installed = rootRequire("typescript/package.json") as {
      version: string;
    };

    expect(rootPackage.devDependencies.typescript).toBe("7.0.2");
    expect(installed.version).toBe("7.0.2");
  });

  it("isolates TypeScript 6 to the OpenAPI generator package", async () => {
    const clientPackagePath = path.join(
      repository,
      "packages",
      "client",
      "package.json",
    );
    const clientPackage = await readJson<{
      devDependencies: { typescript: string };
      scripts: { build: string; typecheck: string };
    }>(clientPackagePath);
    const clientRequire = createRequire(clientPackagePath);
    const installed = clientRequire("typescript/package.json") as {
      version: string;
    };

    expect(clientPackage.devDependencies.typescript).toBe("6.0.3");
    expect(installed.version).toBe("6.0.3");
    expect(clientPackage.scripts.build).toContain("--workspace-root exec tsc");
    expect(clientPackage.scripts.typecheck).toContain(
      "--workspace-root exec tsc",
    );
  });
});

async function readJson<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(file, "utf8")) as T;
}
