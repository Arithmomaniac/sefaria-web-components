import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createClient as generateHeyApiClient } from "@hey-api/openapi-ts";
import {
  format as formatWithPrettier,
  resolveConfig as resolvePrettierConfig,
} from "prettier";

export type JsonPrimitive = boolean | null | number | string;
export type JsonValue =
  JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

export interface OpenApiSource {
  readonly repository: "Sefaria/Sefaria-Project";
  readonly commit: string;
  readonly path: "docs/openAPI.json";
  readonly url: string;
  readonly sha256: string;
}

export interface OverlayAction {
  readonly target: string;
  readonly update?: JsonValue;
  readonly remove?: true;
  readonly copy?: string;
  readonly description?: string;
  readonly "x-action-id": string;
  readonly "x-finding-id": string;
}

export interface OverlayDocument {
  readonly overlay: "1.1.0";
  readonly info: {
    readonly title: string;
    readonly version: string;
    readonly description?: string;
  };
  readonly extends: "./upstream.json";
  readonly actions: readonly OverlayAction[];
}

export type ExpectedState =
  | { readonly absent: true }
  | { readonly value: JsonValue }
  | { readonly sha256: string };

export interface FindingPrecondition {
  readonly target: string;
  readonly expected: ExpectedState;
}

export interface Finding {
  readonly id: string;
  readonly summary: string;
  readonly actions: readonly string[];
  readonly evidence: {
    readonly route: string;
    readonly handler: string;
    readonly responseBuilder: string;
    readonly tests: string;
  };
  readonly audit?: {
    readonly findingId: string;
    readonly artifacts: readonly string[];
  };
  readonly fixture?: {
    readonly path?: string;
    readonly capturedAt: string;
    readonly source: string | readonly string[];
  };
  readonly preconditions: readonly FindingPrecondition[];
}

export interface FindingsDocument {
  readonly version: 1;
  readonly findings: readonly Finding[];
}

export interface ResponseContractMetadata {
  readonly operationId: string;
  readonly functionName: string;
  readonly method: "GET";
  readonly path: string;
  readonly status: number;
  readonly contentTypes: readonly string[];
  readonly schemaPath: string;
  readonly validatorExport: string;
  readonly validatorName: string;
}

interface OpenApiFormatResult {
  readonly data: unknown;
  readonly resultData: {
    readonly unusedActions?: readonly unknown[];
    readonly totalUsedActions?: number;
    readonly totalActions?: number;
  };
}

interface OpenApiFormatModule {
  readonly openapiOverlay: (
    document: JsonObject,
    options: { readonly overlaySet: OverlayDocument },
  ) => Promise<OpenApiFormatResult>;
  readonly parseFile: (path: string) => Promise<unknown>;
  readonly resolveJsonPathValue: (
    document: JsonObject | JsonValue[],
    path: string,
  ) => unknown[];
}

export const CORE_OPERATIONS = [
  {
    path: "/api/v3/texts/{tref}",
    operationId: "get-v3-texts",
    functionName: "getV3Texts",
  },
  {
    path: "/api/texts/versions/{tref}",
    operationId: "get-versions",
    functionName: "getTextVersions",
  },
  {
    path: "/api/ref/{tref}",
    operationId: "get-ref",
    functionName: "getRef",
  },
  {
    path: "/api/v2/index/{title}",
    operationId: "get-index-v2",
    functionName: "getIndexV2",
  },
  {
    path: "/api/shape/{title}",
    operationId: "get-shape",
    functionName: "getShape",
  },
  {
    path: "/api/links/{tref}",
    operationId: "get-links",
    functionName: "getLinks",
  },
] as const;

export const CORE_PATHS = CORE_OPERATIONS.map(({ path }) => path);

const require = createRequire(import.meta.url);
const openapiFormat = require("openapi-format") as OpenApiFormatModule;
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const generatedDirectory = "src/generated";
const heyApiCommittedFiles = new Set([
  "sdk.gen.ts",
  "types.gen.ts",
  "zod.gen.ts",
]);
const heyApiTransientFiles = new Set([
  "client.gen.ts",
  ...heyApiCommittedFiles,
]);
const fixedGeneratedOutputs = [
  "openapi/corrected-core.json",
  "openapi/response-schemas.json",
] as const;
const httpMethods = new Set([
  "delete",
  "get",
  "head",
  "options",
  "patch",
  "post",
  "put",
  "trace",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertRecord(
  value: unknown,
  description: string,
): asserts value is Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(`${description} must be an object.`);
  }
}

function assertString(
  value: unknown,
  description: string,
): asserts value is string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${description} must be a non-empty string.`);
  }
}

function cloneJson<T extends JsonValue>(value: T): T {
  return structuredClone(value);
}

function stableCompactJson(value: JsonValue): string {
  return JSON.stringify(value);
}

function displayValue(value: unknown): string {
  return value === undefined ? "absent" : JSON.stringify(value);
}

function encodePointerSegment(segment: string): string {
  return segment.replaceAll("~", "~0").replaceAll("/", "~1");
}

function pascalCase(value: string): string {
  return value
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join("");
}

function validatorFunctionName(functionName: string, status: number): string {
  return `validate${functionName[0]?.toUpperCase() ?? ""}${functionName.slice(
    1,
  )}${status}`;
}

function generatedHeader(source: OpenApiSource): string {
  return [
    "// Generated by `pnpm openapi:generate` using @hey-api/openapi-ts 0.99.0.",
    `// Sefaria source: ${source.commit} (SHA-256 ${source.sha256}).`,
    "// Do not edit.",
  ].join("\n");
}

