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
  type GetLinksErrors,
  type GetLinksData,
  type GetLinksResponses,
  type GetShapeData,
  type GetTextVersionsData,
  type GetV3TextsData,
  type GetVersionsData,
  type GetVersionsResponses,
  type VersionJson,
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
});
