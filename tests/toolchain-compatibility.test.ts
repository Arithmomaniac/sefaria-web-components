import { spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

const repository = path.resolve(import.meta.dirname, "..");
const fixtureDirectory = path.join(
  repository,
  "packages",
  ".toolchain-compatibility",
);

afterEach(async () => {
  await rm(fixtureDirectory, { force: true, recursive: true });
});

describe("Oxlint qualification", { timeout: 15_000 }, () => {
  it.each([
    {
      name: "requires type-only imports",
      source: [
        'import { ImportedType } from "./types.js";',
        "export type ExportedType = ImportedType;",
      ].join("\n"),
      oxlintRule: "typescript/consistent-type-imports",
    },
    {
      name: "rejects explicit any",
      source: [
        "/** Describes a public value. */",
        "export type PublicValue = any;",
      ].join("\n"),
      oxlintRule: "typescript/no-explicit-any",
    },
  ])(
    "preserves the baseline rule that $name",
    async ({ source, oxlintRule }) => {
      const file = await writeFixture("invalid.ts", source);

      const oxlint = await lint("oxlint", [
        "--config",
        path.join(repository, ".oxlintrc.json"),
        "--format",
        "json",
        file,
      ]);

      expect(oxlint.exitCode).not.toBe(0);
      expect(oxlint.output).toContain(oxlintRule);
    },
  );

  it("accepts documented declarations and value imports", async () => {
    await writeFixture(
      "types.ts",
      [
        "/** Describes an imported runtime value. */",
        "export const importedValue = 1;",
      ].join("\n"),
    );
    const file = await writeFixture(
      "valid.ts",
      [
        'import { importedValue } from "./types.js";',
        "/** Describes a public value. */",
        "export interface PublicValue {",
        "  /** Contains the value. */",
        "  value: string;",
        "}",
        "/** Returns a public value. */",
        "export function publicValue(): PublicValue {",
        "  return { value: String(importedValue) };",
        "}",
      ].join("\n"),
    );

    const oxlint = await lint("oxlint", [
      "--config",
      path.join(repository, ".oxlintrc.json"),
      "--format",
      "json",
      file,
    ]);

    expect(oxlint).toMatchObject({ exitCode: 0 });
  });

  it("preserves JavaScript undefined-name checking", async () => {
    const file = await writeFixture(
      "script.mjs",
      "export const publicValue = missingValue;",
    );

    const oxlint = await lint("oxlint", [
      "--config",
      path.join(repository, ".oxlintrc.json"),
      "--format",
      "json",
      file,
    ]);

    expect(oxlint.output).toContain("no-undef");
  });

  it.each([
    [
      "duplicate parameters",
      "export function invalid(value, value) {}",
      "already been declared",
    ],
    ["legacy octal literals", "export const invalid = 010;", "octal literals"],
  ])("rejects %s during parsing", async (_name, source, expectedMessage) => {
    const file = await writeFixture("invalid.mjs", source);
    const oxlint = await lint("oxlint", [
      "--config",
      path.join(repository, ".oxlintrc.json"),
      "--format",
      "json",
      file,
    ]);

    expect(oxlint.exitCode).not.toBe(0);
    expect(oxlint.output).toContain(expectedMessage);
  });
});

async function writeFixture(name: string, contents: string): Promise<string> {
  const file = path.join(fixtureDirectory, name);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${contents}\n`, "utf8");
  return file;
}

async function lint(
  command: "oxlint",
  args: string[],
): Promise<{ exitCode: number; output: string }> {
  const commandPath = path.join(
    repository,
    "node_modules",
    command,
    "bin",
    command,
  );

  return await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [commandPath, ...args], {
      cwd: repository,
      windowsHide: true,
    });
    let output = "";

    child.stdout.on("data", (chunk: Buffer) => {
      output += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk: Buffer) => {
      output += chunk.toString("utf8");
    });
    child.once("error", reject);
    child.once("exit", (code) => {
      resolve({ exitCode: code ?? 1, output });
    });
  });
}