export function sha256(bytes: Uint8Array | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function verifyChecksum(
  source: Pick<OpenApiSource, "sha256">,
  upstreamBytes: Uint8Array | string,
): void {
  const actual = sha256(upstreamBytes);
  if (actual !== source.sha256) {
    throw new Error(
      `OpenAPI checksum mismatch: expected ${source.sha256}, actual ${actual}.`,
    );
  }
}

export function validateOpenApi30NullSemantics(document: JsonObject): void {
  const version = document.openapi;
  if (typeof version !== "string" || !version.startsWith("3.0.")) {
    throw new Error(
      `Corrected Core document must use OpenAPI 3.0.x, received ${String(
        version,
      )}.`,
    );
  }
  const validTypes = new Set([
    "array",
    "boolean",
    "integer",
    "number",
    "object",
    "string",
  ]);

  function visit(value: JsonValue, path: string): void {
    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, `${path}/${index}`));
      return;
    }
    if (!isRecord(value)) {
      return;
    }
    if (value.type === "null") {
      throw new Error(
        `OpenAPI 3.0 schema at ${path || "/"} must not use type "null".`,
      );
    }
    if (
      value.nullable === true &&
      (typeof value.type !== "string" || !validTypes.has(value.type))
    ) {
      throw new Error(
        `OpenAPI 3.0 nullable schema at ${path || "/"} must declare an explicit non-null type.`,
      );
    }
    for (const [key, child] of Object.entries(value)) {
      visit(child as JsonValue, `${path}/${encodePointerSegment(key)}`);
    }
  }

  visit(document, "");
}

function validateEvidence(finding: Finding): void {
  assertString(finding.evidence.route, `${finding.id} route evidence`);
  assertString(finding.evidence.handler, `${finding.id} handler evidence`);
  assertString(
    finding.evidence.responseBuilder,
    `${finding.id} response-builder evidence`,
  );
  assertString(finding.evidence.tests, `${finding.id} test evidence`);
  if (finding.audit !== undefined) {
    assertString(finding.audit.findingId, `${finding.id} audit finding ID`);
    if (
      !Array.isArray(finding.audit.artifacts) ||
      finding.audit.artifacts.length === 0
    ) {
      throw new Error(`${finding.id} audit artifacts must be non-empty.`);
    }
    for (const artifact of finding.audit.artifacts) {
      assertString(artifact, `${finding.id} audit artifact`);
      if (/^(?:[A-Za-z]:[\\/]|[\\/])/.test(artifact)) {
        throw new Error(
          `${finding.id} audit artifact must not use an absolute path: ${artifact}.`,
        );
      }
    }
  }
}

export function validateOverlayDocuments(
  overlay: OverlayDocument,
  findings: FindingsDocument,
): void {
  if (overlay.overlay !== "1.1.0") {
    throw new Error(
      `Unsupported OpenAPI Overlay version: ${String(overlay.overlay)}.`,
    );
  }
  if (overlay.extends !== "./upstream.json") {
    throw new Error(
      `OpenAPI Overlay extends must be "./upstream.json", received ${JSON.stringify(
        overlay.extends,
      )}.`,
    );
  }
  assertString(overlay.info?.title, "OpenAPI Overlay info.title");
  assertString(overlay.info?.version, "OpenAPI Overlay info.version");
  if (!Array.isArray(overlay.actions) || overlay.actions.length === 0) {
    throw new Error("OpenAPI Overlay actions must be a non-empty array.");
  }
  if (findings.version !== 1 || !Array.isArray(findings.findings)) {
    throw new Error(
      "OpenAPI findings must use version 1 and contain findings.",
    );
  }

  const actionsById = new Map<string, OverlayAction>();
  for (const action of overlay.actions) {
    assertString(action["x-action-id"], "Overlay x-action-id");
    assertString(action["x-finding-id"], "Overlay x-finding-id");
    assertString(
      action.target,
      `Overlay action ${action["x-action-id"]} target`,
    );
    if (!action.target.startsWith("$")) {
      throw new Error(
        `Overlay action ${action["x-action-id"]} target must be JSONPath.`,
      );
    }
    const operationCount = [
      Object.hasOwn(action, "update"),
      Object.hasOwn(action, "remove"),
      Object.hasOwn(action, "copy"),
    ].filter(Boolean).length;
    if (operationCount !== 1) {
      throw new Error(
        `Overlay action ${action["x-action-id"]} must define exactly one of update, remove, or copy.`,
      );
    }
    if (action.remove !== undefined && action.remove !== true) {
      throw new Error(
        `Overlay action ${action["x-action-id"]} remove must be true.`,
      );
    }
    if (action.copy !== undefined && !action.copy.startsWith("$")) {
      throw new Error(
        `Overlay action ${action["x-action-id"]} copy must be JSONPath.`,
      );
    }
    if (actionsById.has(action["x-action-id"])) {
      throw new Error(`Duplicate overlay action ID: ${action["x-action-id"]}.`);
    }
    actionsById.set(action["x-action-id"], action);
  }

  const findingsById = new Map<string, Finding>();
  const assignedActions = new Set<string>();
  for (const finding of findings.findings) {
    assertString(finding.id, "Finding ID");
    assertString(finding.summary, `Finding ${finding.id} summary`);
    validateEvidence(finding);
    if (findingsById.has(finding.id)) {
      throw new Error(`Duplicate OpenAPI finding ID: ${finding.id}.`);
    }
    findingsById.set(finding.id, finding);
    if (!Array.isArray(finding.actions) || finding.actions.length === 0) {
      throw new Error(`Finding ${finding.id} must reference overlay actions.`);
    }
    if (
      !Array.isArray(finding.preconditions) ||
      finding.preconditions.length === 0
    ) {
      throw new Error(`Finding ${finding.id} must define preconditions.`);
    }
    for (const actionId of finding.actions) {
      const action = actionsById.get(actionId);
      if (action === undefined) {
        throw new Error(
          `Finding ${finding.id} references missing overlay action ${actionId}.`,
        );
      }
      if (action["x-finding-id"] !== finding.id) {
        throw new Error(
          `Overlay action ${actionId} references ${action["x-finding-id"]}, not ${finding.id}.`,
        );
      }
      if (assignedActions.has(actionId)) {
        throw new Error(
          `Overlay action ${actionId} is assigned more than once.`,
        );
      }
      assignedActions.add(actionId);
    }
  }

  for (const action of overlay.actions) {
    if (!findingsById.has(action["x-finding-id"])) {
      throw new Error(
        `Overlay action ${action["x-action-id"]} references missing finding ${action["x-finding-id"]}.`,
      );
    }
    if (!assignedActions.has(action["x-action-id"])) {
      throw new Error(
        `Overlay action ${action["x-action-id"]} is not listed by its finding.`,
      );
    }
  }
}

