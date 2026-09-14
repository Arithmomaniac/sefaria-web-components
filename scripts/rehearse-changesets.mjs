import { spawnSync } from "node:child_process";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";

const repository = path.resolve(import.meta.dirname, "..");
const fixture = path.join(tmpdir(), "sefaria-toolkit-changesets-rehearsal");
await rm(fixture, { force: true, recursive: true });
await mkdir(path.join(fixture, ".changeset"), { recursive: true });
await cp(
  path.join(repository, ".changeset", "config.json"),
  path.join(fixture, ".changeset", "config.json"),
);
await writeJson("package.json", {
  name: "changesets-rehearsal",
  version: "0.0.0",
  private: true,
});
await writeFile(
  path.join(fixture, "pnpm-workspace.yaml"),
  "packages:\n  - packages/*\n",
);
for (const [directory, name] of [
  ["client", "@sefaria/client"],
  ["text-transform", "@sefaria/text-transform"],
  ["web-components", "@sefaria/web-components"],
]) {
  await mkdir(path.join(fixture, "packages", directory), { recursive: true });
  await writeJson(`packages/${directory}/package.json`, {
    name,
    version: "0.1.0",
    private: true,
    ...(name === "@sefaria/web-components"
      ? {
          dependencies: {
            "@sefaria/client": "^0.1.0",
            "@sefaria/text-transform": "^0.1.0",
          },
        }
      : {}),
  });
}

run("git", ["init", "--initial-branch", "fixture"]);
run("git", ["config", "user.name", "Changesets Rehearsal"]);
run("git", ["config", "user.email", "changesets-rehearsal@example.invalid"]);
run("git", ["add", "."]);
run("git", ["commit", "-m", "fixture baseline"]);
const baseline = capture("git", ["rev-parse", "HEAD"]).trim();

await writeChangeset("first-alpha", "@sefaria/client", "Exercise first alpha.");
runChangesets(["pre", "enter", "alpha"]);
runChangesets(["version"]);
const firstVersions = await readVersions();
assertSynchronized(firstVersions);
if (!/^\d+\.\d+\.\d+-alpha\.0$/u.test(firstVersions[0])) {
  throw new Error(`Unexpected first prerelease version ${firstVersions[0]}.`);
}

await writeChangeset(
  "second-alpha",
  "@sefaria/text-transform",
  "Exercise subsequent alpha.",
);
runChangesets(["version"]);
const secondVersions = await readVersions();
assertSynchronized(secondVersions);
if (!/^\d+\.\d+\.\d+-alpha\.1$/u.test(secondVersions[0])) {
  throw new Error(`Unexpected second prerelease version ${secondVersions[0]}.`);
}

const webManifest = await readJson("packages/web-components/package.json");
for (const dependency of ["@sefaria/client", "@sefaria/text-transform"]) {
  if (webManifest.dependencies[dependency] !== `^${secondVersions[0]}`) {
    throw new Error(
      `${dependency} was not updated to the synchronized fixed-group version.`,
    );
  }
}
for (const directory of ["client", "text-transform", "web-components"]) {
  const manifest = await readJson(`packages/${directory}/package.json`);
  if (manifest.private !== true) {
    throw new Error(`${manifest.name} lost private status.`);
  }
  const changelog = await readFile(
    path.join(fixture, "packages", directory, "CHANGELOG.md"),
    "utf8",
  );
  if (!changelog.includes(secondVersions[0])) {
    throw new Error(
      `${manifest.name} changelog is missing the alpha sequence.`,
    );
  }
}
if (capture("git", ["rev-parse", "HEAD"]).trim() !== baseline) {
  throw new Error("Changesets created an automatic commit.");
}
if (capture("git", ["tag", "--list"]).trim() !== "") {
  throw new Error("Changesets created a tag during local versioning.");
}

process.stdout.write(
  `Changesets rehearsal: ${firstVersions[0]} -> ${secondVersions[0]}, fixed libraries synchronized with no commit or tag.\n`,
);

async function writeChangeset(id, packageName, summary) {
  await writeFile(
    path.join(fixture, ".changeset", `${id}.md`),
    `---\n"${packageName}": patch\n---\n\n${summary}\n`,
  );
}

async function readVersions() {
  return Promise.all(
    ["client", "text-transform", "web-components"].map(async (directory) => {
      const manifest = await readJson(`packages/${directory}/package.json`);
      return manifest.version;
    }),
  );
}

function assertSynchronized(versions) {
  if (new Set(versions).size !== 1) {
    throw new Error(`Fixed library versions diverged: ${versions.join(", ")}.`);
  }
}

function runChangesets(args) {
  const binary = path.join(
    repository,
    "node_modules",
    "@changesets",
    "cli",
    "bin.js",
  );
  run(process.execPath, [binary, ...args]);
}

function run(command, args) {
  const windowsCommand =
    process.platform === "win32" && command.endsWith(".cmd");
  const executable = windowsCommand
    ? (process.env.ComSpec ?? "cmd.exe")
    : command;
  const executableArgs = windowsCommand
    ? ["/d", "/s", "/c", `${command} ${args.join(" ")}`]
    : args;
  const result = spawnSync(executable, executableArgs, {
    cwd: fixture,
    env: { ...process.env, INIT_CWD: fixture },
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} exited with ${result.status}.`,
    );
  }
}

function capture(command, args) {
  const result = spawnSync(command, args, {
    cwd: fixture,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} exited with ${result.status}.`,
    );
  }
  return result.stdout;
}

async function writeJson(relativePath, value) {
  const filename = path.join(fixture, relativePath);
  await mkdir(path.dirname(filename), { recursive: true });
  await writeFile(filename, `${JSON.stringify(value, null, 2)}\n`);
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(fixture, relativePath), "utf8"));
}
