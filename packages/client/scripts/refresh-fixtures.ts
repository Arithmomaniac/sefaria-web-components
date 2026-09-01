import {
  access,
  mkdtemp,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { format } from "prettier";

import { validateGetIndexV2200 } from "../src/generated/response-validators.gen.js";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixturesRelativeRoot = "test/fixtures" as const;
const declaredFixtureName = "index-genesis-2026-09-01.json" as const;
const manifestRelativePath = "test/fixtures/manifest.json" as const;

type JsonRecord = Record<string, unknown>;
type RenamePath = (oldPath: string, newPath: string) => Promise<void>;

/** Overrides the filesystem move used to publish a staged fixture. */
export interface FixturePublishOptions {
  /** Moves the staged fixture into its target path. */
  readonly renamePath?: RenamePath;
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

function requireRecord(value: unknown, path: string): JsonRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`Cannot reduce Genesis index fixture: ${path} is missing.`);
  }
  return value as JsonRecord;
}

function requireArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`Cannot reduce Genesis index fixture: ${path} is missing.`);
  }
  return value;
}

function requireString(value: unknown, path: string): string {
  if (typeof value !== "string") {
    throw new Error(`Cannot reduce Genesis index fixture: ${path} is missing.`);
  }
  return value;
}

function requireInteger(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new Error(`Cannot reduce Genesis index fixture: ${path} is missing.`);
  }
  return value;
}

function requireBoolean(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`Cannot reduce Genesis index fixture: ${path} is missing.`);
  }
  return value;
}

function requireStrings(value: unknown, path: string): string[] {
  return requireArray(value, path).map((item, index) =>
    requireString(item, `${path}[${index}]`),
  );
}

function requireIntegers(value: unknown, path: string): number[] {
  return requireArray(value, path).map((item, index) =>
    requireInteger(item, `${path}[${index}]`),
  );
}

function reduceSchemaTitle(value: unknown, path: string): JsonRecord {
  const title = requireRecord(value, path);
  return {
    text: requireString(title.text, `${path}.text`),
    lang: requireString(title.lang, `${path}.lang`),
    primary: true,
  };
}

function reduceAlternateTitle(value: unknown, path: string): JsonRecord {
  const title = requireRecord(value, path);
  const reduced: JsonRecord = {};
  if (title.primary !== undefined) {
    if (title.primary !== true) {
      throw new Error(
        `Cannot reduce Genesis index fixture: ${path}.primary must be true when present.`,
      );
    }
    reduced.primary = true;
  }
  reduced.text = requireString(title.text, `${path}.text`);
  reduced.lang = requireString(title.lang, `${path}.lang`);
  return reduced;
}

function reduceMatchTemplate(value: unknown, path: string): JsonRecord {
  const template = requireRecord(value, path);
  return {
    term_slugs: requireStrings(template.term_slugs, `${path}.term_slugs`),
    scope: requireString(template.scope, `${path}.scope`),
  };
}

function reduceFirstParashaNode(value: unknown): JsonRecord {
  const path = "response.alts.Parasha.nodes[0]";
  const node = requireRecord(value, path);
  return {
    nodeType: requireString(node.nodeType, `${path}.nodeType`),
    depth: requireInteger(node.depth, `${path}.depth`),
    wholeRef: requireString(node.wholeRef, `${path}.wholeRef`),
    addressTypes: requireStrings(node.addressTypes, `${path}.addressTypes`),
    sectionNames: requireStrings(node.sectionNames, `${path}.sectionNames`),
    refs: requireStrings(node.refs, `${path}.refs`),
    match_templates: requireArray(
      node.match_templates,
      `${path}.match_templates`,
    ).map((template, index) =>
      reduceMatchTemplate(template, `${path}.match_templates[${index}]`),
    ),
    isMapReferenceable: requireBoolean(
      node.isMapReferenceable,
      `${path}.isMapReferenceable`,
    ),
    sharedTitle: requireString(node.sharedTitle, `${path}.sharedTitle`),
    titles: requireArray(node.titles, `${path}.titles`).map((title, index) =>
      reduceAlternateTitle(title, `${path}.titles[${index}]`),
    ),
    title: requireString(node.title, `${path}.title`),
    heTitle: requireString(node.heTitle, `${path}.heTitle`),
  };
}

function isIsoCaptureDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(parsed.valueOf()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

/**
 * Requires the exact write opt-in and returns the caller-declared capture date.
 */
export function requireFixtureCandidateWrite(args: readonly string[]): string {
  const captureDate = args[2];
  if (
    args.length !== 3 ||
    args[0] !== "--write" ||
    args[1] !== "--capture-date" ||
    captureDate === undefined ||
    !isIsoCaptureDate(captureDate)
  ) {
    throw new Error(
      "fixture:capture-candidate requires exactly --write --capture-date YYYY-MM-DD.",
    );
  }
  return captureDate;
}

/** Reads the Genesis index source URL from the immutable fixture declaration. */
export function declaredGenesisIndexSource(manifest: unknown): string {
  const root = requireRecord(manifest, "manifest");
  const declaration = requireRecord(
    root[declaredFixtureName],
    `manifest.${declaredFixtureName}`,
  );
  const source = declaration.source;
  if (typeof source !== "string" || source.length === 0) {
    throw new Error(
      "Cannot capture Genesis index fixture candidate: its declared source is missing.",
    );
  }
  return source;
}

/**
 * Reduces a validated deployed Genesis index response to the committed fixture
 * shape.
 */
export function reduceGenesisIndexFixture(value: unknown): JsonRecord {
  const index = requireRecord(value, "response");
  const schema = requireRecord(index.schema, "response.schema");
  const schemaTitles = requireArray(schema.titles, "response.schema.titles");
  const primaryTitle = (language: "en" | "he"): JsonRecord => {
    const matches = schemaTitles.filter((titleValue) => {
      const title = requireRecord(titleValue, "response.schema.titles[]");
      return title.primary === true && title.lang === language;
    });
    if (matches.length !== 1) {
      throw new Error(
        `Cannot reduce Genesis index fixture: expected one primary ${language} schema title.`,
      );
    }
    return reduceSchemaTitle(
      matches[0],
      `response.schema.titles[primary:${language}]`,
    );
  };
  const primaryHebrewTitle = primaryTitle("he");
  const primaryEnglishTitle = primaryTitle("en");

  const alts = requireRecord(index.alts, "response.alts");
  const parasha = requireRecord(alts.Parasha, "response.alts.Parasha");
  const parashaNodes = requireArray(
    parasha.nodes,
    "response.alts.Parasha.nodes",
  );
  const firstParashaNode = requireRecord(
    parashaNodes[0],
    "response.alts.Parasha.nodes[0]",
  );

  return {
    title: requireString(index.title, "response.title"),
    categories: requireStrings(index.categories, "response.categories"),
    schema: {
      nodeType: requireString(schema.nodeType, "response.schema.nodeType"),
      depth: requireInteger(schema.depth, "response.schema.depth"),
      addressTypes: requireStrings(
        schema.addressTypes,
        "response.schema.addressTypes",
      ),
      sectionNames: requireStrings(
        schema.sectionNames,
        "response.schema.sectionNames",
      ),
      lengths: requireIntegers(schema.lengths, "response.schema.lengths"),
      titles: [primaryHebrewTitle, primaryEnglishTitle],
      title: requireString(schema.title, "response.schema.title"),
      heTitle: requireString(schema.heTitle, "response.schema.heTitle"),
      heSectionNames: requireStrings(
        schema.heSectionNames,
        "response.schema.heSectionNames",
      ),
      key: requireString(schema.key, "response.schema.key"),
    },
    alts: {
      Parasha: {
        nodes: [reduceFirstParashaNode(firstParashaNode)],
      },
    },
  };
}

/** Serializes a reduced fixture with stable indentation and a final newline. */
export async function serializeFixture(value: unknown): Promise<string> {
  return await format(JSON.stringify(value, null, 2), { parser: "json" });
}

/**
 * Publishes a staged fixture with one rename, leaving an existing target in
 * place until that replacement operation.
 */
export async function publishStagedFixture(
  stagedPath: string,
  targetPath: string,
  options: FixturePublishOptions = {},
): Promise<void> {
  const renamePath = options.renamePath ?? rename;
  await access(stagedPath);
  await renamePath(stagedPath, targetPath);
}

/**
 * Captures a newly dated Genesis index fixture candidate without changing
 * committed fixture references.
 */
export async function captureGenesisIndexFixtureCandidate(
  args: readonly string[],
  fetchImpl: typeof fetch = fetch,
  root = packageRoot,
  publishOptions: FixturePublishOptions = {},
): Promise<void> {
  const captureDate = requireFixtureCandidateWrite(args);
  const candidateName = `index-genesis-${captureDate}.json`;
  const targetPath = resolve(root, fixturesRelativeRoot, candidateName);
  if (await pathExists(targetPath)) {
    throw new Error(
      `Genesis index fixture candidate already exists: ${candidateName}.`,
    );
  }

  const manifest = JSON.parse(
    await readFile(resolve(root, manifestRelativePath), "utf8"),
  ) as unknown;
  const source = declaredGenesisIndexSource(manifest);
  const response = await fetchImpl(source);
  if (!response.ok) {
    throw new Error(
      `Failed to download Genesis index fixture (${response.status} ${response.statusText}).`,
    );
  }

  const value = (await response.json()) as unknown;
  if (!validateGetIndexV2200(value)) {
    throw new Error(
      "Downloaded Genesis index response failed the public generated index validator.",
    );
  }
  const fixture = reduceGenesisIndexFixture(value);
  const stagedRoot = await mkdtemp(
    resolve(dirname(dirname(targetPath)), ".fixture-candidate-stage-"),
  );
  try {
    const stagedPath = resolve(stagedRoot, candidateName);
    await writeFile(stagedPath, await serializeFixture(fixture), "utf8");
    if (await pathExists(targetPath)) {
      throw new Error(
        `Genesis index fixture candidate already exists: ${candidateName}.`,
      );
    }
    await publishStagedFixture(stagedPath, targetPath, publishOptions);
  } finally {
    await rm(stagedRoot, { recursive: true, force: true }).catch(
      () => undefined,
    );
  }
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : undefined;
if (invokedPath === fileURLToPath(import.meta.url)) {
  await captureGenesisIndexFixtureCandidate(process.argv.slice(2));
}
