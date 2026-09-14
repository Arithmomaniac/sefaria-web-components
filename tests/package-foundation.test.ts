import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repository = path.resolve(import.meta.dirname, "..");

describe("library package foundations", () => {
  const packages = [
    [
      "packages/client/package.json",
      "@sefaria/client",
      7,
      ["dist", "!dist/*.tsbuildinfo", "README.md"],
    ],
    [
      "packages/text-transform/package.json",
      "@sefaria/text-transform",
      1,
      ["dist", "!dist/*.tsbuildinfo", "README.md"],
    ],
    [
      "packages/web-components/package.json",
      "@sefaria/web-components",
      10,
      ["dist", "!dist/*.tsbuildinfo", "README.md", "custom-elements.json"],
    ],
  ] as const;

  it.each(packages)(
    "%s exports built JavaScript and declarations",
    async (manifestPath, packageName, exportCount, files) => {
      const manifest = await readManifest(manifestPath);

      expect(manifest.name).toBe(packageName);
      expect(manifest.private).toBe(true);
      expect(manifest.license).toBe("GPL-3.0-only");
      expect(manifest.repository).toEqual({
        type: "git",
        url: "git+https://github.com/Arithmomaniac/sefaria-web-components.git",
        directory: manifestPath.split("/").slice(0, -1).join("/"),
      });
      expect(manifest.files).toEqual(files);

      const exports =
        typeof manifest.exports === "string"
          ? { ".": manifest.exports }
          : manifest.exports;
      expect(Object.keys(exports)).toHaveLength(exportCount);
      for (const target of Object.values(exports)) {
        expect(target).toMatchObject({
          types: expect.stringMatching(/^\.\/dist\/.+\.d\.ts$/u),
          import: expect.stringMatching(/^\.\/dist\/.+\.js$/u),
        });
      }
    },
  );

  it("retains custom-element registration side effects only on browser entries", async () => {
    const manifest = await readManifest("packages/web-components/package.json");

    expect(manifest.sideEffects).toEqual([
      "./dist/index.js",
      "./dist/*-element.js",
    ]);
  });

  it.each([
    "packages/client/tsconfig.build.json",
    "packages/text-transform/tsconfig.build.json",
    "packages/web-components/tsconfig.build.json",
  ])("%s keeps producer-only build state out of dist", async (configPath) => {
    const config = JSON.parse(
      await readFile(path.join(repository, configPath), "utf8"),
    ) as {
      compilerOptions: {
        declarationMap?: boolean;
        sourceMap?: boolean;
        tsBuildInfoFile?: string;
      };
    };

    expect(config.compilerOptions.declarationMap).toBe(false);
    expect(config.compilerOptions.sourceMap).toBe(false);
    expect(config.compilerOptions.tsBuildInfoFile).toBe("dist/.tsbuildinfo");
  });

  it("serves moved examples and retained demos from the primary development root", async () => {
    const [rootManifest, explorerManifest, explorer] = await Promise.all([
      readManifest("package.json"),
      readManifest("examples/explorer/package.json"),
      readFile(path.join(repository, "examples/explorer/index.html"), "utf8"),
    ]);

    expect(rootManifest.scripts?.dev).toContain(
      "vite . --open /examples/explorer/",
    );
    expect(explorerManifest.scripts?.dev).toContain(
      "vite . --open /examples/explorer/",
    );
    for (const scriptName of [
      "dev:bilingual-segment",
      "dev:connections",
      "dev:source-card",
      "dev:ref-label",
      "dev:text-segment",
    ]) {
      expect(rootManifest.scripts?.[scriptName]).toContain(
        "vite . --open /examples/explorer/",
      );
    }
    expect(explorer).toContain('data-local-target="/examples/reader/"');
    expect(explorer).toContain('data-local-target="/demos/linker/"');
  });
});

interface PackageManifest {
  readonly name?: string;
  readonly private?: boolean;
  readonly license?: string;
  readonly repository?: unknown;
  readonly files?: readonly string[];
  readonly sideEffects?: unknown;
  readonly scripts?: Record<string, string>;
  readonly exports?:
    | string
    | Record<string, { readonly types?: string; readonly import?: string }>;
}

async function readManifest(relativePath: string): Promise<PackageManifest> {
  return JSON.parse(
    await readFile(path.join(repository, relativePath), "utf8"),
  ) as PackageManifest;
}
