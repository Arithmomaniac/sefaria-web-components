import { spawnSync } from "node:child_process";
import { access } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import {
  BASELINE_TEST_INVENTORY_COMMIT,
  dispositionFor,
  EXPECTED_BASELINE_TEST_COUNT,
  EXPECTED_PRE_RETIREMENT_SHOWCASE_TEST_COUNT,
  EXPECTED_RETIRED_TEST_COUNT,
  PRE_RETIREMENT_SHOWCASE_COMMIT,
} from "./test-disposition.mjs";

const root = path.resolve(import.meta.dirname, "..");
const baselineTests = listTreeTests(BASELINE_TEST_INVENTORY_COMMIT);
if (baselineTests.length !== EXPECTED_BASELINE_TEST_COUNT) {
  throw new Error(
    `Baseline test inventory changed: expected ${EXPECTED_BASELINE_TEST_COUNT}, found ${baselineTests.length}.`,
  );
}

const showcaseTests = listTreeTests(PRE_RETIREMENT_SHOWCASE_COMMIT).filter(
  (filename) => filename.startsWith("demos/showcase/"),
);
if (showcaseTests.length !== EXPECTED_PRE_RETIREMENT_SHOWCASE_TEST_COUNT) {
  throw new Error(
    `Pre-retirement showcase inventory changed: expected ${EXPECTED_PRE_RETIREMENT_SHOWCASE_TEST_COUNT}, found ${showcaseTests.length}.`,
  );
}

const discovered = new Set(
  capture("pnpm", [
    "exec",
    "vitest",
    "list",
    "--filesOnly",
    "--staticParse",
    "--project",
    "unit",
    "--project",
    "browser",
  ])
    .split(/\r?\n/u)
    .map((line) => line.replace(/^\[[^\]]+\]\s+/u, "").trim())
    .filter(Boolean),
);

let retired = 0;
for (const baselinePath of baselineTests) {
  const disposition = dispositionFor(baselinePath);
  if (disposition.status === "retired") {
    retired += 1;
    if (!disposition.reason.trim()) {
      throw new Error(`Retired test lacks a reason: ${baselinePath}`);
    }
    continue;
  }
  if (disposition.destinations.length === 0) {
    throw new Error(`Retained test lacks a destination: ${baselinePath}`);
  }
  for (const destination of disposition.destinations) {
    await access(path.join(root, destination));
    if (!discovered.has(destination)) {
      throw new Error(
        `Retained test is not discovered by Vitest: ${baselinePath} -> ${destination}`,
      );
    }
  }
}

if (retired !== EXPECTED_RETIRED_TEST_COUNT) {
  throw new Error(
    `Retired test disposition changed: expected ${EXPECTED_RETIRED_TEST_COUNT}, found ${retired}.`,
  );
}

process.stdout.write(
  `Test disposition: ${baselineTests.length - retired} retained baseline tests are discovered; ${retired} presentation or superseded tests have explicit reasons; ${showcaseTests.length} pre-retirement showcase tests were reconciled.\n`,
);

function listTreeTests(commit) {
  return capture("git", ["ls-tree", "-r", "--name-only", commit])
    .split(/\r?\n/u)
    .filter((filename) => /\.test\.tsx?$/u.test(filename))
    .sort();
}

function capture(command, args) {
  const windowsPnpm = process.platform === "win32" && command === "pnpm";
  const executable = windowsPnpm ? (process.env.ComSpec ?? "cmd.exe") : command;
  const commandArgs = windowsPnpm
    ? ["/d", "/s", "/c", `pnpm ${args.join(" ")}`]
    : args;
  const result = spawnSync(executable, commandArgs, {
    cwd: root,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed. Run "pnpm setup:agent" in a fresh or shallow checkout before "pnpm check".\n${result.error?.message ?? result.stderr ?? result.stdout}`,
    );
  }
  return result.stdout;
}
