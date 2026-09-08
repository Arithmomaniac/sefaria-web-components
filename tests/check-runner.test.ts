import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { describe, expect, it, vi } from "vitest";

import { CHECK_STAGES, isMainModule, runCheck } from "../scripts/check.mjs";

describe("repository check runner", () => {
  it("runs cheap Python static checks before TypeScript validation", () => {
    const names = CHECK_STAGES.map((stage) => stage.name);

    expect(names.indexOf("Python static checks")).toBeLessThan(
      names.indexOf("TypeScript typecheck"),
    );
    expect(names.at(-1)).toBe("Python staged tests");
  });

  it("stops after the first failed stage and reports completed timings", async () => {
    const run = vi.fn().mockResolvedValueOnce(0).mockResolvedValueOnce(7);
    const log = vi.fn();

    const exitCode = await runCheck({
      stages: CHECK_STAGES.slice(0, 3),
      run,
      log,
      now: sequenceClock(100, 350, 500, 900),
    });

    expect(exitCode).toBe(7);
    expect(run).toHaveBeenCalledTimes(2);
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining("OpenAPI contracts"),
    );
    expect(log).toHaveBeenCalledWith(expect.stringContaining("250ms"));
    expect(log).toHaveBeenCalledWith(expect.stringContaining("failed"));
  });

  it("recognizes the entry point after resolving a symlinked path", () => {
    const realPath = path.resolve("real-worktree", "scripts", "check.mjs");

    expect(
      isMainModule(
        pathToFileURL(realPath).href,
        path.resolve("linked-worktree", "scripts", "check.mjs"),
        () => realPath,
      ),
    ).toBe(true);
  });

  it("keeps emitting build metadata inside the output directory", async () => {
    const repository = path.resolve(import.meta.dirname, "..");
    const configs = [
      "packages/client/tsconfig.build.json",
      "packages/components/tsconfig.build.json",
      "packages/text-transform/tsconfig.build.json",
      "tests/compatibility/tsconfig.build.json",
    ];

    for (const config of configs) {
      const contents = JSON.parse(
        await readFile(path.join(repository, config), "utf8"),
      ) as {
        compilerOptions?: {
          outDir?: string;
          tsBuildInfoFile?: string;
        };
      };

      expect(contents.compilerOptions, config).toMatchObject({
        outDir: "dist",
        tsBuildInfoFile: "dist/.tsbuildinfo",
      });
    }
  });
});

function sequenceClock(...values: number[]): () => number {
  let index = 0;
  return () => values[index++] ?? values.at(-1) ?? 0;
}
