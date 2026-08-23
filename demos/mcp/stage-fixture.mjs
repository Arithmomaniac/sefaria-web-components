import { access, copyFile, mkdir } from "node:fs/promises";
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
  {
    source: path.resolve(
      mcpRoot,
      "..",
      "..",
      "packages",
      "model",
      "contracts",
      "source-card.schema.json",
    ),
    destination: "source-card.schema.json",
  },
  {
    source: path.join(mcpRoot, "contract", "source-card.example.json"),
    destination: "source-card.example.json",
  },
];

await mkdir(staticDirectory, { recursive: true });

for (const file of files) {
  await access(file.source);
  await copyFile(file.source, path.join(staticDirectory, file.destination));
}
