import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
} from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { beforeAll, describe, expect, it, vi } from "vitest";

import {
  CORE_OPERATIONS,
  CORE_PATHS,
  applyFormalOverlay,
  extractCoreDocument,
  findStaleArtifacts,
  generateArtifacts,
  loadCommittedInputs,
  loadOverlayInputs,
  sha256,
  validateOpenApi30NullSemantics,
  validatePreconditions,
  verifyChecksum,
  type FindingsDocument,
  type JsonObject,
  type JsonValue,
  type OpenApiSource,
  type OverlayDocument,
} from "../scripts/generate-openapi.js";
import {
  parseCommit,
  pinnedOpenApiUrl,
  refreshOpenApi,
} from "../scripts/refresh-openapi.js";

const packageRoot = resolve(import.meta.dirname, "..");
const require = createRequire(import.meta.url);
const { resolveJsonPath } = require("openapi-format") as {
  resolveJsonPath(
    document: JsonObject,
    path: string,
  ): {
    readonly value: unknown;
    readonly parent: Record<string, unknown> | unknown[] | undefined;
    readonly key: string | number | undefined;
  }[];
};

let source: OpenApiSource;
let upstream: Uint8Array;
let overlay: OverlayDocument;
let findings: FindingsDocument;
let artifacts: ReadonlyMap<string, string>;

function mutateGuardedTarget(document: JsonObject, target: string): void {
  const nodes = resolveJsonPath(document, target);
  if (nodes.length === 1) {
    const node = nodes[0];
    if (node?.parent === undefined || node.key === undefined) {
      throw new Error(`Cannot mutate root precondition target ${target}.`);
    }
    if (Array.isArray(node.parent)) {
      if (typeof node.key !== "number") {
        throw new Error(`Array precondition key is not numeric at ${target}.`);
      }
      node.parent[node.key] = "__unexpected__";
    } else {
      node.parent[String(node.key)] = "__unexpected__";
    }
    return;
  }
  if (nodes.length > 1) {
    throw new Error(`Precondition target is not singular: ${target}.`);
  }

  const bracket = target.match(/^(.*)\['([^']+)'\]$/);
  const dot = target.match(/^(.*)\.([A-Za-z0-9_-]+)$/);
  const parentTarget = bracket?.[1] ?? dot?.[1];
  const key = bracket?.[2] ?? dot?.[2];
  if (parentTarget === undefined || key === undefined) {
    throw new Error(`Cannot insert absent precondition target ${target}.`);
  }
  const parentNodes = resolveJsonPath(document, parentTarget);
  if (parentNodes.length !== 1 || !parentNodes[0]?.value) {
    throw new Error(`Cannot resolve parent for precondition target ${target}.`);
  }
  const parent = parentNodes[0].value;
  if (typeof parent !== "object" || Array.isArray(parent)) {
    throw new Error(`Precondition parent is not an object at ${target}.`);
  }
  (parent as Record<string, unknown>)[key] = "__unexpected__";
}

async function snapshotRefreshOutputs(
  root: string,
): Promise<readonly (readonly [string, string])[]> {
  const entries: [string, string][] = [];
  const targets = [
    "openapi/source.json",
    "openapi/upstream.json",
    "openapi/corrected-core.json",
    "openapi/response-schemas.json",
    "src/generated",
  ];

  async function visit(path: string, relativePath: string): Promise<void> {
    const children = await readdir(path, { withFileTypes: true });
    for (const child of children.sort((left, right) =>
      left.name.localeCompare(right.name),
    )) {
      const childPath = resolve(path, child.name);
      const childRelativePath = `${relativePath}/${child.name}`;
      if (child.isDirectory()) {
        await visit(childPath, childRelativePath);
      } else if (child.isFile()) {
        entries.push([
          childRelativePath,
          (await readFile(childPath)).toString("base64"),
        ]);
      }
    }
  }

  for (const target of targets) {
    const path = resolve(root, target);
    const children = await readdir(path, { withFileTypes: true }).catch(
      () => undefined,
    );
    if (children === undefined) {
      entries.push([target, (await readFile(path)).toString("base64")]);
    } else {
      await visit(path, target);
    }
  }
  return entries;
}

