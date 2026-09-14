import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { describe, expect, it, vi } from "vitest";

import { CHECK_STAGES, isMainModule, runCheck } from "../scripts/check.mjs";

describe("repository check runner", () => {
  it("replaces Python checks with the compiled MCP acceptance harness", () => {
    const names = CHECK_STAGES.map((stage) => stage.name);

    expect(names).not.toContain("Python static checks");
    expect(names).not.toContain("Python staged tests");
    expect(names.indexOf("Integration policy")).toBeLessThan(
      names.indexOf("Workspace builds"),
    );
    expect(names.indexOf("Workspace builds")).toBeLessThan(
      names.indexOf("MCP Inspector stdio acceptance"),
    );
    expect(names.indexOf("MCP Inspector stdio acceptance")).toBeLessThan(
      names.indexOf("MCP protocol and browser acceptance"),
    );
    expect(names.indexOf("MCP protocol and browser acceptance")).toBeLessThan(
      names.indexOf("TypeScript typecheck"),
    );
    expect(names.at(-1)).toBe("Changesets rehearsal");
  });

  it("builds workspace artifacts before TypeScript consumers resolve them", () => {
    const names = CHECK_STAGES.map((stage) => stage.name);

    expect(names).toContain("Oxlint");
    expect(names.indexOf("Workspace builds")).toBeLessThan(
      names.indexOf("TypeScript typecheck"),
    );
    expect(names.indexOf("API documentation")).toBeGreaterThan(
      names.indexOf("TypeScript typecheck"),
    );
    expect(names.indexOf("Public metadata")).toBeGreaterThan(
      names.indexOf("API documentation"),
    );
    expect(names.indexOf("API documentation")).toBeLessThan(
      names.indexOf("TypeScript and browser tests"),
    );
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
    const configs: Array<readonly [string, string, string]> = [
      ["packages/client/tsconfig.build.json", "dist", "dist/.tsbuildinfo"],
      [
        "packages/web-components/tsconfig.build.json",
        "dist",
        "dist/.tsbuildinfo",
      ],
      [
        "packages/text-transform/tsconfig.build.json",
        "dist",
        "dist/.tsbuildinfo",
      ],
      ["tests/compatibility/tsconfig.build.json", "dist", "dist/.tsbuildinfo"],
      [
        "examples/mcp-app/tsconfig.server.json",
        "dist/server",
        "dist/server/.tsbuildinfo",
      ],
    ];

    for (const [config, outDir, tsBuildInfoFile] of configs) {
      const contents = JSON.parse(
        await readFile(path.join(repository, config), "utf8"),
      ) as {
        compilerOptions?: {
          outDir?: string;
          tsBuildInfoFile?: string;
        };
      };

      expect(contents.compilerOptions, config).toMatchObject({
        outDir,
        tsBuildInfoFile,
      });
    }
  });
});

function sequenceClock(...values: number[]): () => number {
  let index = 0;
  return () => values[index++] ?? values.at(-1) ?? 0;
}