function preconditionMismatch(
  findingId: string,
  target: string,
  expected: string,
  actual: unknown,
): never {
  throw new Error(
    `OpenAPI precondition mismatch for ${findingId} at ${target}\nexpected: ${expected}\nactual: ${displayValue(
      actual,
    )}`,
  );
}

export function validatePreconditions(
  document: JsonObject,
  findings: FindingsDocument,
): void {
  for (const finding of findings.findings) {
    for (const precondition of finding.preconditions) {
      const values = openapiFormat.resolveJsonPathValue(
        document,
        precondition.target,
      );
      if ("absent" in precondition.expected) {
        if (values.length !== 0) {
          preconditionMismatch(
            finding.id,
            precondition.target,
            "absent",
            values.length === 1 ? values[0] : values,
          );
        }
        continue;
      }
      if (values.length !== 1) {
        preconditionMismatch(
          finding.id,
          precondition.target,
          "exactly one matching value",
          values,
        );
      }
      const actual = values[0];
      if ("value" in precondition.expected) {
        if (
          stableCompactJson(actual as JsonValue) !==
          stableCompactJson(precondition.expected.value)
        ) {
          preconditionMismatch(
            finding.id,
            precondition.target,
            displayValue(precondition.expected.value),
            actual,
          );
        }
      } else {
        const actualSha256 = sha256(stableCompactJson(actual as JsonValue));
        if (actualSha256 !== precondition.expected.sha256) {
          preconditionMismatch(
            finding.id,
            precondition.target,
            `SHA-256 ${precondition.expected.sha256}`,
            actual,
          );
        }
      }
    }
  }
}

export async function applyFormalOverlay(
  document: JsonObject,
  overlay: OverlayDocument,
): Promise<JsonObject> {
  const result = await openapiFormat.openapiOverlay(cloneJson(document), {
    overlaySet: overlay,
  });
  assertRecord(result.data, "OpenAPI Overlay output");
  const totalUsedActions = result.resultData.totalUsedActions ?? 0;
  const unusedActions = result.resultData.unusedActions ?? [];
  if (
    totalUsedActions !== overlay.actions.length ||
    unusedActions.length !== 0
  ) {
    throw new Error(
      `OpenAPI Overlay did not apply every action: used ${totalUsedActions} of ${overlay.actions.length}.`,
    );
  }
  return result.data as JsonObject;
}

function collectRefs(value: unknown, refs: Set<string>): void {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectRefs(item, refs);
    }
    return;
  }
  if (!isRecord(value)) {
    return;
  }
  if (typeof value.$ref === "string") {
    refs.add(value.$ref);
  }
  for (const child of Object.values(value)) {
    collectRefs(child, refs);
  }
}

function pointerSegments(pointer: string): string[] {
  if (!pointer.startsWith("/")) {
    throw new Error(`Invalid JSON Pointer: ${pointer}.`);
  }
  return pointer
    .slice(1)
    .split("/")
    .map((segment) => segment.replaceAll("~1", "/").replaceAll("~0", "~"));
}

function getPointerValue(document: JsonObject, pointer: string): unknown {
  let current: unknown = document;
  for (const segment of pointerSegments(pointer)) {
    if (!isRecord(current) || !Object.hasOwn(current, segment)) {
      return undefined;
    }
    current = current[segment];
  }
  return current;
}

function retainOnlyGet(pathItem: JsonValue): JsonValue {
  if (!isRecord(pathItem)) {
    return cloneJson(pathItem);
  }
  const retained: JsonObject = {};
  for (const [key, value] of Object.entries(pathItem)) {
    if (!httpMethods.has(key) || key === "get") {
      retained[key] = cloneJson(value as JsonValue);
    }
  }
  return retained;
}

