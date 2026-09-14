import { execFile } from "node:child_process";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

const repository = path.resolve(import.meta.dirname, "..");
const execFileAsync = promisify(execFile);

describe("private Changesets configuration", () => {
  it("versions exactly the three libraries as a fixed private group", async () => {
    const config = JSON.parse(
      await readFile(
        path.join(repository, ".changeset", "config.json"),
        "utf8",
      ),
    ) as {
      baseBranch: string;
      commit: boolean;
      fixed: string[][];
      privatePackages: { version: boolean; tag: boolean };
    };

    expect(config).toMatchObject({
      baseBranch: "feature/avilevin/frontend-toolkit-alpha",
      commit: false,
      privatePackages: { version: true, tag: false },
    });
    expect(config.fixed).toEqual([
      ["@sefaria/client", "@sefaria/text-transform", "@sefaria/web-components"],
    ]);
  });

  it("runs two rehearsals concurrently without sharing or leaking fixtures", async () => {
    const temporaryDirectory = await mkdtemp(
      path.join(tmpdir(), "sefaria-changesets-concurrency-test-"),
    );
    try {
      const script = path.join(repository, "scripts/rehearse-changesets.mjs");
      const environment = {
        ...process.env,
        SEFARIA_REHEARSAL_TEMP_DIRECTORY: temporaryDirectory,
      };
      const results = await Promise.all([
        execFileAsync(process.execPath, [script], { env: environment }),
        execFileAsync(process.execPath, [script], { env: environment }),
      ]);

      for (const result of results) {
        expect(result.stdout).toContain(
          "Changesets rehearsal: 0.1.1-alpha.0 -> 0.1.1-alpha.1",
        );
      }
      expect(await readdir(temporaryDirectory)).toEqual([]);
    } finally {
      await rm(temporaryDirectory, { force: true, recursive: true });
    }
  }, 30_000);
});
