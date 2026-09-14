import path from "node:path";

const maintainedCaptureSuffixes = {
  "reader-initial": "",
  "reader-hierarchy": "reader-hierarchy",
  "chat-export": "chat-export",
} as const;
const obsoleteCaptureSuffixes = [
  "connections",
  "category",
  "page-2",
  "connected-source",
  "breadcrumb-middle",
  "breadcrumb-root",
] as const;

export type MaintainedCaptureStage = keyof typeof maintainedCaptureSuffixes;

export function maintainedCapturePath(
  stage: string,
  initialPath: string,
): string | undefined {
  if (!(stage in maintainedCaptureSuffixes)) return undefined;
  const suffix = maintainedCaptureSuffixes[stage as MaintainedCaptureStage];
  if (suffix === "") return initialPath;

  const extension = path.extname(initialPath);
  const base =
    extension === "" ? initialPath : initialPath.slice(0, -extension.length);
  return `${base}-${suffix}${extension}`;
}

export function obsoleteCapturePaths(initialPath: string): string[] {
  const extension = path.extname(initialPath);
  const base =
    extension === "" ? initialPath : initialPath.slice(0, -extension.length);
  return obsoleteCaptureSuffixes.map(
    (suffix) => `${base}-${suffix}${extension}`,
  );
}
