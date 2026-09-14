import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import {
  readJsonFiles,
  validateActivePaths,
  validateDocumentationClaims,
  validateLockfilePolicy,
  validateManifestPolicy,
  validateWorkflowPolicy,
} from "./integration-policy.mjs";
import { validateMarkdownLinks } from "./markdown-links.mjs";

const root = path.resolve(import.meta.dirname, "..");
const tracked = await listFiles(root);
const manifestFiles = tracked.filter(
  (filename) =>
    filename === "package.json" ||
    /^(?:packages|examples|tests)\/[^/]+\/package\.json$/u.test(filename),
);
const workflowFiles = tracked.filter((filename) =>
  filename.startsWith(".github/workflows/"),
);
const documentationFiles = tracked.filter(
  (filename) =>
    filename === "README.md" ||
    /^(?:packages|examples)\/[^/]+\/README\.md$/u.test(filename) ||
    /^docs\/(?:README|development)\.md$/u.test(filename) ||
    filename.startsWith("docs/learn/"),
);
const journeyFiles = [
  "README.md",
  "docs/README.md",
  "docs/learn/01-web-components.md",
  "docs/learn/02-supplied-data.md",
  "docs/learn/03-live-data.md",
  "docs/learn/react.md",
  "docs/learn/04-reader.md",
  "docs/learn/05-customization.md",
  "docs/learn/06-host-integration.md",
  "examples/README.md",
  "examples/react-vite/README.md",
];

const issues = [
  ...validateActivePaths(tracked),
  ...validateManifestPolicy(await readJsonFiles(root, manifestFiles)),
  ...validateWorkflowPolicy(
    Object.fromEntries(
      await Promise.all(
        workflowFiles.map(async (filename) => [
          filename,
          await readFile(path.join(root, filename), "utf8"),
        ]),
      ),
    ),
  ),
  ...validateLockfilePolicy(
    await readFile(path.join(root, "pnpm-lock.yaml"), "utf8"),
  ),
  ...validateDocumentationClaims(
    Object.fromEntries(
      await Promise.all(
        documentationFiles.map(async (filename) => [
          filename,
          await readFile(path.join(root, filename), "utf8"),
        ]),
      ),
    ),
  ),
  ...(await validateMarkdownLinks(root, journeyFiles)),
];

if (issues.length > 0) {
  throw new Error(`Integration policy violations:\n- ${issues.join("\n- ")}`);
}

process.stdout.write(
  `Integration policy: ${tracked.length} active paths, ${manifestFiles.length} private manifests, ${workflowFiles.length} workflows, and ${documentationFiles.length} maintained documents passed.\n`,
);

async function listFiles(directory, prefix = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (
      entry.name === ".git" ||
      entry.name === "node_modules" ||
      entry.name === "dist"
    ) {
      continue;
    }
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(
        ...(await listFiles(path.join(directory, entry.name), relativePath)),
      );
    } else {
      files.push(relativePath);
    }
  }
  return files;
}
