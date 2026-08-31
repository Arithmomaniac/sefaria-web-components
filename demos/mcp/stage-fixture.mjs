import { access, copyFile, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const mcpRoot = path.dirname(fileURLToPath(import.meta.url));
const staticDirectory = path.join(
  mcpRoot,
  "fixture-server",
  "src",
  "sefaria_mcp_fixture",
  "static",
);

const files = [
  {
    source: path.join(mcpRoot, "app", "dist", "mcp-app.html"),
    destination: "mcp-app.html",
  },
];

await rm(staticDirectory, { recursive: true, force: true });
await mkdir(staticDirectory, { recursive: true });

for (const file of files) {
  await access(file.source);
  await copyFile(file.source, path.join(staticDirectory, file.destination));
}
