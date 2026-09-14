import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repository = path.resolve(import.meta.dirname, "..");

describe("private Changesets configuration", () => {
  it("versions exactly the three libraries as a fixed private group", async () => {
    const config = JSON.parse(
      await readFile(
        path.join(repository, ".changeset", "config.json"),
        "utf8",
      ),
    ) as {
      baseBranch: string;
      commit: boolean;
      fixed: string[][];
      privatePackages: { version: boolean; tag: boolean };
    };

    expect(config).toMatchObject({
      baseBranch: "feature/avilevin/frontend-toolkit-alpha",
      commit: false,
      privatePackages: { version: true, tag: false },
    });
    expect(config.fixed).toEqual([
      ["@sefaria/client", "@sefaria/text-transform", "@sefaria/web-components"],
    ]);
  });
});
