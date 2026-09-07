import { access, cp, mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { URL } from "node:url";

const root = path.resolve(import.meta.dirname, "..", "..", "..");
const pages = path.resolve(root, "dist", "pages");
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

const demos = [
  ["component-lab", "@sefaria-demo/component-lab"],
  ["ref-label", "@sefaria-demo/ref-label-live-demo"],
  ["text-segment", "@sefaria-demo/text-segment-live-demo"],
  ["bilingual-segment", "@sefaria-demo/bilingual-segment-live-demo"],
  ["source-card", "@sefaria-demo/source-card-live-demo"],
  ["connections", "@sefaria-demo/connections-panel-live-demo"],
];

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

run("pnpm", ["--filter", "@sefaria-demo/showcase", "build"]);
for (const [route, packageName] of demos) {
  run("pnpm", ["--filter", packageName, "build", "--base=./"]);
  await cp(
    path.resolve(root, "demos", packageDirectory(packageName), "dist"),
    path.join(pages, "demos", route),
    { recursive: true },
  );
}
run("pnpm", ["--filter", "@sefaria-demo/linker", "build"], {
  SEFARIA_LINKER_ARTIFACT_URL: linkerUrl,
});

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
  "preview.html",
  "linker-preview.html",
  "media/sefaria-library.png",
  "media/sefaria-reader.png",
  "media/torah-research-board.png",
  "media/lishkod.png",
  "media/mcp-source-card.png",
  "media/mcp-connections.png",
  "media/mcp-category.png",
  "demos/linker/sefaria-linker.js",
  "demos/connections/index.html",
]) {
  await access(path.join(pages, required));
}

for (const [route] of demos) {
  const html = await readFile(
    path.join(pages, "demos", route, "index.html"),
    "utf8",
  );
  if (/(?:src|href)="\/assets\//.test(html)) {
    throw new Error(`${route} still contains an origin-root asset URL.`);
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
      "@sefaria-demo/component-lab": "component-lab",
      "@sefaria-demo/ref-label-live-demo": "ref-label-live-demo",
      "@sefaria-demo/text-segment-live-demo": "text-segment-live-demo",
      "@sefaria-demo/bilingual-segment-live-demo":
        "bilingual-segment-live-demo",
      "@sefaria-demo/source-card-live-demo": "source-card-live-demo",
      "@sefaria-demo/connections-panel-live-demo":
        "connections-panel-live-demo",
    }[packageName] ?? packageName
  );
}
