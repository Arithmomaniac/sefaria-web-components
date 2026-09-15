import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it, vi } from "vitest";

import {
  REQUIRED_HISTORY_COMMITS,
  classifyToolkitManifest,
  ensureGitObjects,
  runAgentSetup,
} from "../scripts/setup-agent.mjs";

const execFileAsync = promisify(execFile);

describe("Copilot agent setup", () => {
  it("recognizes the toolkit package without depending on a branch name", () => {
    expect(
      classifyToolkitManifest({
        name: "@sefaria/web-components",
        private: true,
      }),
    ).toBe("toolkit");
    expect(
      classifyToolkitManifest({
        name: "@sefaria/components",
        private: true,
      }),
    ).toBe("unrelated");
    expect(() => classifyToolkitManifest({ private: true })).toThrow(
      "packages/web-components/package.json",
    );
  });

  it("prepares dependencies, immutable history, Chromium, and a launch probe", async () => {
    const run = vi.fn().mockResolvedValue(0);
    const hasGitObject = vi
      .fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValue(true);

    await expect(
      runAgentSetup({
        platform: "win32",
        run,
        hasGitObject,
      }),
    ).resolves.toBeUndefined();

    expect(run.mock.calls).toEqual([
      ["pnpm", ["--version"]],
      ["pnpm", ["install", "--frozen-lockfile"]],
      ["git", ["fetch", "--no-tags", "origin", ...REQUIRED_HISTORY_COMMITS]],
      ["pnpm", ["exec", "playwright", "install", "chromium"]],
      [
        "node",
        [
          "--input-type=module",
          "--eval",
          expect.stringContaining("chromium.launch"),
        ],
      ],
    ]);
  });

  it("does not fetch history that is already available", async () => {
    const run = vi.fn().mockResolvedValue(0);

    await runAgentSetup({
      platform: "linux",
      run,
      hasGitObject: vi.fn().mockResolvedValue(true),
    });

    expect(run).not.toHaveBeenCalledWith(
      "git",
      expect.arrayContaining(["fetch"]),
    );
    expect(run).toHaveBeenCalledWith("pnpm", [
      "exec",
      "playwright",
      "install",
      "--with-deps",
      "chromium",
    ]);
  });

  it("stops at the exact failed preparation step", async () => {
    const run = vi.fn().mockResolvedValueOnce(0).mockResolvedValueOnce(17);

    await expect(
      runAgentSetup({
        platform: "linux",
        run,
        hasGitObject: vi.fn().mockResolvedValue(true),
      }),
    ).rejects.toThrow(
      "pnpm install --frozen-lockfile failed with exit code 17",
    );
    expect(run).toHaveBeenCalledTimes(2);
  });

  it("obtains required objects in a real shallow checkout", async () => {
    const fixture = await mkdtemp(path.join(tmpdir(), "sefaria-agent-setup-"));
    const source = path.join(fixture, "source");
    const checkout = path.join(fixture, "checkout");
    try {
      await git(["init", "--initial-branch=main", source], fixture);
      await git(["config", "user.name", "Setup Test"], source);
      await git(["config", "user.email", "setup@example.test"], source);

      const commits = [];
      for (const value of ["one", "two", "three"]) {
        await writeFile(path.join(source, "value.txt"), `${value}\n`);
        await git(["add", "value.txt"], source);
        await git(["commit", "-m", value], source);
        commits.push(await git(["rev-parse", "HEAD"], source));
      }

      const sourceUrl = new URL(`file:///${source.replaceAll("\\", "/")}`).href;
      await git(["clone", "--depth", "1", sourceUrl, checkout], fixture);
      expect(await objectExists(checkout, commits[0])).toBe(false);

      await ensureGitObjects(commits.slice(0, 2), {
        run: async (command, args) => {
          expect(command).toBe("git");
          await git(args, checkout);
          return 0;
        },
        hasGitObject: (commit) => objectExists(checkout, commit),
      });

      expect(await objectExists(checkout, commits[0])).toBe(true);
      expect(await objectExists(checkout, commits[1])).toBe(true);
    } finally {
      await rm(fixture, { recursive: true, force: true });
    }
  }, 15_000);
});

async function git(args: string[], cwd: string): Promise<string> {
  const result = await execFileAsync("git", args, { cwd });
  return result.stdout.trim();
}

async function objectExists(cwd: string, commit: string): Promise<boolean> {
  try {
    await git(["cat-file", "-e", `${commit}^{commit}`], cwd);
    return true;
  } catch {
    return false;
  }
}
