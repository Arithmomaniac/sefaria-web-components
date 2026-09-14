import { spawnSync } from "node:child_process";
import {
  access,
  cp,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";
import { preview } from "vite";
import YAML from "yaml";

import {
  isPathWithin,
  resolveModuleFromParent,
  validateConsumerLockfile,
  validateInstalledPath,
  validatePackedPackage,
} from "./tarball-consumer-validation.mjs";

const repository = path.resolve(import.meta.dirname, "..");
const root = await mkdtemp(
  path.join(tmpdir(), "sefaria-toolkit-tarball-consumer-"),
);
const tarballs = path.join(root, "tarballs");
const consumer = path.join(root, "consumer");
const packageDefinitions = [
  {
    name: "@sefaria/client",
    directory: "client",
    filename: "sefaria-client-0.0.0.tgz",
    subpaths: [
      ".",
      "./client",
      "./contracts",
      "./errors",
      "./schemas",
      "./validation",
      "./validators",
    ],
  },
  {
    name: "@sefaria/text-transform",
    directory: "text-transform",
    filename: "sefaria-text-transform-0.0.0.tgz",
    subpaths: ["."],
  },
  {
    name: "@sefaria/web-components",
    directory: "web-components",
    filename: "sefaria-web-components-0.0.0.tgz",
    subpaths: [
      ".",
      "./bilingual-segment",
      "./connections-panel",
      "./popup",
      "./reader",
      "./reader-controller",
      "./reader-session",
      "./ref-label",
      "./source-card",
      "./text-segment",
    ],
  },
];

if (isPathWithin(repository, root) || root === repository) {
  throw new Error(
    "Tarball consumer must be staged outside the producer repository.",
  );
}

try {
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
    "Tarball consumer: manifests, contents, resolution, all exports, build, Node paths, and Chromium smoke passed.\n",
  );
} finally {
  await rm(root, { force: true, recursive: true });
}

async function inspectTarball(packageDefinition) {
  const tarball = path.join(tarballs, packageDefinition.filename);
  await access(tarball);
  const manifest = JSON.parse(
    capture("tar", ["-xOf", tarball, "package/package.json"]),
  );
  const contents = new Set(
    capture("tar", ["-tf", tarball]).split(/\r?\n/u).filter(Boolean),
  );
  const customElements =
    packageDefinition.name === "@sefaria/web-components"
      ? JSON.parse(
          capture("tar", ["-xOf", tarball, "package/custom-elements.json"]),
        )
      : undefined;
  validatePackedPackage({
    definition: packageDefinition,
    manifest,
    contents,
    customElements,
  });
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
  validateConsumerLockfile(lockfile, packageDefinitions);

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
    validateInstalledPath({
      packageName: packageDefinition.name,
      installedPath,
      consumer,
      repository,
    });
  }

  const allNodeSafeImports = [
    "@sefaria/client",
    "@sefaria/client/client",
    "@sefaria/client/contracts",
    "@sefaria/client/errors",
    "@sefaria/client/schemas",
    "@sefaria/client/validation",
    "@sefaria/client/validators",
    "@sefaria/text-transform",
    "@sefaria/web-components/bilingual-segment",
    "@sefaria/web-components/connections-panel",
    "@sefaria/web-components/popup",
    "@sefaria/web-components/reader",
    "@sefaria/web-components/reader-controller",
    "@sefaria/web-components/reader-session",
    "@sefaria/web-components/ref-label",
    "@sefaria/web-components/source-card",
    "@sefaria/web-components/text-segment",
  ];
  capture(
    "node",
    [
      "--input-type=module",
      "-e",
      [
        `await Promise.all(${JSON.stringify(allNodeSafeImports)}.map((specifier) => import(specifier)));`,
        "if ('customElements' in globalThis) throw new Error('DOM registration leaked into Node-safe imports');",
      ].join(""),
    ],
    consumer,
  );

  const uiSourceCard = capture(
    "node",
    [
      "--input-type=module",
      "-e",
      "console.log(import.meta.resolve('@sefaria/web-components/source-card'))",
    ],
    consumer,
  ).trim();
  const transitiveClient = resolveModuleFromParent({
    specifier: "@sefaria/client",
    parentUrl: uiSourceCard,
    cwd: consumer,
  });
  validateInstalledPath({
    packageName: "@sefaria/web-components transitive @sefaria/client",
    installedPath: await realpath(fileURLToPath(transitiveClient)),
    consumer,
    repository,
  });
}

async function smokeChromium() {
  const server = await preview({
    root: consumer,
    preview: {
      host: "127.0.0.1",
      port: 0,
    },
  });
  try {
    const address = server.httpServer.address();
    if (!address || typeof address === "string") {
      throw new Error("Vite preview did not expose its assigned address.");
    }
    const url = `http://127.0.0.1:${address.port}/`;
    await waitForServer(url);
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.goto(url);
      await page.locator("#status[data-request-count='1']").waitFor();
      const result = await page.evaluate(() => {
        const card = globalThis.document.querySelector("sefaria-source-card");
        return {
          registered:
            globalThis.customElements.get("sefaria-source-card") !== undefined,
          registeredTags: [
            "sefaria-bilingual-segment",
            "sefaria-connections-panel",
            "sefaria-popup",
            "sefaria-reader",
            "sefaria-ref-label",
            "sefaria-source-card",
            "sefaria-text-segment",
          ].filter(
            (tagName) => globalThis.customElements.get(tagName) !== undefined,
          ),
          state: card?.viewModel?.state,
          text: card?.shadowRoot?.textContent,
        };
      });
      if (
        !result.registered ||
        result.registeredTags.length !== 7 ||
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