beforeAll(async () => {
  const inputs = await loadCommittedInputs(packageRoot);
  source = inputs.source;
  upstream = inputs.upstreamBytes;
  overlay = inputs.overlay;
  findings = inputs.findings;
  artifacts = await generateArtifacts(source, upstream, overlay, findings);
});

describe("OpenAPI generation", () => {
  it("rejects a checksum mismatch before generation", () => {
    expect(() =>
      verifyChecksum({ sha256: "0".repeat(64) }, '{"openapi":"3.0.2"}'),
    ).toThrow(/checksum mismatch/);
  });

  it("rejects a mutation at every guarded sidecar target", () => {
    for (const finding of findings.findings) {
      for (const precondition of finding.preconditions) {
        const document = JSON.parse(
          new TextDecoder().decode(upstream),
        ) as JsonObject;
        mutateGuardedTarget(document, precondition.target);
        expect(
          () => validatePreconditions(document, findings),
          `${finding.id}: ${precondition.target}`,
        ).toThrow();
      }
    }
  });

  it("rejects OpenAPI 3.0 nullable schemas without an explicit type", () => {
    expect(() =>
      validateOpenApi30NullSemantics({
        openapi: "3.0.3",
        info: { title: "test", version: "1" },
        paths: {},
        components: {
          schemas: {
            Invalid: {
              nullable: true,
              oneOf: [{ type: "string" }, { type: "array" }],
            },
          },
        },
      }),
    ).toThrow(/must declare an explicit non-null type/);
  });

  it("uses a formal Overlay 1.1 document with update, copy, and remove actions", async () => {
    const loaded = await loadOverlayInputs(packageRoot);
    expect(loaded.overlay).toMatchObject({
      overlay: "1.1.0",
      extends: "./upstream.json",
      info: {
        title: expect.any(String),
        version: expect.any(String),
      },
    });
    expect(
      new Set(
        loaded.overlay.actions.flatMap((action) =>
          ["update", "copy", "remove"].filter((key) =>
            Object.hasOwn(action, key),
          ),
        ),
      ),
    ).toEqual(new Set(["update", "copy", "remove"]));

    const testOverlay: OverlayDocument = {
      overlay: "1.1.0",
      info: { title: "test", version: "1" },
      extends: "./upstream.json",
      actions: [
        {
          "x-action-id": "update",
          "x-finding-id": "test",
          target: "$.target",
          update: { added: true },
        },
        {
          "x-action-id": "copy",
          "x-finding-id": "test",
          target: "$.target",
          copy: "$.source",
        },
        {
          "x-action-id": "remove",
          "x-finding-id": "test",
          target: "$.obsolete",
          remove: true,
        },
      ],
    };
    await expect(
      applyFormalOverlay(
        {
          source: { copied: true },
          target: {},
          obsolete: true,
        },
        testOverlay,
      ),
    ).resolves.toEqual({
      source: { copied: true },
      target: { added: true, copied: true },
    });
  });

  it("extracts only the six Core GET operations", () => {
    const paths = Object.fromEntries(
      CORE_OPERATIONS.map(({ path, operationId }) => [
        path,
        {
          get: {
            operationId,
            responses: {
              "200": {
                content: {
                  "application/json": {
                    schema: {
                      $ref:
                        path === CORE_PATHS[0]
                          ? "#/components/schemas/Outer"
                          : "#/components/schemas/Leaf",
                    },
                  },
                },
              },
            },
          },
          post: {
            operationId: `${operationId}-post`,
            responses: {},
          },
        },
      ]),
    );
    const core = extractCoreDocument({
      openapi: "3.0.2",
      info: { title: "test", version: "1" },
      paths,
      components: {
        schemas: {
          Outer: {
            type: "object",
            properties: {
              inner: { $ref: "#/components/schemas/Inner" },
            },
          },
          Inner: {
            type: "array",
            items: { $ref: "#/components/schemas/Leaf" },
          },
          Leaf: { type: "string" },
          Unused: { type: "number" },
        },
      },
    });

    expect(Object.keys(core.paths as object)).toEqual(CORE_PATHS);
    for (const path of CORE_PATHS) {
      expect((core.paths as JsonObject)[path]).not.toHaveProperty("post");
    }
    expect(
      Object.keys(
        ((core.components as JsonObject).schemas as JsonObject) ?? {},
      ),
    ).toEqual(["Inner", "Leaf", "Outer"]);
  });

  it("fails when a retained schema has an unresolved reference", () => {
    const paths = Object.fromEntries(
      CORE_OPERATIONS.map(({ path, operationId }) => [
        path,
        {
          get: {
            operationId,
            responses: {
              "200": {
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/Missing" },
                  },
                },
              },
            },
          },
        },
      ]),
    );
    expect(() =>
      extractCoreDocument({
        openapi: "3.0.2",
        info: { title: "test", version: "1" },
        paths,
        components: { schemas: {} },
      }),
    ).toThrow("Unresolved OpenAPI reference: #/components/schemas/Missing.");
  });

  it("generates deterministically and offline from the corrected Core document", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("network disabled"));
    const first = await generateArtifacts(source, upstream, overlay, findings);
    const second = await generateArtifacts(source, upstream, overlay, findings);

    expect([...first]).toEqual([...second]);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(first.get("src/generated/sdk.gen.ts")).toContain(
      "export const getTextVersions",
    );
    expect(first.get("src/generated/types.gen.ts")).toContain("tref: string;");
    expect(first.get("src/generated/types.gen.ts")).not.toContain(
      '"/api/texts/versions/{index}"',
    );
    fetchSpy.mockRestore();
  });

  it("identifies changed, missing, and unexpected generated output", () => {
    expect(
      findStaleArtifacts(
        new Map([
          ["same", "value"],
          ["changed", "new"],
          ["missing", "new"],
        ]),
        new Map([
          ["same", "value"],
          ["changed", "old"],
          ["unexpected", "old"],
        ]),
      ),
    ).toEqual(["changed", "missing", "unexpected"]);
  });

  it("uses the exact pinned upstream checksum", () => {
    expect(sha256(upstream)).toBe(source.sha256);
    expect(source).toMatchObject({
      commit: "1f7d0844ca6a9eddc8e48168962aacb09de75bd6",
      sha256:
        "2bd2618411afc668eef1d100da546b04431ce82b984da0ae96823f24a8f890e4",
    });
  });

  it("requires a complete refresh SHA and addresses only its pinned file", () => {
    expect(() => parseCommit(["--commit", "1f7d0844"])).toThrow(
      /complete 40-character SHA/,
    );
    const commit = parseCommit([
      "--commit",
      "1F7D0844CA6A9EDDC8E48168962AACB09DE75BD6",
    ]);
    expect(commit).toBe("1f7d0844ca6a9eddc8e48168962aacb09de75bd6");
    expect(pinnedOpenApiUrl(commit)).toBe(
      "https://raw.githubusercontent.com/Sefaria/Sefaria-Project/1f7d0844ca6a9eddc8e48168962aacb09de75bd6/docs/openAPI.json",
    );
  });

  it("does not change committed inputs when refresh networking fails", async () => {
    const sourcePath = resolve(packageRoot, "openapi/source.json");
    const before = await readFile(sourcePath, "utf8");
    const failure = new TypeError("network unavailable");

    await expect(
      refreshOpenApi(
        "1f7d0844ca6a9eddc8e48168962aacb09de75bd6",
        async () => {
          throw failure;
        },
        packageRoot,
      ),
    ).rejects.toBe(failure);
    expect(await readFile(sourcePath, "utf8")).toBe(before);
  });

  it("rolls back every published output when atomic refresh replacement fails", async () => {
    const temporaryParent = await mkdtemp(
      resolve(tmpdir(), "sefaria-refresh-test-"),
    );
    const temporaryRoot = resolve(temporaryParent, "client");
    await mkdir(temporaryRoot, { recursive: true });
    try {
      await Promise.all([
        cp(resolve(packageRoot, "openapi"), resolve(temporaryRoot, "openapi"), {
          recursive: true,
        }),
        cp(
          resolve(packageRoot, "src/generated"),
          resolve(temporaryRoot, "src/generated"),
          { recursive: true },
        ),
      ]);
      const before = await snapshotRefreshOutputs(temporaryRoot);
      const failure = new Error("simulated atomic publication failure");
      let renameCount = 0;

      await expect(
        refreshOpenApi(
          "a".repeat(40),
          async () =>
            new Response(upstream.slice(), {
              status: 200,
              headers: { "content-type": "application/json" },
            }),
          temporaryRoot,
          {
            renamePath: async (oldPath, newPath) => {
              renameCount += 1;
              if (renameCount === 4) {
                throw failure;
              }
              await rename(oldPath, newPath);
            },
          },
        ),
      ).rejects.toBe(failure);

      expect(renameCount).toBe(4);
      expect(await snapshotRefreshOutputs(temporaryRoot)).toEqual(before);
      expect(
        (await readdir(temporaryParent)).filter((name) =>
          name.startsWith(".sefaria-client-refresh-"),
        ),
      ).toEqual([]);
    } finally {
      await rm(temporaryParent, { recursive: true, force: true });
    }
  });
});

