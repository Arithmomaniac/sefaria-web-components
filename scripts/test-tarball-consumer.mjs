import { spawnSync } from "node:child_process";
import {
  access,
  cp,
  mkdir,
  readFile,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";
import { preview } from "vite";
import YAML from "yaml";

const repository = path.resolve(import.meta.dirname, "..");
const root = path.join(repository, ".toolchain", "tarball-consumer");
const tarballs = path.join(root, "tarballs");
const consumer = path.join(root, "consumer");
const packageDefinitions = [
  {
    name: "@sefaria/client",
    directory: "client",
    filename: "sefaria-client-0.0.0.tgz",
  },
  {
    name: "@sefaria/text-transform",
    directory: "text-transform",
    filename: "sefaria-text-transform-0.0.0.tgz",
  },
  {
    name: "@sefaria/web-components",
    directory: "web-components",
    filename: "sefaria-web-components-0.0.0.tgz",
  },
];

await rm(root, { force: true, recursive: true });
await mkdir(tarballs, { recursive: true });
for (const packageDefinition of packageDefinitions) {
  run("pnpm", [
    "--filter",
    packageDefinition.name,
    "pack",
    "--pack-destination",
    tarballs,
  ]);
  await inspectTarball(packageDefinition);
}

await stageConsumer();
run("pnpm", ["install", "--lockfile-only"], consumer);
run("pnpm", ["install", "--frozen-lockfile"], consumer);
await inspectConsumerResolution();

await rm(tarballs, { force: true, recursive: true });
run("pnpm", ["build"], consumer);
await smokeChromium();

process.stdout.write(
  "Tarball consumer: manifests, contents, resolution, build, Node paths, and Chromium smoke passed.\n",
);

async function inspectTarball(packageDefinition) {
  const tarball = path.join(tarballs, packageDefinition.filename);
  await access(tarball);
  const manifest = JSON.parse(
    capture("tar", ["-xOf", tarball, "package/package.json"]),
  );
  if (manifest.name !== packageDefinition.name || manifest.private !== true) {
    throw new Error(`${packageDefinition.name} packed manifest is incorrect.`);
  }
  if (
    packageDefinition.name === "@sefaria/web-components" &&
    (manifest.dependencies?.["@sefaria/client"] !== "0.0.0" ||
      manifest.dependencies?.["@sefaria/text-transform"] !== "0.0.0")
  ) {
    throw new Error(
      "@sefaria/web-components internal dependency versions were not packed exactly.",
    );
  }
  const contents = new Set(
    capture("tar", ["-tf", tarball]).split(/\r?\n/u).filter(Boolean),
  );
  if ([...contents].some((entry) => entry.startsWith("package/src/"))) {
    throw new Error(
      `${packageDefinition.name} tarball contains producer source.`,
    );
  }
  if (
    [...contents].some((entry) =>
      /\.test\.(?:js|d\.ts)(?:\.map)?$/u.test(entry),
    )
  ) {
    throw new Error(`${packageDefinition.name} tarball contains test output.`);
  }
  if ([...contents].some((entry) => entry.endsWith(".tsbuildinfo"))) {
    throw new Error(
      `${packageDefinition.name} tarball contains TypeScript build state.`,
    );
  }
  if (
    [...contents].some(
      (entry) => entry.endsWith(".js.map") || entry.endsWith(".d.ts.map"),
    )
  ) {
    throw new Error(
      `${packageDefinition.name} tarball contains maps for excluded source files.`,
    );
  }
  if (packageDefinition.name === "@sefaria/web-components") {
    const customElements = JSON.parse(
      capture("tar", ["-xOf", tarball, "package/custom-elements.json"]),
    );
    for (const modulePath of collectModulePaths(customElements)) {
      if (!contents.has(`package/${modulePath.replace(/^\.\//u, "")}`)) {
        throw new Error(
          `Custom-elements metadata references missing ${modulePath}.`,
        );
      }
    }
  }
  const exports =
    typeof manifest.exports === "string"
      ? { ".": { import: manifest.exports, types: manifest.exports } }
      : manifest.exports;
  for (const target of Object.values(exports)) {
    for (const filename of [target.import, target.types]) {
      const archivePath = `package/${filename.replace(/^\.\//u, "")}`;
      if (!contents.has(archivePath)) {
        throw new Error(
          `${packageDefinition.name} tarball is missing ${archivePath}.`,
        );
      }
    }
  }
}

async function stageConsumer() {
  await mkdir(path.join(consumer, "src"), { recursive: true });
  for (const filename of ["index.html", "tsconfig.json"]) {
    await cp(
      path.join(repository, "examples", "vanilla-vite", filename),
      path.join(consumer, filename),
    );
  }
  await cp(
    path.join(repository, "examples", "vanilla-vite", "src"),
    path.join(consumer, "src"),
    { recursive: true },
  );
  const fileDependency = (filename) => `file:../tarballs/${filename}`;
  const packageJson = {
    name: "sefaria-toolkit-tarball-consumer",
    version: "0.0.0",
    private: true,
    type: "module",
    scripts: {
      build: "tsc -p tsconfig.json && vite build",
      preview: "vite preview",
    },
    dependencies: Object.fromEntries(
      packageDefinitions.map((entry) => [
        entry.name,
        fileDependency(entry.filename),
      ]),
    ),
    devDependencies: {
      typescript: "7.0.2",
      vite: "^8.2.1",
    },
  };
  await writeFile(
    path.join(consumer, "package.json"),
    `${JSON.stringify(packageJson, null, 2)}\n`,
  );
  const overrides = Object.fromEntries(
    packageDefinitions.map((entry) => [
      entry.name,
      fileDependency(entry.filename),
    ]),
  );
  await writeFile(
    path.join(consumer, "pnpm-workspace.yaml"),
    YAML.stringify({
      overrides,
      allowBuilds: { esbuild: true },
    }),
  );
}

async function inspectConsumerResolution() {
  const lockfilePath = path.join(consumer, "pnpm-lock.yaml");
  const lockfile = await readFile(lockfilePath, "utf8");
  if (/\b(?:link|workspace):/u.test(lockfile)) {
    throw new Error("Consumer lockfile resolved toolkit workspace source.");
  }
  for (const packageDefinition of packageDefinitions) {
    if (!lockfile.includes(`file:../tarballs/${packageDefinition.filename}`)) {
      throw new Error(
        `Consumer lockfile does not resolve ${packageDefinition.name} from its tarball.`,
      );
    }
  }
  if (/https?:[^\n]*@sefaria/u.test(lockfile)) {
    throw new Error(
      "Consumer lockfile resolved a toolkit package from a registry.",
    );
  }

  for (const packageDefinition of packageDefinitions) {
    const resolved = capture(
      "node",
      [
        "--input-type=module",
        "-e",
        `console.log(import.meta.resolve(${JSON.stringify(packageDefinition.name)}))`,
      ],
      consumer,
    ).trim();
    const installedPath = await realpath(fileURLToPath(resolved));
    if (
      !installedPath.startsWith(path.join(consumer, "node_modules")) ||
      installedPath.startsWith(path.join(repository, "packages"))
    ) {
      throw new Error(
        `${packageDefinition.name} resolves outside the isolated consumer.`,
      );
    }
  }

  capture(
    "node",
    [
      "--input-type=module",
      "-e",
      [
        "await Promise.all([",
        "import('@sefaria/client'),",
        "import('@sefaria/text-transform'),",
        "import('@sefaria/web-components/source-card'),",
        "import('@sefaria/web-components/reader'),",
        "import('@sefaria/web-components/reader-controller'),",
        "import('@sefaria/web-components/reader-session')",
        "]);",
        "if ('customElements' in globalThis) throw new Error('DOM registration leaked into Node-safe imports');",
      ].join(""),
    ],
    consumer,
  );
}

async function smokeChromium() {
  const port = 4178;
  const server = await preview({
    root: consumer,
    preview: {
      host: "127.0.0.1",
      port,
      strictPort: true,
    },
  });
  try {
    await waitForServer(`http://127.0.0.1:${port}/`);
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.goto(`http://127.0.0.1:${port}/`);
      await page.locator("#status[data-request-count='1']").waitFor();
      const result = await page.evaluate(() => {
        const card = globalThis.document.querySelector("sefaria-source-card");
        return {
          registered:
            globalThis.customElements.get("sefaria-source-card") !== undefined,
          state: card?.viewModel?.state,
          text: card?.shadowRoot?.textContent,
        };
      });
      if (
        !result.registered ||
        result.state !== "data" ||
        !result.text?.includes("Micah 6:8")
      ) {
        throw new Error(
          `Unexpected Chromium result: ${JSON.stringify(result)}`,
        );
      }
    } finally {
      await browser.close();
    }
  } finally {
    await server.close();
  }
}

