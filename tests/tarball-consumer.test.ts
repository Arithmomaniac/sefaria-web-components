import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repository = path.resolve(import.meta.dirname, "..");

describe("tarball-only consumer harness", () => {
  it("maps every internal toolkit package to an exact file tarball", async () => {
    const source = await readFile(
      path.join(repository, "scripts", "test-tarball-consumer.mjs"),
      "utf8",
    );

    for (const packageName of [
      "@sefaria/client",
      "@sefaria/text-transform",
      "@sefaria/web-components",
    ]) {
      expect(source).toContain(JSON.stringify(packageName));
    }
    expect(source).toContain("pnpm-lock.yaml");
    expect(source).toContain("realpath");
    expect(source).toContain("tarballs");
  });
});