describe("reviewed Core corrections", () => {
  function correctedCore(): JsonObject {
    return JSON.parse(
      artifacts.get("openapi/corrected-core.json") as string,
    ) as JsonObject;
  }

  it("renames the versions route parameter and JSON content type", () => {
    const core = correctedCore();
    const versions = (core.paths as JsonObject)[
      "/api/texts/versions/{tref}"
    ] as JsonObject;
    expect((versions.parameters as JsonObject[])[0]?.name).toBe("tref");
    const responses = ((versions.get as JsonObject).responses as JsonObject)[
      "200"
    ] as JsonObject;
    expect(Object.keys(responses.content as object)).toEqual([
      "application/json",
    ]);
    expect(
      JSON.stringify(
        ((responses.content as JsonObject)["application/json"] as JsonObject)
          .schema,
      ),
    ).toContain("#/components/schemas/CoreErrorResponse");
    const schemas = (core.components as JsonObject).schemas as JsonObject;
    expect((schemas.VersionJSON as JsonObject).properties).toMatchObject({
      versionSource: { type: "string", nullable: true },
      status: { type: "string", nullable: true },
    });
  });

  it("documents v3 repeatable versions, errors, and nullable recursive text values", () => {
    const core = correctedCore();
    const pathItem = (core.paths as JsonObject)[
      "/api/v3/texts/{tref}"
    ] as JsonObject;
    const operation = pathItem.get as JsonObject;
    expect(Object.keys(operation.responses as object)).toEqual([
      "200",
      "400",
      "404",
    ]);
    expect((pathItem.parameters as JsonObject[])[0]).toMatchObject({
      name: "version",
      schema: { type: "array", items: { type: "string" } },
      style: "form",
      explode: true,
    });
    const schemas = (core.components as JsonObject).schemas as JsonObject;
    const textValue = schemas.CoreV3TextValue as JsonObject;
    expect(textValue).not.toHaveProperty("nullable");
    expect(
      (textValue.oneOf as JsonObject[]).find(
        ({ nullable }) => nullable === true,
      ),
    ).toEqual({
      type: "string",
      nullable: true,
      enum: [null],
    });
    expect(artifacts.get("src/generated/zod.gen.ts")).toContain(
      "zCoreV3TextValue",
    );
    expect(artifacts.get("src/generated/types.gen.ts")).toContain(
      "string | Array<CoreV3TextValue> | null",
    );
    const portable = JSON.parse(
      artifacts.get("openapi/response-schemas.json") as string,
    ) as JsonObject;
    const portableTextValue = (
      ((portable.components as JsonObject).schemas as JsonObject)
        .CoreV3TextValue as JsonObject
    ).oneOf as JsonObject[];
    expect(
      portableTextValue.find(
        (branch) =>
          Array.isArray(branch.type) &&
          (branch.type as JsonValue[]).includes("null"),
      ),
    ).toMatchObject({
      type: ["string", "null"],
      enum: [null],
    });
    expect(artifacts.get("src/generated/zod.gen.ts")).toContain(
      "versionTitle: z.string()",
    );
    expect(
      artifacts.get("src/generated/zod.gen.ts")?.match(/\.strict\(\)/g)?.length,
    ).toBe(2);
  });

  it("models ref parse failure and conditional success fields", () => {
    const core = correctedCore();
    const schemas = (core.components as JsonObject).schemas as JsonObject;
    const response = schemas.CoreRefResponse as JsonObject;
    const failure = (response.oneOf as JsonObject[])[0] as JsonObject;
    expect(
      ((failure.properties as JsonObject).is_ref as JsonObject).enum,
    ).toEqual([false]);
    expect(JSON.stringify(schemas.CoreRefNavigation)).toContain("first_subref");
  });

  it("adds index query options and the HTTP 200 error union", () => {
    const core = correctedCore();
    const operation = (
      (core.paths as JsonObject)["/api/v2/index/{title}"] as JsonObject
    ).get as JsonObject;
    expect(
      (operation.parameters as JsonObject[]).map(({ name }) => name),
    ).toEqual(["title", "with_content_counts", "with_related_topics"]);
    const schemas = (core.components as JsonObject).schemas as JsonObject;
    const index = schemas.CoreIndexResponse as JsonObject;
    expect(JSON.stringify(index)).toContain(
      '"$ref":"#/components/schemas/CoreErrorResponse"',
    );
    const indexSchema = schemas.IndexJSON as JsonObject;
    expect(JSON.stringify(indexSchema)).toContain("firstSectionRef");
    expect(JSON.stringify(indexSchema)).toContain("relatedTopics");
    expect(indexSchema.required).toEqual(["title", "categories", "schema"]);
  });

  it("models shape wire controls and leaf, collapsed, or error records", () => {
    const core = correctedCore();
    const shape = (core.paths as JsonObject)[
      "/api/shape/{title}"
    ] as JsonObject;
    expect((shape.parameters as JsonObject[]).map(({ name }) => name)).toEqual([
      "title",
      "dependents",
    ]);
    expect((shape.parameters as JsonObject[])[1]).toMatchObject({
      schema: { type: "string", enum: ["0", "1"] },
    });
    const text = JSON.stringify(core);
    expect(text).toContain('"CoreShapeLeafRecord"');
    expect(text).toContain('"CoreShapeCollapsedRecord"');
    expect(text).toContain('"CoreShapeRecord"');
    expect(text).toContain('"section"');
    expect(text).not.toContain('"ShapeJSON"');
  });

  it("models link, sheet-link, nullable text, and whole-book error variants", () => {
    const text = artifacts.get("openapi/corrected-core.json") as string;
    expect(text).toContain('"CoreLinkResponse"');
    expect(text).toContain('"CoreSheetLinkObject"');
    expect(text).toContain('"CoreStringArrayOrNull"');
    expect(text).toContain('"CoreLinksErrorResponse"');
    expect(text).toContain('"CoreErrorResponse"');
    expect(text).toContain('"displayedText"');
    expect(text).toContain('"en"');
    expect(text).toContain('"he"');
    expect(text).toContain('"400"');
    const core = correctedCore();
    const links = (core.paths as JsonObject)["/api/links/{tref}"] as JsonObject;
    expect(
      ((links.get as JsonObject).parameters as JsonObject[])[2] as JsonObject,
    ).toMatchObject({
      name: "category",
      schema: { type: "array", items: { type: "string" } },
      style: "form",
      explode: true,
    });
  });
});