async function waitForServer(url) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await globalThis.fetch(url);
      if (response.ok) return;
    } catch {
      // The bounded preview startup window is still open.
    }
    await delay(200);
  }
  throw new Error(`Timed out waiting for ${url}.`);
}

function run(command, args, cwd = repository) {
  const spec = commandSpec(command, args);
  const result = spawnSync(spec.executable, spec.args, {
    cwd,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} exited with ${result.status}.`,
    );
  }
}

function capture(command, args, cwd = repository) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} exited with ${result.status}: ${result.stderr}`,
    );
  }
  return result.stdout;
}

function commandSpec(command, args) {
  if (process.platform !== "win32" || command !== "pnpm") {
    return { executable: command, args };
  }
  return {
    executable: process.env.ComSpec ?? "cmd.exe",
    args: ["/d", "/s", "/c", `pnpm ${args.join(" ")}`],
  };
}

function collectModulePaths(value, paths = new Set()) {
  if (Array.isArray(value)) {
    for (const entry of value) collectModulePaths(entry, paths);
    return paths;
  }
  if (!value || typeof value !== "object") return paths;
  for (const [key, entry] of Object.entries(value)) {
    if ((key === "path" || key === "module") && typeof entry === "string") {
      paths.add(entry);
    } else {
      collectModulePaths(entry, paths);
    }
  }
  return paths;
}