export function extractCoreDocument(
  document: JsonObject,
  corePaths: readonly string[] = CORE_PATHS,
): JsonObject {
  assertRecord(document.paths, "OpenAPI paths");
  const sourceComponents = isRecord(document.components)
    ? document.components
    : {};
  const paths: JsonObject = {};

  for (const path of corePaths) {
    const pathItem = document.paths[path];
    if (pathItem === undefined) {
      throw new Error(`Missing Core OpenAPI path: ${path}.`);
    }
    paths[path] = retainOnlyGet(pathItem as JsonValue);
  }

  const pending = new Set<string>();
  collectRefs(paths, pending);
  const visited = new Set<string>();
  const retainedComponents: Record<string, JsonObject> = {};

  while (pending.size > 0) {
    const ref = pending.values().next().value as string;
    pending.delete(ref);
    if (visited.has(ref)) {
      continue;
    }
    visited.add(ref);
    if (!ref.startsWith("#/components/")) {
      throw new Error(`Unresolved external OpenAPI reference: ${ref}.`);
    }
    const segments = pointerSegments(ref.slice(1));
    if (segments.length !== 3 || segments[0] !== "components") {
      throw new Error(`Unsupported OpenAPI component reference: ${ref}.`);
    }
    const section = segments[1];
    const name = segments[2];
    if (section === undefined || name === undefined) {
      throw new Error(`Unsupported OpenAPI component reference: ${ref}.`);
    }
    const sourceSection = sourceComponents[section];
    if (!isRecord(sourceSection) || !Object.hasOwn(sourceSection, name)) {
      throw new Error(`Unresolved OpenAPI reference: ${ref}.`);
    }
    retainedComponents[section] ??= {};
    retainedComponents[section][name] = cloneJson(
      sourceSection[name] as JsonValue,
    );
    collectRefs(sourceSection[name], pending);
  }

  const sortedComponents: JsonObject = {};
  for (const section of Object.keys(retainedComponents).sort()) {
    const sourceSection = retainedComponents[section];
    if (sourceSection === undefined) {
      continue;
    }
    sortedComponents[section] = Object.fromEntries(
      Object.entries(sourceSection).sort(([left], [right]) =>
        left.localeCompare(right),
      ),
    ) as JsonObject;
  }

  const core: JsonObject = {};
  for (const [key, value] of Object.entries(document)) {
    if (key !== "paths" && key !== "components") {
      core[key] = cloneJson(value as JsonValue);
    }
  }
  core.paths = paths;
  core.components = sortedComponents;

  const unresolved = new Set<string>();
  collectRefs(core, unresolved);
  for (const ref of unresolved) {
    if (getPointerValue(core, ref.slice(1)) === undefined) {
      throw new Error(`Unresolved OpenAPI reference after extraction: ${ref}.`);
    }
  }

  for (const expected of CORE_OPERATIONS) {
    const pathItem = paths[expected.path];
    assertRecord(pathItem, `Core path ${expected.path}`);
    const operation = pathItem.get;
    assertRecord(operation, `GET ${expected.path}`);
    if (operation.operationId !== expected.operationId) {
      throw new Error(
        `Unexpected operationId for GET ${expected.path}: ${String(
          operation.operationId,
        )}.`,
      );
    }
  }

  return core;
}

function withGenerationMetadata(
  core: JsonObject,
  source: OpenApiSource,
): JsonObject {
  return {
    ...core,
    "x-sefaria-generation": {
      command: "pnpm openapi:generate",
      repository: source.repository,
      commit: source.commit,
      path: source.path,
      sha256: source.sha256,
    },
  };
}

function isJsonMediaType(mediaType: string): boolean {
  const normalized = mediaType.split(";", 1)[0]?.trim().toLowerCase();
  return (
    normalized === "application/json" || normalized?.endsWith("+json") === true
  );
}

function responseSchemaPointer(
  path: string,
  status: number,
  mediaType: string,
): string {
  return `/paths/${encodePointerSegment(
    path,
  )}/get/responses/${status}/content/${encodePointerSegment(mediaType)}/schema`;
}

function componentValidatorExport(schema: unknown): string {
  assertRecord(schema, "Documented error response schema");
  const reference = schema.$ref;
  if (
    typeof reference !== "string" ||
    !reference.startsWith("#/components/schemas/")
  ) {
    throw new Error(
      "Documented error responses must reference a generated component schema.",
    );
  }
  const component = pointerSegments(reference.slice(1))[2];
  if (component === undefined) {
    throw new Error(`Unsupported response schema reference: ${reference}.`);
  }
  return `z${component}`;
}

function collectResponseContracts(document: JsonObject): {
  readonly metadata: readonly ResponseContractMetadata[];
  readonly schemas: ReadonlyMap<string, JsonValue>;
} {
  assertRecord(document.paths, "Corrected Core paths");
  const metadata: ResponseContractMetadata[] = [];
  const schemas = new Map<string, JsonValue>();

  for (const expected of CORE_OPERATIONS) {
    const pathItem = document.paths[expected.path];
    assertRecord(pathItem, `Core path ${expected.path}`);
    const operation = pathItem.get;
    assertRecord(operation, `GET ${expected.path}`);
    assertRecord(operation.responses, `Responses for GET ${expected.path}`);

    for (const [statusText, responseValue] of Object.entries(
      operation.responses,
    ).sort(([left], [right]) => left.localeCompare(right))) {
      if (!/^\d{3}$/.test(statusText)) {
        throw new Error(
          `GET ${expected.path} must use explicit response statuses, received ${statusText}.`,
        );
      }
      const status = Number(statusText);
      assertRecord(
        responseValue,
        `Response ${statusText} for GET ${expected.path}`,
      );
      assertRecord(
        responseValue.content,
        `Response content ${statusText} for GET ${expected.path}`,
      );
      const jsonEntries = Object.entries(responseValue.content).filter(
        ([mediaType]) => isJsonMediaType(mediaType),
      );
      if (jsonEntries.length !== 1) {
        throw new Error(
          `GET ${expected.path} ${statusText} must define exactly one JSON response schema.`,
        );
      }
      const [mediaType, mediaValue] = jsonEntries[0] as [string, unknown];
      assertRecord(
        mediaValue,
        `Media type ${mediaType} for GET ${expected.path} ${statusText}`,
      );
      if (!isRecord(mediaValue.schema)) {
        throw new Error(
          `GET ${expected.path} ${statusText} is missing a JSON response schema.`,
        );
      }
      const validatorExport =
        status >= 200 && status < 300
          ? `z${pascalCase(expected.operationId)}Response`
          : componentValidatorExport(mediaValue.schema);
      const validatorName = validatorFunctionName(
        expected.functionName,
        status,
      );
      const schemaPath = responseSchemaPointer(
        expected.path,
        status,
        mediaType,
      );
      metadata.push({
        operationId: expected.operationId,
        functionName: expected.functionName,
        method: "GET",
        path: expected.path,
        status,
        contentTypes: [mediaType],
        schemaPath,
        validatorExport,
        validatorName,
      });
      schemas.set(
        `${expected.functionName}__${status}`,
        cloneJson(mediaValue.schema as JsonValue),
      );
    }
  }

  return { metadata, schemas };
}

