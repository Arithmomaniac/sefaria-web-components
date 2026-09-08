import { access, cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { URL } from "node:url";

import {
  createBuildCommands,
  LEGACY_DEMO_REDIRECTS,
  PAGE_DEMOS,
} from "./build-pages-plan.mjs";

const root = path.resolve(import.meta.dirname, "..", "..", "..");
const pages = path.resolve(root, "dist", "pages");
const skipTypecheck = process.argv.includes("--skip-typecheck");
const repository = process.env.GITHUB_REPOSITORY?.split("/")[1];
const owner = process.env.GITHUB_REPOSITORY?.split("/")[0];
const publicBase =
  process.env.SEFARIA_PAGES_URL ??
  (owner && repository
    ? `https://${owner.toLowerCase()}.github.io/${repository}/`
    : undefined);
const linkerUrl =
  publicBase === undefined
    ? "http://localhost:4173/sefaria-linker.js"
    : new URL("demos/linker/sefaria-linker.js", publicBase).href;

function run(command, args, environment = {}) {
  const windows = process.platform === "win32";
  const executable = windows ? process.env.ComSpec : command;
  const executableArgs = windows
    ? ["/d", "/s", "/c", [command, ...args].join(" ")]
    : args;
  const result = spawnSync(executable, executableArgs, {
    cwd: root,
    env: { ...process.env, ...environment },
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed${result.error === undefined ? "." : `: ${result.error.message}`}`,
    );
  }
}

await rm(pages, { recursive: true, force: true });
await mkdir(path.join(pages, "demos"), { recursive: true });

const buildCommands = createBuildCommands({ linkerUrl, skipTypecheck });
for (const buildCommand of buildCommands) {
  run("pnpm", buildCommand.args, buildCommand.environment);
}

for (const [route, packageName] of PAGE_DEMOS) {
  await cp(
    path.resolve(root, "demos", packageDirectory(packageName), "dist"),
    path.join(pages, "demos", route),
    { recursive: true },
  );
}

for (const [route, explorerPage] of LEGACY_DEMO_REDIRECTS) {
  const destination = path.join(pages, "demos", route);
  await mkdir(destination, { recursive: true });
  await writeFile(
    path.join(destination, "index.html"),
    legacyRedirectHtml(explorerPage),
  );
}

await cp(path.resolve(root, "demos", "showcase", "dist"), pages, {
  recursive: true,
});
await cp(
  path.resolve(root, "demos", "linker", "dist"),
  path.join(pages, "demos", "linker"),
  { recursive: true },
);

for (const required of [
  "index.html",
  "loop.html",
  "preview.html",
  "workspace-preview.html",
  "linker-preview.html",
  "media/sefaria-reader-commentary.png",
  "media/talmud-page.png",
  "media/tikkun.png",
  "media/mcp-reader.png",
  "media/mcp-reader-hierarchy.png",
  "media/mcp-reader-chat-export.png",
  "media/mcp-reader-demo.mp4",
  "media/showcase-qr.svg",
  "media/showcase-qr.png",
  "media/loop-reader.png",
  "media/loop-linker.png",
  "media/loop-mcp.png",
  "demos/linker/sefaria-linker.js",
  "demos/explorer/index.html",
  "demos/explorer/authored.html",
  "demos/reader-workspace/index.html",
  "demos/reader-workspace/controlled.html",
  "demos/connections/index.html",
]) {
  await access(path.join(pages, required));
}

for (const relativePath of [
  ...PAGE_DEMOS.map(([route]) => `demos/${route}/index.html`),
  ...LEGACY_DEMO_REDIRECTS.map(
    ([legacyRoute]) => `demos/${legacyRoute}/index.html`,
  ),
  "demos/explorer/authored.html",
  "demos/explorer/ref-label.html",
  "demos/explorer/text-segment.html",
  "demos/explorer/bilingual-segment.html",
  "demos/explorer/source-card.html",
  "demos/explorer/connections.html",
  "demos/reader-workspace/controlled.html",
]) {
  const html = await readFile(path.join(pages, relativePath), "utf8");
  if (/(?:src|href)="\/(?!\/)/.test(html)) {
    throw new Error(`${relativePath} still contains an origin-root URL.`);
  }
}

const showcaseHtml = await readFile(path.join(pages, "index.html"), "utf8");
if (/publication\s+approval\s+pending/i.test(showcaseHtml)) {
  throw new Error("The closing quotation still requires publication approval.");
}

const bookmarklet = await readFile(
  path.join(pages, "demos", "linker", "bookmarklet.txt"),
  "utf8",
);
if (publicBase !== undefined && bookmarklet.includes("localhost")) {
  throw new Error("The public Linker bookmarklet still points to localhost.");
}

function packageDirectory(packageName) {
  return (
    {
      "@sefaria-demo/explorer": "explorer",
      "@sefaria-demo/reader-workspace": "reader-workspace",
    }[packageName] ?? packageName
  );
}

function legacyRedirectHtml(explorerPage) {
  const target = JSON.stringify(`../explorer/${explorerPage}`);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Opening the Sefaria component explorer</title>
    <script>
      const target = new URL(${target}, window.location.href);
      target.search = window.location.search;
      target.hash = window.location.hash;
      window.location.replace(target);
    </script>
  </head>
  <body>
    <p>This demo moved to the <a href="${`../explorer/${explorerPage}`}">Sefaria component explorer</a>.</p>
  </body>
</html>
`;
}
