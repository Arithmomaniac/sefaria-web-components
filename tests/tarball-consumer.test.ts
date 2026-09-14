import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { describe, expect, it } from "vitest";

import {
  resolveModuleFromParent,
  validateConsumerLockfile,
  validateInstalledPath,
  validatePackedPackage,
} from "../scripts/tarball-consumer-validation.mjs";

const clientDefinition = {
  name: "@sefaria/client",
  filename: "sefaria-client-0.0.0.tgz",
  subpaths: [".", "./client"],
};
const clientManifest = {
  name: "@sefaria/client",
  private: true,
  exports: {
    ".": {
      import: "./dist/index.js",
      types: "./dist/index.d.ts",
    },
    "./client": {
      import: "./dist/client.js",
      types: "./dist/client.d.ts",
    },
  },
};

describe("tarball consumer validation", () => {
  it("rejects a packed export whose JavaScript target is missing", () => {
    const contents = new Set([
      "package/dist/index.js",
      "package/dist/index.d.ts",
      "package/dist/client.d.ts",
    ]);

    expect(() =>
      validatePackedPackage({
        definition: clientDefinition,
        manifest: clientManifest,
        contents,
      }),
    ).toThrow("tarball is missing package/dist/client.js");
  });

  it("rejects workspace and registry fallback in the consumer lockfile", () => {
    expect(() =>
      validateConsumerLockfile(
        "dependencies:\n  '@sefaria/client':\n    specifier: workspace:*\n",
        [clientDefinition],
      ),
    ).toThrow("workspace source");
    expect(() =>
      validateConsumerLockfile(
        "specifier: file:../tarballs/sefaria-client-0.0.0.tgz\nresolution: {tarball: https://registry.example/@sefaria/client.tgz}\n",
        [clientDefinition],
      ),
    ).toThrow("registry");
  });

  it("rejects an installed package that resolves from producer source", () => {
    const repository = path.resolve("repository");
    const consumer = path.resolve("temporary", "consumer");

    expect(() =>
      validateInstalledPath({
        packageName: "@sefaria/client",
        installedPath: path.join(repository, "packages", "client", "dist"),
        consumer,
        repository,
      }),
    ).toThrow("resolves outside the isolated consumer");
  });

  it("resolves a dependency from the UI package parent rather than the process cwd", async () => {
    const fixture = await mkdtemp(
      path.join(tmpdir(), "sefaria-parent-resolution-test-"),
    );
    try {
      const topLevel = path.join(fixture, "node_modules", "probe-dependency");
      const ui = path.join(fixture, "node_modules", "probe-ui");
      const nested = path.join(ui, "node_modules", "probe-dependency");
      await Promise.all([
        writePackage(topLevel, "top-level"),
        writePackage(nested, "ui-relative"),
        mkdir(ui, { recursive: true }).then(() =>
          writeFile(path.join(ui, "entry.mjs"), ""),
        ),
      ]);

      const resolved = resolveModuleFromParent({
        specifier: "probe-dependency",
        parentUrl: pathToFileURL(path.join(ui, "entry.mjs")).href,
        cwd: fixture,
      });

      expect(resolved).toBe(pathToFileURL(path.join(nested, "index.js")).href);
      expect(resolved).not.toBe(
        pathToFileURL(path.join(topLevel, "index.js")).href,
      );
    } finally {
      await rm(fixture, { force: true, recursive: true });
    }
  });

  it("accepts a complete package and installed consumer path", () => {
    expect(() =>
      validatePackedPackage({
        definition: clientDefinition,
        manifest: clientManifest,
        contents: new Set([
          "package/dist/index.js",
          "package/dist/index.d.ts",
          "package/dist/client.js",
          "package/dist/client.d.ts",
        ]),
      }),
    ).not.toThrow();

    expect(() =>
      validateInstalledPath({
        packageName: "@sefaria/client",
        installedPath: path.resolve(
          "temporary",
          "consumer",
          "node_modules",
          "@sefaria",
          "client",
          "dist",
          "index.js",
        ),
        consumer: path.resolve("temporary", "consumer"),
        repository: path.resolve("repository"),
      }),
    ).not.toThrow();
  });
});

async function writePackage(directory: string, marker: string) {
  await mkdir(directory, { recursive: true });
  await Promise.all([
    writeFile(
      path.join(directory, "package.json"),
      `${JSON.stringify({
        name: "probe-dependency",
        type: "module",
        exports: "./index.js",
      })}\n`,
    ),
    writeFile(
      path.join(directory, "index.js"),
      `export default ${JSON.stringify(marker)};\n`,
    ),
  ]);
}