function convertOpenApiSchema(value: JsonValue): JsonValue {
  if (Array.isArray(value)) {
    return value.map(convertOpenApiSchema);
  }
  if (!isRecord(value)) {
    return value;
  }

  const converted: JsonObject = {};
  for (const [key, child] of Object.entries(value)) {
    if (key !== "nullable") {
      converted[key] = convertOpenApiSchema(child as JsonValue);
    }
  }
  if (value.nullable !== true) {
    return converted;
  }
  if (typeof converted.type === "string") {
    converted.type = [converted.type, "null"];
    return converted;
  }
  return {
    anyOf: [converted, { type: "null" }],
  };
}

function buildPortableResponseSchemas(
  document: JsonObject,
  source: OpenApiSource,
  contracts: {
    readonly metadata: readonly ResponseContractMetadata[];
    readonly schemas: ReadonlyMap<string, JsonValue>;
  },
): JsonObject {
  const components = isRecord(document.components)
    ? convertOpenApiSchema(document.components as JsonObject)
    : {};
  const responses: JsonObject = {};
  for (const [id, schema] of contracts.schemas) {
    responses[id] = convertOpenApiSchema(schema);
  }
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://sefaria-web-components.invalid/openapi/core-response-schemas.json",
    title: "Sefaria Core response schemas",
    description:
      "Generated portable response schemas for the six @sefaria/client Core GET operations.",
    "x-generated-by": "pnpm openapi:generate",
    "x-sefaria-source": {
      repository: source.repository,
      commit: source.commit,
      path: source.path,
      sha256: source.sha256,
    },
    components,
    $defs: {
      responses,
    },
    "x-sefaria-responses": contracts.metadata.map((entry) => ({
      ...entry,
      contentTypes: [...entry.contentTypes],
      schemaRef: `#/$defs/responses/${encodePointerSegment(
        `${entry.functionName}__${entry.status}`,
      )}`,
    })),
  };
}

function buildResponseContractsModule(
  contracts: readonly ResponseContractMetadata[],
  source: OpenApiSource,
): string {
  const imports = [
    ...new Set(contracts.map(({ validatorExport }) => validatorExport)),
  ]
    .sort()
    .join(", ");
  const entries = contracts
    .map(
      (entry) => `  {
    operationId: ${JSON.stringify(entry.operationId)},
    functionName: ${JSON.stringify(entry.functionName)},
    method: "GET",
    path: ${JSON.stringify(entry.path)},
    status: ${entry.status},
    contentTypes: ${JSON.stringify(entry.contentTypes)},
    schemaPath: ${JSON.stringify(entry.schemaPath)},
    validatorName: ${JSON.stringify(entry.validatorName)},
    schema: ${entry.validatorExport},
  },`,
    )
    .join("\n");
  return `${generatedHeader(source)}

import type { ZodType } from "zod";

import { ${imports} } from "./zod.gen.js";

export interface GeneratedResponseContract {
  readonly operationId: string;
  readonly functionName: string;
  readonly method: "GET";
  readonly path: string;
  readonly status: number;
  readonly contentTypes: readonly string[];
  readonly schemaPath: string;
  readonly validatorName: string;
  readonly schema: ZodType;
}

export const responseContracts = [
${entries}
] as const satisfies readonly GeneratedResponseContract[];
`;
}

function buildResponseValidatorsModule(
  contracts: readonly ResponseContractMetadata[],
  source: OpenApiSource,
): string {
  const imports = [
    ...new Set(contracts.map(({ validatorExport }) => validatorExport)),
  ]
    .sort()
    .join(", ");
  const validators = contracts
    .map(
      (
        entry,
      ) => `export function ${entry.validatorName}(value: unknown): boolean {
  return ${entry.validatorExport}.safeParse(value).success;
}`,
    )
    .join("\n\n");
  return `${generatedHeader(source)}

import { ${imports} } from "./zod.gen.js";

${validators}
`;
}

function buildContractsModule(source: OpenApiSource): string {
  return `${generatedHeader(source)}

export type * from "./types.gen.js";
export type {
  GetVersionsData as GetTextVersionsData,
  GetVersionsResponse as GetTextVersionsResponse,
  GetVersionsResponses as GetTextVersionsResponses,
} from "./types.gen.js";
`;
}

function replaceGeneratedFragment(
  source: string,
  before: string,
  after: string,
  description: string,
): string {
  const first = source.indexOf(before);
  if (first < 0 || source.indexOf(before, first + before.length) >= 0) {
    throw new Error(
      `Unable to apply generated Zod correction: ${description}.`,
    );
  }
  return source.replace(before, after);
}

