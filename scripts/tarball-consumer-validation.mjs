import path from "node:path";

export function validatePackedPackage({
  definition,
  manifest,
  contents,
  customElements,
}) {
  if (manifest.name !== definition.name || manifest.private !== true) {
    throw new Error(`${definition.name} packed manifest is incorrect.`);
  }
  if (
    definition.name === "@sefaria/web-components" &&
    (manifest.dependencies?.["@sefaria/client"] !== "0.0.0" ||
      manifest.dependencies?.["@sefaria/text-transform"] !== "0.0.0")
  ) {
    throw new Error(
      "@sefaria/web-components internal dependency versions were not packed exactly.",
    );
  }
  if ([...contents].some((entry) => entry.startsWith("package/src/"))) {
    throw new Error(`${definition.name} tarball contains producer source.`);
  }
  if (
    [...contents].some((entry) =>
      /\.test\.(?:js|d\.ts)(?:\.map)?$/u.test(entry),
    )
  ) {
    throw new Error(`${definition.name} tarball contains test output.`);
  }
  if ([...contents].some((entry) => entry.endsWith(".tsbuildinfo"))) {
    throw new Error(
      `${definition.name} tarball contains TypeScript build state.`,
    );
  }
  if (
    [...contents].some(
      (entry) => entry.endsWith(".js.map") || entry.endsWith(".d.ts.map"),
    )
  ) {
    throw new Error(
      `${definition.name} tarball contains maps for excluded source files.`,
    );
  }

  const exports =
    typeof manifest.exports === "string"
      ? { ".": { import: manifest.exports, types: manifest.exports } }
      : manifest.exports;
  const actualSubpaths = Object.keys(exports).sort();
  const expectedSubpaths = [...definition.subpaths].sort();
  if (JSON.stringify(actualSubpaths) !== JSON.stringify(expectedSubpaths)) {
    throw new Error(
      `${definition.name} packed exports do not match its contract.`,
    );
  }
  for (const target of Object.values(exports)) {
    for (const filename of [target.import, target.types]) {
      const archivePath = `package/${filename.replace(/^\.\//u, "")}`;
      if (!contents.has(archivePath)) {
        throw new Error(
          `${definition.name} tarball is missing ${archivePath}.`,
        );
      }
    }
  }

  if (customElements !== undefined) {
    for (const modulePath of collectModulePaths(customElements)) {
      if (!contents.has(`package/${modulePath.replace(/^\.\//u, "")}`)) {
        throw new Error(
          `Custom-elements metadata references missing ${modulePath}.`,
        );
      }
    }
  }
}

export function validateConsumerLockfile(lockfile, definitions) {
  if (/\b(?:link|workspace):/u.test(lockfile)) {
    throw new Error("Consumer lockfile resolved toolkit workspace source.");
  }
  for (const definition of definitions) {
    if (!lockfile.includes(`file:../tarballs/${definition.filename}`)) {
      throw new Error(
        `Consumer lockfile does not resolve ${definition.name} from its tarball.`,
      );
    }
  }
  if (/https?:[^\n]*@sefaria/u.test(lockfile)) {
    throw new Error(
      "Consumer lockfile resolved a toolkit package from a registry.",
    );
  }
}

export function validateInstalledPath({
  packageName,
  installedPath,
  consumer,
  repository,
}) {
  if (
    !isPathWithin(path.join(consumer, "node_modules"), installedPath) ||
    isPathWithin(repository, installedPath)
  ) {
    throw new Error(`${packageName} resolves outside the isolated consumer.`);
  }
}

export function isPathWithin(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return (
    relative !== "" &&
    !relative.startsWith(`..${path.sep}`) &&
    relative !== ".." &&
    !path.isAbsolute(relative)
  );
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
