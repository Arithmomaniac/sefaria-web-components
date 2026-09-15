import { access, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

export function classifyToolkitManifest(manifest) {
  if (!Object.prototype.hasOwnProperty.call(manifest, "name")) {
    throw new Error(
      "packages/web-components/package.json exists but has no package name.",
    );
  }
  return manifest.name === "@sefaria/web-components" ? "toolkit" : "unrelated";
}

export async function detectToolkitCheckout(
  root = process.cwd(),
  { read = readFile, requireSetup = (filename) => access(filename) } = {},
) {
  const manifestPath = path.join(
    root,
    "packages",
    "web-components",
    "package.json",
  );
  let manifest;
  try {
    manifest = JSON.parse(await read(manifestPath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return "unrelated";
    throw error;
  }
  const classification = classifyToolkitManifest(manifest);
  if (classification === "toolkit") {
    await requireSetup(path.join(root, "scripts", "setup-agent.mjs"));
  }
  return classification;
}

function isMainModule(moduleUrl, entryPath) {
  return (
    entryPath !== undefined &&
    moduleUrl === pathToFileURL(path.resolve(entryPath)).href
  );
}

if (isMainModule(import.meta.url, process.argv[1])) {
  const classification = await detectToolkitCheckout();
  const applicable = classification === "toolkit";
  process.stdout.write(`applicable=${applicable}\n`);
  process.stderr.write(
    applicable
      ? "Detected unpublished toolkit checkout.\n"
      : "This checkout does not contain the unpublished toolkit; skipping toolkit setup.\n",
  );
}