function patchGeneratedZod(source: string): string {
  const typedImports = replaceGeneratedFragment(
    source,
    `import * as z from "zod";`,
    `import * as z from "zod";

import type {
  CoreShapeChapter,
  CoreShapeCollapsedRecord,
  CoreShapeLeafRecord,
  CoreStringArrayOrNull,
  CoreV3TextValue,
} from "./types.gen.js";`,
    "recursive contract type imports",
  );
  const stringArrayOrNull = replaceGeneratedFragment(
    typedImports,
    `export const zCoreStringArrayOrNull = z
  .union([
    z.string(),
    z.array(z.lazy((): any => zCoreStringArrayOrNull)),
    z.unknown(),
  ])
  .nullable();`,
    `export const zCoreStringArrayOrNull: z.ZodType<CoreStringArrayOrNull> =
  z.lazy(() =>
    z.union([z.string(), z.array(zCoreStringArrayOrNull), z.null()]),
  );`,
    "CoreStringArrayOrNull explicit null branch",
  );
  const v3TextValue = replaceGeneratedFragment(
    stringArrayOrNull,
    `export const zCoreV3TextValue = z
  .union([
    z.string(),
    z.array(z.lazy((): any => zCoreV3TextValue)),
    z.unknown(),
  ])
  .nullable();`,
    `export const zCoreV3TextValue: z.ZodType<CoreV3TextValue> = z.lazy(() =>
  z.union([z.string(), z.array(zCoreV3TextValue), z.null()]),
);`,
    "CoreV3TextValue explicit null branch",
  );
  const warning = replaceGeneratedFragment(
    v3TextValue,
    "export const zCoreV3Warning = z.record(z.string(), zCoreV3WarningDetail);",
    `export const zCoreV3Warning = z
  .record(z.string(), zCoreV3WarningDetail)
  .refine((value) => Object.keys(value).length >= 1, {
    message: "Expected at least one warning entry.",
  });`,
    "v3 warning minProperties",
  );
  const shapeChapter = replaceGeneratedFragment(
    warning,
    `export const zCoreShapeChapter = z.union([
  z.int(),
  z.array(z.lazy((): any => zCoreShapeChapter)),
  z.lazy((): any => zCoreShapeLeafRecord),
]);`,
    `export const zCoreShapeChapter: z.ZodType<CoreShapeChapter> = z.lazy(() =>
  z.union([z.int(), z.array(zCoreShapeChapter), zCoreShapeLeafRecord]),
);`,
    "CoreShapeChapter recursive type",
  );
  const collapsedShape = replaceGeneratedFragment(
    shapeChapter,
    `export const zCoreShapeCollapsedRecord = z.object({
  isComplex: z.literal(true),
  section: z.string(),
  length: z.int(),
  chapters: z.array(z.lazy((): any => zCoreShapeLeafRecord)),
  book: z.string(),
  heBook: z.string(),
});`,
    `export const zCoreShapeCollapsedRecord: z.ZodType<CoreShapeCollapsedRecord> =
  z.lazy(() =>
    z.object({
      isComplex: z.literal(true),
      section: z.string(),
      length: z.int(),
      chapters: z.array(zCoreShapeLeafRecord),
      book: z.string(),
      heBook: z.string(),
    }),
  );`,
    "CoreShapeCollapsedRecord recursive type",
  );
  return replaceGeneratedFragment(
    collapsedShape,
    `export const zCoreShapeLeafRecord = z.object({
  section: z.string(),
  heTitle: z.string(),
  title: z.string(),
  length: z.int(),
  chapters: zCoreShapeChapter,
  book: z.string(),
  heBook: z.string(),
  isComplex: z.boolean().optional(),
});`,
    `export const zCoreShapeLeafRecord: z.ZodType<CoreShapeLeafRecord> = z.lazy(
  () =>
    z
      .object({
        section: z.string(),
        heTitle: z.string(),
        title: z.string(),
        length: z.int(),
        chapters: zCoreShapeChapter,
        book: z.string(),
        heBook: z.string(),
        isComplex: z.boolean().optional(),
      })
      .transform(({ isComplex, ...value }): CoreShapeLeafRecord =>
        isComplex === undefined ? value : { ...value, isComplex },
      ),
);`,
    "CoreShapeLeafRecord recursive type",
  );
}

function patchGeneratedSdk(source: string): string {
  const withoutClientMeta = replaceGeneratedFragment(
    source,
    `  Client,
  ClientMeta,
  Options as Options2,`,
    `  Options as Options2,`,
    "external fetch client metadata import",
  );
  const compatibleOptions = replaceGeneratedFragment(
    withoutClientMeta,
    `export type Options<
  TData extends TDataShape = TDataShape,
  ThrowOnError extends boolean = boolean,
  TResponse = unknown,
> = Options2<TData, ThrowOnError, TResponse> & {`,
    `import {
  requireSefariaClient,
  type SefariaClient,
} from "../client.js";

export type Options<
  TData extends TDataShape = TDataShape,
  ThrowOnError extends boolean = boolean,
> = Omit<
  Options2<TData, ThrowOnError>,
  "parseAs" | "responseStyle" | "responseTransformer" | "responseValidator"
> & {`,
    "external fetch client options generics",
  );
  const typedClient = replaceGeneratedFragment(
    compatibleOptions,
    "  client: Client;",
    "  client: SefariaClient;",
    "validated client option",
  );
  const metadata = replaceGeneratedFragment(
    typedClient,
    "  meta?: keyof ClientMeta extends never ? Record<string, unknown> : ClientMeta;",
    "  meta?: Record<string, unknown>;",
    "external fetch client metadata option",
  );
  const patched = metadata.replace(
    /options\.client\.get<([\s\S]*?)>\(\{\n {4}responseValidator: ([\s\S]*?),\n {4}url: ("[^"]+"),\n {4}\.\.\.options,\n {2}\}\);/g,
    `requireSefariaClient(options.client).get<$1>({
    ...options,
    parseAs: "json",
    responseStyle: "fields",
    responseTransformer: async (data) => data,
    responseValidator: $2,
    url: $3,
  });`,
  );
  if (
    patched === metadata ||
    patched.match(/requireSefariaClient\(/g)?.length !== CORE_OPERATIONS.length
  ) {
    throw new Error("Could not secure every generated SDK client call.");
  }
  return patched;
}

async function listFiles(root: string): Promise<readonly string[]> {
  const files: string[] = [];
  async function visit(directory: string): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries.sort((left, right) =>
      left.name.localeCompare(right.name),
    )) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(path);
      } else if (entry.isFile()) {
        files.push(path);
      }
    }
  }
  await visit(root);
  return files;
}

