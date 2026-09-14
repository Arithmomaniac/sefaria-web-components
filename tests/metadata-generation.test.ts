import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repository = path.resolve(import.meta.dirname, "..");

describe("generated public metadata", () => {
  it("describes every registered element without analyzer placeholder events", async () => {
    const manifest = JSON.parse(
      await readFile(
        path.join(repository, "packages/web-components/custom-elements.json"),
        "utf8",
      ),
    ) as {
      modules: Array<{
        path: string;
        declarations?: Array<{
          tagName?: string;
          events?: Array<{ name: string }>;
          slots?: unknown[];
          cssParts?: unknown[];
          cssProperties?: Array<{ name: string }>;
        }>;
      }>;
    };
    for (const module of manifest.modules) {
      expect(module.path).toMatch(/^dist\/.+\.js$/u);
    }
    const elements = manifest.modules
      .flatMap((module) => module.declarations ?? [])
      .filter((declaration) => declaration.tagName !== undefined);

    expect(elements.map((element) => element.tagName).sort()).toEqual([
      "sefaria-bilingual-segment",
      "sefaria-connections-panel",
      "sefaria-popup",
      "sefaria-reader",
      "sefaria-ref-label",
      "sefaria-source-card",
      "sefaria-text-segment",
    ]);
    expect(
      elements.flatMap((element) =>
        (element.events ?? []).map((event) => event.name),
      ),
    ).not.toContain("name");
    for (const element of elements) {
      expect(element.slots).toEqual([]);
      expect(element.cssParts).toEqual([]);
      expect(element.cssProperties?.length).toBeGreaterThan(10);
    }
  });

  it("publishes declaration-derived inventory for all 18 supported subpaths", async () => {
    const inventory = JSON.parse(
      await readFile(
        path.join(repository, "packages/public-exports.json"),
        "utf8",
      ),
    ) as {
      packages: Array<{ exports: Array<{ declarations: string[] }> }>;
    };

    expect(
      inventory.packages.reduce(
        (count, packageEntry) => count + packageEntry.exports.length,
        0,
      ),
    ).toBe(18);
    for (const packageEntry of inventory.packages) {
      for (const exportEntry of packageEntry.exports) {
        expect(exportEntry.declarations.length).toBeGreaterThan(0);
      }
    }
  });
});
