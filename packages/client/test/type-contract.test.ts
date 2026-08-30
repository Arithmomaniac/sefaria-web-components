import { createClient } from "@hey-api/client-fetch";
import type { z } from "zod";
import { describe, expect, expectTypeOf, it } from "vitest";

import {
  createSefariaClient,
  getIndexV2,
  getLinks,
  getRef,
  getShape,
  getTextVersions,
  getV3Texts,
  type CoreErrorResponse,
  type CoreLinkResponse,
  type CoreShapeChapter,
  type CoreShapeCollapsedRecord,
  type CoreShapeLeafRecord,
  type CoreStringArrayOrNull,
  type CoreV3TextValue,
  type GetLinksErrors,
  type GetLinksData,
  type GetLinksResponses,
  type GetShapeData,
  type GetTextVersionsData,
  type GetV3TextsData,
  type GetVersionsData,
  type GetVersionsResponses,
  type VersionJson,
  type zCoreShapeChapter,
  type zCoreShapeCollapsedRecord,
  type zCoreShapeLeafRecord,
  type zCoreStringArrayOrNull,
  type zCoreV3TextValue,
} from "../src/index.js";

describe("generated request and response contracts", () => {
  it("exposes the six named Core SDK functions", () => {
    expect([
      getV3Texts,
      getTextVersions,
      getRef,
      getIndexV2,
      getShape,
      getLinks,
    ]).toHaveLength(6);
  });

  it("uses tref and typed query arguments", () => {
    const client = createSefariaClient();
    const unsafeClient = createClient();
    const compileRequests = () => {
      void getTextVersions({
        client,
        path: { tref: "Genesis 1:1" },
      });
      void getV3Texts({
        client,
        path: { tref: "Genesis 1:1" },
        query: { version: ["hebrew", "english|Test Version"] },
      });
      void getIndexV2({
        client,
        path: { title: "Genesis" },
        query: {
          with_content_counts: "1",
          with_related_topics: "0",
        },
      });
      void getLinks({
        client,
        path: { tref: "Genesis 1:1" },
        query: {
          category: ["Commentary", "Midrash"],
          with_sheet_links: "1",
          with_text: "0",
        },
      });
      void getShape({
        client,
        path: { title: "Tanakh" },
        query: { dependents: "1" },
      });
      void getShape({
        client,
        path: { title: "Tanakh" },
        query: {
          // @ts-expect-error depth is a deprecated no-op and is not exposed.
          depth: 2,
        },
      });

      void getTextVersions({
        client,
        path: {
          // @ts-expect-error The corrected path parameter is tref, not index.
          index: "Genesis",
        },
      });
      void getRef({
        // @ts-expect-error SDK functions require the validated branded client.
        client: unsafeClient,
        path: { tref: "Genesis 1:1" },
      });
      void getRef({
        client,
        path: { tref: "Genesis 1:1" },
        // @ts-expect-error Generated return types require fields response style.
        responseStyle: "data",
      });
      void getRef({
        client,
        path: { tref: "Genesis 1:1" },
        // @ts-expect-error Callers cannot replace generated response validators.
        responseValidator: (value: unknown) => value,
      });
      void getRef({
        client,
        path: { tref: "Genesis 1:1" },
        // @ts-expect-error SDK functions always parse documented JSON.
        parseAs: "text",
      });
      void getRef({
        client,
        path: { tref: "Genesis 1:1" },
        // @ts-expect-error SDK functions return validated contract values.
        responseTransformer: async (value: unknown) => value,
      });
      // @ts-expect-error The public client does not expose mutable configuration.
      client.setConfig({ responseStyle: "data" });
    };
    expect(compileRequests).toBeTypeOf("function");
    expectTypeOf<GetVersionsData>().toMatchTypeOf<{
      path: { tref: string };
    }>();
    expectTypeOf<GetTextVersionsData>().toEqualTypeOf<GetVersionsData>();
    expectTypeOf<
      NonNullable<GetV3TextsData["query"]>["version"]
    >().toEqualTypeOf<string[] | undefined>();
    expectTypeOf<
      NonNullable<GetShapeData["query"]>["dependents"]
    >().toEqualTypeOf<"0" | "1" | undefined>();
    expectTypeOf<
      NonNullable<GetLinksData["query"]>["category"]
    >().toEqualTypeOf<string[] | undefined>();
  });

  it("preserves generated success and documented error status types", () => {
    expectTypeOf<GetLinksResponses[200]>().toEqualTypeOf<CoreLinkResponse>();
    expectTypeOf<GetVersionsResponses[200]>().toEqualTypeOf<
      VersionJson[] | CoreErrorResponse
    >();
    expectTypeOf<GetLinksErrors[400]>().toMatchTypeOf<{
      error: string;
      ref: string;
    }>();
  });

  it("preserves recursive public schema inference", () => {
    expectTypeOf<
      z.infer<typeof zCoreStringArrayOrNull>
    >().toEqualTypeOf<CoreStringArrayOrNull>();
    expectTypeOf<
      z.infer<typeof zCoreV3TextValue>
    >().toEqualTypeOf<CoreV3TextValue>();
    expectTypeOf<
      z.infer<typeof zCoreShapeChapter>
    >().toEqualTypeOf<CoreShapeChapter>();
    expectTypeOf<
      z.infer<typeof zCoreShapeLeafRecord>
    >().toEqualTypeOf<CoreShapeLeafRecord>();
    expectTypeOf<
      z.infer<typeof zCoreShapeCollapsedRecord>
    >().toEqualTypeOf<CoreShapeCollapsedRecord>();
  });
});
