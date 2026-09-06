import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";

import { build } from "vite";

const root = resolve(import.meta.dirname);
const dist = resolve(root, "dist");
const artifactUrl =
  process.env.SEFARIA_LINKER_ARTIFACT_URL ??
  "http://localhost:4173/sefaria-linker.js";

await build({
  root,
  build: {
    emptyOutDir: true,
    lib: {
      entry: resolve(root, "src/main.ts"),
      name: "SefariaLinkerBundle",
      formats: ["iife"],
      fileName: () => "sefaria-linker.js",
    },
  },
});

await mkdir(dist, { recursive: true });
for (const file of ["index.html", "bookmarklet-demo.html", "style.css"]) {
  await writeFile(
    resolve(dist, file),
    await readFile(resolve(root, file), "utf8"),
  );
}
const loader = `(function(){var w=window,d=document,u=${JSON.stringify(artifactUrl)},f=function(e){if(e&&e.name==='AbortError')return;alert(e&&e.message?e.message:String(e))},r=function(){w.SefariaLinker.link().catch(f)};if(w.SefariaLinker){r();return}var s=d.createElement('script');s.src=u;s.onload=r;s.onerror=function(){alert('Unable to load the Sefaria Linker script.')};d.head.appendChild(s)})()`;
await writeFile(resolve(dist, "bookmarklet.txt"), `javascript:${loader}`);
