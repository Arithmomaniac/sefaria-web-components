import { describe, expect, it } from "vitest";

import { findUndocumentedDeclarations } from "../scripts/check-api-docs.mjs";

describe("emitted API documentation check", () => {
  it("accepts documented declarations and members", () => {
    const source = [
      "/** Describes the public interface. */",
      "export interface PublicInterface {",
      "  /** Describes the property. */",
      "  property: string;",
      "}",
      "/** Describes the public class. */",
      "export declare class PublicClass {",
      "  #private;",
      "  /** Describes the class property. */",
      "  property: string;",
      "}",
      "/** Describes the public function. */",
      "export declare function publicFunction(): string;",
    ].join("\n");

    expect(findUndocumentedDeclarations("documented.d.ts", source)).toEqual([]);
  });

  it("reports undocumented exported declarations and members", () => {
    const source = [
      "export interface PublicInterface {",
      "  property: string;",
      "}",
      "export declare class PublicClass {",
      "  property: string;",
      "}",
      "export declare function publicFunction(): string;",
    ].join("\n");

    expect(findUndocumentedDeclarations("undocumented.d.ts", source)).toEqual([
      { line: 1, name: "PublicInterface" },
      { line: 2, name: "property" },
      { line: 4, name: "PublicClass" },
      { line: 5, name: "property" },
      { line: 7, name: "publicFunction" },
    ]);
  });

  it("checks local declarations exported through a named export", () => {
    const source = [
      "declare function publicFunction(): string;",
      "export { publicFunction };",
    ].join("\n");

    expect(findUndocumentedDeclarations("named-export.d.ts", source)).toEqual([
      { line: 1, name: "publicFunction" },
    ]);
  });

  it("rejects malformed declaration output", () => {
    expect(() =>
      findUndocumentedDeclarations(
        "malformed.d.ts",
        "export interface Broken {",
      ),
    ).toThrow("Could not parse malformed.d.ts");
  });
});
