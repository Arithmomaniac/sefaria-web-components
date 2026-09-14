import path from "node:path";

import { describe, expect, it } from "vitest";

import {
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
