import { spawn } from "node:child_process";
import { realpathSync } from "node:fs";
import { performance } from "node:perf_hooks";
import process from "node:process";
import { pathToFileURL } from "node:url";

export const CHECK_STAGES = [
  { name: "OpenAPI contracts", args: ["openapi:check"] },
  { name: "Integration policy", args: ["integration:check"] },
  { name: "Formatting", args: ["format:check"] },
  { name: "Oxlint", args: ["lint"] },
  { name: "Workspace builds", args: ["build"] },
  { name: "Documentation site", args: ["build:site:bundles"] },
  { name: "Documentation site browser acceptance", args: ["test:site"] },
  {
    name: "MCP Inspector stdio acceptance",
    args: ["--filter", "@sefaria-example/mcp-app", "inspect:stdio"],
  },
  {
    name: "MCP protocol and browser acceptance",
    args: ["--filter", "@sefaria-example/mcp-app", "demo"],
  },
  { name: "TypeScript typecheck", args: ["typecheck"] },
  { name: "API documentation", args: ["check:api-docs"] },
  { name: "Public metadata", args: ["metadata:check"] },
  { name: "TypeScript and browser tests", args: ["test"] },
  { name: "Compatibility qualification", args: ["compatibility:qualify"] },
  { name: "Tarball consumer", args: ["package:smoke"] },
  { name: "Changesets rehearsal", args: ["changeset:rehearse"] },
];

export async function runCheck({
  stages = CHECK_STAGES,
  run = runPnpm,
  log = writeLine,
  now = performance.now.bind(performance),
} = {}) {
  const results = [];

  for (const stage of stages) {
    log(`\n▶ ${stage.name}`);
    const started = now();
    const exitCode = await run(stage);
    const elapsed = now() - started;
    results.push({ name: stage.name, elapsed, exitCode });
    log(
      `${exitCode === 0 ? "✓" : "✗"} ${stage.name} (${formatDuration(elapsed)})`,
    );

    if (exitCode !== 0) {
      printSummary(results, log);
      return exitCode;
    }
  }

  printSummary(results, log);
  return 0;
}

function runPnpm(stage) {
  return new Promise((resolve, reject) => {
    const windows = process.platform === "win32";
    const executable = windows ? (process.env.ComSpec ?? "cmd.exe") : "pnpm";
    const args = windows
      ? ["/d", "/s", "/c", `pnpm ${stage.args.join(" ")}`]
      : stage.args;
    const child = spawn(executable, args, { stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code) => resolve(code ?? 1));
  });
}

function printSummary(results, log) {
  log("\nCheck stage timings:");
  for (const result of results) {
    const status = result.exitCode === 0 ? "passed" : "failed";
    log(`- ${result.name}: ${formatDuration(result.elapsed)} (${status})`);
  }
}

function formatDuration(milliseconds) {
  if (milliseconds < 1_000) {
    return `${Math.round(milliseconds)}ms`;
  }
  const seconds = milliseconds / 1_000;
  return seconds < 60
    ? `${seconds.toFixed(1)}s`
    : `${Math.floor(seconds / 60)}m ${(seconds % 60).toFixed(1)}s`;
}

function writeLine(message) {
  process.stdout.write(`${message}\n`);
}

export function isMainModule(
  moduleUrl,
  entryPath,
  resolveRealPath = realpathSync,
) {
  return (
    entryPath !== undefined &&
    moduleUrl === pathToFileURL(resolveRealPath(entryPath)).href
  );
}

if (isMainModule(import.meta.url, process.argv[1])) {
  process.exitCode = await runCheck();
}