async function formatGeneratedFile(
  source: string,
  path: string,
  parser: "json" | "typescript",
): Promise<string> {
  const filePath = resolve(packageRoot, path);
  const config = (await resolvePrettierConfig(filePath)) ?? {};
  return formatWithPrettier(source, {
    ...config,
    filepath: filePath,
    parser,
    endOfLine: "lf",
  });
}

async function generateHeyApiArtifacts(
  correctedCore: string,
  source: OpenApiSource,
): Promise<ReadonlyMap<string, string>> {
  const temporaryRoot = await mkdtemp(resolve(tmpdir(), "sefaria-openapi-"));
  const inputPath = resolve(temporaryRoot, "corrected-core.json");
  const outputPath = resolve(temporaryRoot, "generated");
  try {
    await writeFile(inputPath, correctedCore, "utf8");
    await generateHeyApiClient({
      input: inputPath,
      output: {
        path: outputPath,
        clean: true,
        entryFile: false,
        fileName: { suffix: ".gen" },
        header: generatedHeader(source).split("\n"),
        module: { extension: ".js" },
        postProcess: [],
        tsConfigPath: resolve(packageRoot, "tsconfig.json"),
      },
      plugins: [
        {
          name: "@hey-api/client-fetch",
          bundle: false,
        },
        {
          name: "@hey-api/typescript",
        },
        {
          name: "@hey-api/sdk",
          client: false,
          operations: {
            strategy: "flat",
            methodName: (name) =>
              name === "get-versions" || name === "getVersions"
                ? "getTextVersions"
                : name,
          },
          responseStyle: "fields",
          validator: { response: "zod" },
        },
        {
          name: "zod",
          compatibilityVersion: 4,
          definitions: true,
          requests: false,
          responses: true,
          $resolvers: {
            object: (context) => {
              const base = context.nodes.base(context);
              const additionalProperties = context.schema.additionalProperties;
              return typeof additionalProperties === "object" &&
                additionalProperties.type === "never"
                ? base.attr("strict").call()
                : base;
            },
          },
        },
      ],
    });

    const generatedPaths = await listFiles(outputPath);
    const generatedRelativePaths = generatedPaths.map((path) =>
      relative(outputPath, path).replaceAll("\\", "/"),
    );
    const unexpectedGeneratedFiles = generatedRelativePaths.filter(
      (path) => !heyApiTransientFiles.has(path),
    );
    if (unexpectedGeneratedFiles.length > 0) {
      throw new Error(
        `Hey API emitted unexpected files: ${unexpectedGeneratedFiles.join(", ")}.`,
      );
    }
    for (const expected of heyApiCommittedFiles) {
      if (!generatedRelativePaths.includes(expected)) {
        throw new Error(`Hey API did not generate ${expected}.`);
      }
    }

    const artifacts = new Map<string, string>();
    for (const path of generatedPaths) {
      const outputRelativePath = relative(outputPath, path).replaceAll(
        "\\",
        "/",
      );
      if (!heyApiCommittedFiles.has(outputRelativePath)) {
        continue;
      }
      let contents = await readFile(path, "utf8");
      const generatedPath = `${generatedDirectory}/${outputRelativePath}`;
      if (outputRelativePath === "zod.gen.ts") {
        contents = patchGeneratedZod(
          await formatGeneratedFile(contents, generatedPath, "typescript"),
        );
      } else if (outputRelativePath === "sdk.gen.ts") {
        contents = patchGeneratedSdk(
          await formatGeneratedFile(contents, generatedPath, "typescript"),
        );
      }
      artifacts.set(
        generatedPath,
        path.endsWith(".ts")
          ? await formatGeneratedFile(contents, generatedPath, "typescript")
          : contents,
      );
    }
    const sdk = artifacts.get(`${generatedDirectory}/sdk.gen.ts`);
    if (sdk === undefined) {
      throw new Error("Hey API did not generate sdk.gen.ts.");
    }
    const generatedFunctions = [
      ...sdk.matchAll(/export const ([A-Za-z0-9_]+) =/g),
    ].map((match) => match[1]);
    const expectedFunctions = CORE_OPERATIONS.map(
      ({ functionName }) => functionName,
    );
    if (
      stableCompactJson(generatedFunctions as JsonValue) !==
      stableCompactJson(expectedFunctions as unknown as JsonValue)
    ) {
      throw new Error(
        `Unexpected generated SDK functions: ${generatedFunctions.join(", ")}.`,
      );
    }
    return artifacts;
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

export async function generateArtifacts(
  source: OpenApiSource,
  upstreamBytes: Uint8Array | string,
  overlay: OverlayDocument,
  findings: FindingsDocument,
): Promise<ReadonlyMap<string, string>> {
  verifyChecksum(source, upstreamBytes);
  validateOverlayDocuments(overlay, findings);
  const upstreamText =
    typeof upstreamBytes === "string"
      ? upstreamBytes
      : new TextDecoder().decode(upstreamBytes);
  const upstream = JSON.parse(upstreamText) as JsonObject;
  validatePreconditions(upstream, findings);
  const corrected = await applyFormalOverlay(upstream, overlay);
  const core = withGenerationMetadata(extractCoreDocument(corrected), source);
  validateOpenApi30NullSemantics(core);
  const correctedCore = await formatGeneratedFile(
    JSON.stringify(core),
    "openapi/corrected-core.json",
    "json",
  );
  const contracts = collectResponseContracts(core);
  const artifacts = new Map<string, string>([
    ["openapi/corrected-core.json", correctedCore],
    [
      "openapi/response-schemas.json",
      await formatGeneratedFile(
        JSON.stringify(buildPortableResponseSchemas(core, source, contracts)),
        "openapi/response-schemas.json",
        "json",
      ),
    ],
  ]);

  for (const [path, contents] of await generateHeyApiArtifacts(
    correctedCore,
    source,
  )) {
    artifacts.set(path, contents);
  }
  artifacts.set(
    `${generatedDirectory}/response-contracts.gen.ts`,
    await formatGeneratedFile(
      buildResponseContractsModule(contracts.metadata, source),
      `${generatedDirectory}/response-contracts.gen.ts`,
      "typescript",
    ),
  );
  artifacts.set(
    `${generatedDirectory}/response-validators.gen.ts`,
    await formatGeneratedFile(
      buildResponseValidatorsModule(contracts.metadata, source),
      `${generatedDirectory}/response-validators.gen.ts`,
      "typescript",
    ),
  );
  artifacts.set(
    `${generatedDirectory}/contracts.gen.ts`,
    await formatGeneratedFile(
      buildContractsModule(source),
      `${generatedDirectory}/contracts.gen.ts`,
      "typescript",
    ),
  );
  return artifacts;
}

export function findStaleArtifacts(
  generated: ReadonlyMap<string, string>,
  committed: ReadonlyMap<string, string>,
): readonly string[] {
  return [...new Set([...generated.keys(), ...committed.keys()])]
    .filter((path) => generated.get(path) !== committed.get(path))
    .sort();
}

async function parseYamlFile<T>(path: string, description: string): Promise<T> {
  const parsed = await openapiFormat.parseFile(path);
  if (parsed instanceof SyntaxError) {
    throw new Error(`${description} is invalid YAML: ${parsed.message}`);
  }
  if (!isRecord(parsed)) {
    throw new Error(`${description} must contain a YAML object.`);
  }
  return parsed as T;
}

export async function loadOverlayInputs(root = packageRoot): Promise<{
  readonly overlay: OverlayDocument;
  readonly findings: FindingsDocument;
}> {
  const [overlay, findings] = await Promise.all([
    parseYamlFile<OverlayDocument>(
      resolve(root, "openapi/overlay.yaml"),
      "OpenAPI Overlay",
    ),
    parseYamlFile<FindingsDocument>(
      resolve(root, "openapi/findings.yaml"),
      "OpenAPI findings",
    ),
  ]);
  return { overlay, findings };
}

export async function loadCommittedInputs(root = packageRoot): Promise<{
  readonly source: OpenApiSource;
  readonly upstreamBytes: Uint8Array;
  readonly overlay: OverlayDocument;
  readonly findings: FindingsDocument;
}> {
  const [sourceText, upstreamBytes, overlayInputs] = await Promise.all([
    readFile(resolve(root, "openapi/source.json"), "utf8"),
    readFile(resolve(root, "openapi/upstream.json")),
    loadOverlayInputs(root),
  ]);
  return {
    source: JSON.parse(sourceText) as OpenApiSource,
    upstreamBytes,
    ...overlayInputs,
  };
}

async function readFileIfPresent(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if (
      isRecord(error) &&
      "code" in error &&
      (error as { readonly code?: unknown }).code === "ENOENT"
    ) {
      return undefined;
    }
    throw error;
  }
}

export async function readCommittedArtifacts(
  root = packageRoot,
): Promise<ReadonlyMap<string, string>> {
  const artifacts = new Map<string, string>();
  for (const path of fixedGeneratedOutputs) {
    const contents = await readFileIfPresent(resolve(root, path));
    if (contents !== undefined) {
      artifacts.set(path, contents);
    }
  }
  const generatedRoot = resolve(root, generatedDirectory);
  try {
    for (const path of await listFiles(generatedRoot)) {
      artifacts.set(
        `${generatedDirectory}/${relative(generatedRoot, path).replaceAll(
          "\\",
          "/",
        )}`,
        await readFile(path, "utf8"),
      );
    }
  } catch (error) {
    if (
      !isRecord(error) ||
      !("code" in error) ||
      (error as { readonly code?: unknown }).code !== "ENOENT"
    ) {
      throw error;
    }
  }
  return artifacts;
}

export async function writeArtifacts(
  artifacts: ReadonlyMap<string, string>,
  root = packageRoot,
): Promise<void> {
  await rm(resolve(root, generatedDirectory), {
    recursive: true,
    force: true,
  });
  for (const [path, contents] of artifacts) {
    const output = resolve(root, path);
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, contents, "utf8");
  }
}

export async function generateCommittedArtifacts(
  root = packageRoot,
): Promise<void> {
  const inputs = await loadCommittedInputs(root);
  const artifacts = await generateArtifacts(
    inputs.source,
    inputs.upstreamBytes,
    inputs.overlay,
    inputs.findings,
  );
  await writeArtifacts(artifacts, root);
}

export async function checkCommittedArtifacts(
  root = packageRoot,
): Promise<readonly string[]> {
  const inputs = await loadCommittedInputs(root);
  const generated = await generateArtifacts(
    inputs.source,
    inputs.upstreamBytes,
    inputs.overlay,
    inputs.findings,
  );
  const committed = await readCommittedArtifacts(root);
  return findStaleArtifacts(generated, committed);
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : undefined;
if (invokedPath === fileURLToPath(import.meta.url)) {
  await generateCommittedArtifacts();
}
