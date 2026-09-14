import { access, copyFile, mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

import {
  createSiteBuildSteps,
  SITE_REQUIRED_FILES,
} from "./build-site-plan.mjs";

const root = path.resolve(import.meta.dirname, "..");
const site = path.join(root, "dist", "site");
const stagedPublic = path.join(root, "dist", "site-public");
const skipTypecheck = process.argv.includes("--skip-typecheck");
const examplesOnly = process.argv.includes("--examples-only");

await rm(stagedPublic, { recursive: true, force: true });
await mkdir(path.join(stagedPublic, "examples"), { recursive: true });
await mkdir(path.join(stagedPublic, "images"), { recursive: true });
await copyFile(
  path.join(root, "docs", "images", "reader-navigation.html"),
  path.join(stagedPublic, "images", "reader-navigation.html"),
);
if (!examplesOnly) {
  await rm(site, { recursive: true, force: true });
}

for (const step of createSiteBuildSteps({ skipTypecheck })) {
  if (step.kind === "pnpm") {
    runPnpm(step.args);
    continue;
  }
  if (step.kind === "vite") {
    const destination = path.join(stagedPublic, "examples", step.route);
    runPnpm([
      "--filter",
      step.packageName,
      "exec",
      "vite",
      "build",
      `--base=/examples/${step.route}/`,
      `--outDir=${destination}`,
      "--emptyOutDir",
    ]);
    continue;
  }
  if (step.kind === "mcp-app") {
    const destination = path.join(stagedPublic, "examples", step.route);
    await mkdir(destination, { recursive: true });
    if (step.build) {
      runPnpm(["--filter", step.packageName, "build"]);
    }
    await copyFile(
      path.join(root, "examples", "mcp-app", "dist", "app", "mcp-app.html"),
      path.join(destination, "index.html"),
    );
    continue;
  }
  if (!examplesOnly) {
    runPnpm(["exec", "vitepress", "build", "docs"]);
  }
}

if (!examplesOnly) {
  for (const relativePath of SITE_REQUIRED_FILES) {
    await access(path.join(site, relativePath));
  }
  await verifyBuiltRoutes();
}

function runPnpm(args) {
  const windows = process.platform === "win32";
  const executable = windows ? (process.env.ComSpec ?? "cmd.exe") : "pnpm";
  const executableArgs = windows
    ? ["/d", "/s", "/c", `pnpm ${args.map(quoteArgument).join(" ")}`]
    : args;
  const result = spawnSync(executable, executableArgs, {
    cwd: root,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error(`pnpm ${args.join(" ")} failed.`);
  }
}

function quoteArgument(value) {
  return /[\s"]/u.test(value) ? `"${value.replaceAll('"', '\\"')}"` : value;
}

async function verifyBuiltRoutes() {
  for (const relativePath of SITE_REQUIRED_FILES.filter((file) =>
    file.endsWith(".html"),
  )) {
    const html = await readFile(path.join(site, relativePath), "utf8");
    if (html.length < 100 || !/<html[\s>]/iu.test(html)) {
      throw new Error(`${relativePath} is not a rendered HTML document.`);
    }
  }

  const authored = await readFile(
    path.join(site, "examples", "explorer", "authored.html"),
    "utf8",
  );
  if (/href=["']\/src\//u.test(authored)) {
    throw new Error(
      "The authored explorer contains a same-origin source link.",
    );
  }
}
