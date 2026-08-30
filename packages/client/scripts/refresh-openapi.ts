import {
  access,
  mkdir,
  mkdtemp,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  generateArtifacts,
  loadOverlayInputs,
  sha256,
  writeArtifacts,
  type JsonValue,
  type OpenApiSource,
} from "./generate-openapi.js";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const refreshTargets = [
  "openapi/corrected-core.json",
  "openapi/response-schemas.json",
  "src/generated",
  "openapi/upstream.json",
  "openapi/source.json",
] as const;

type RenamePath = (oldPath: string, newPath: string) => Promise<void>;

export interface RefreshPublishOptions {
  readonly renamePath?: RenamePath;
}

interface PublicationState {
  readonly target: string;
  readonly backup: string;
  originalMoved: boolean;
  replacementMoved: boolean;
}

function isMissingPathError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { readonly code?: unknown }).code === "ENOENT"
  );
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch (error) {
    if (isMissingPathError(error)) {
      return false;
    }
    throw error;
  }
}

export async function publishStagedRefresh(
  stagedRoot: string,
  root: string,
  options: RefreshPublishOptions = {},
): Promise<void> {
  const renamePath = options.renamePath ?? rename;
  const backupRoot = await mkdtemp(
    resolve(dirname(root), ".sefaria-client-refresh-backup-"),
  );
  const states: PublicationState[] = [];

  try {
    for (const relativePath of refreshTargets) {
      const staged = resolve(stagedRoot, relativePath);
      const target = resolve(root, relativePath);
      const backup = resolve(backupRoot, relativePath);
      if (!(await pathExists(staged))) {
        throw new Error(`Staged refresh output is missing: ${relativePath}.`);
      }

      await Promise.all([
        mkdir(dirname(target), { recursive: true }),
        mkdir(dirname(backup), { recursive: true }),
      ]);
      const state: PublicationState = {
        target,
        backup,
        originalMoved: false,
        replacementMoved: false,
      };
      states.push(state);

      if (await pathExists(target)) {
        await renamePath(target, backup);
        state.originalMoved = true;
      }
      await renamePath(staged, target);
      state.replacementMoved = true;
    }
  } catch (publicationError) {
    const rollbackErrors: unknown[] = [];
    for (const state of states.reverse()) {
      try {
        if (state.replacementMoved && (await pathExists(state.target))) {
          await rm(state.target, { recursive: true, force: true });
        }
        if (state.originalMoved && (await pathExists(state.backup))) {
          await rename(state.backup, state.target);
        }
      } catch (rollbackError) {
        rollbackErrors.push(rollbackError);
      }
    }
    if (rollbackErrors.length > 0) {
      throw new AggregateError(
        [publicationError, ...rollbackErrors],
        "OpenAPI refresh publication and rollback both failed.",
        { cause: publicationError },
      );
    }
    throw publicationError;
  } finally {
    await rm(backupRoot, { recursive: true, force: true });
  }
}

export function parseCommit(args: readonly string[]): string {
  const commitFlag = args.findIndex((argument) => argument === "--commit");
  const commit = commitFlag >= 0 ? args[commitFlag + 1] : undefined;
  if (!commit || !/^[0-9a-f]{40}$/i.test(commit)) {
    throw new Error(
      "openapi:refresh requires --commit followed by a complete 40-character SHA.",
    );
  }
  return commit.toLowerCase();
}

export function pinnedOpenApiUrl(commit: string): string {
  return `https://raw.githubusercontent.com/Sefaria/Sefaria-Project/${commit}/docs/openAPI.json`;
}

export async function refreshOpenApi(
  commit: string,
  fetchImpl: typeof fetch = fetch,
  root = packageRoot,
  publishOptions: RefreshPublishOptions = {},
): Promise<void> {
  const path = "docs/openAPI.json" as const;
  const url = pinnedOpenApiUrl(commit);
  const response = await fetchImpl(url);
  if (!response.ok) {
    throw new Error(
      `Failed to download pinned OpenAPI document (${response.status} ${response.statusText}).`,
    );
  }

  const upstreamBytes = new Uint8Array(await response.arrayBuffer());
  JSON.parse(new TextDecoder().decode(upstreamBytes)) as JsonValue;
  const source: OpenApiSource = {
    repository: "Sefaria/Sefaria-Project",
    commit,
    path,
    url,
    sha256: sha256(upstreamBytes),
  };
  const { overlay, findings } = await loadOverlayInputs(root);
  const artifacts = await generateArtifacts(
    source,
    upstreamBytes,
    overlay,
    findings,
  );

  const stagedRoot = await mkdtemp(
    resolve(dirname(root), ".sefaria-client-refresh-stage-"),
  );
  try {
    const stagedSource = resolve(stagedRoot, "openapi/source.json");
    const stagedUpstream = resolve(stagedRoot, "openapi/upstream.json");
    await mkdir(dirname(stagedSource), { recursive: true });
    await Promise.all([
      writeFile(stagedSource, `${JSON.stringify(source, null, 2)}\n`, "utf8"),
      writeFile(stagedUpstream, upstreamBytes),
      writeArtifacts(artifacts, stagedRoot),
    ]);
    await publishStagedRefresh(stagedRoot, root, publishOptions);
  } finally {
    await rm(stagedRoot, { recursive: true, force: true });
  }
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : undefined;
if (invokedPath === fileURLToPath(import.meta.url)) {
  await refreshOpenApi(parseCommit(process.argv.slice(2)));
}
