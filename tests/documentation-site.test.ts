import { access, readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "..");
const lessons = [
  "01-web-components.md",
  "02-supplied-data.md",
  "03-live-data.md",
  "04-reader.md",
  "05-customization.md",
  "06-host-integration.md",
];

describe("documentation learning journey", () => {
  it.each(lessons)("%s remains complete on GitHub", async (lesson) => {
    const markdown = await readFile(
      path.join(root, "docs", "learn", lesson),
      "utf8",
    );

    for (const heading of [
      "## Objective",
      "## Prerequisites",
      "## Try it",
      "## Expected result",
      "## Who owns what",
      "## Exercise",
      "## Source and run links",
      "## Next step",
    ]) {
      expect(markdown).toContain(heading);
    }
    expect(markdown).toMatch(/```(?:ts|tsx|powershell|html)/);
    expect(markdown).not.toMatch(/\]\(\/examples\//);
  });

  it("keeps the built site and source links on maintained destinations", async () => {
    const index = await readFile(path.join(root, "docs", "index.md"), "utf8");
    const config = await readFile(
      path.join(root, "docs", ".vitepress", "config.ts"),
      "utf8",
    );

    expect(index).toContain("Development preview");
    expect(config).toContain(
      '"https://github.com/Arithmomaniac/sefaria-web-components"',
    );
    expect(config).toContain(
      'const branch = "feature/avilevin/frontend-toolkit-alpha"',
    );
    expect(config).toContain(
      "pattern: `${repository}/edit/${branch}/docs/:path`",
    );
    expect(config).not.toContain("github.io");
  });

  it("builds distinct example files instead of fallback responses", async () => {
    const site = path.join(root, "dist", "site");
    for (const relativePath of [
      "index.html",
      "learn/02-supplied-data.html",
      "examples/explorer/authored.html",
      "examples/reader/controlled.html",
      "examples/react/index.html",
      "examples/mcp-app/index.html",
    ]) {
      await expect(
        access(path.join(site, relativePath)),
      ).resolves.toBeUndefined();
    }

    const authored = await readFile(
      path.join(site, "examples", "explorer", "authored.html"),
      "utf8",
    );
    const source = await readFile(
      path.join(
        root,
        "examples",
        "explorer",
        "src",
        "authored",
        "development-status.ts",
      ),
      "utf8",
    );
    expect(source).toContain(
      "github.com/Arithmomaniac/sefaria-web-components/blob/feature/avilevin/frontend-toolkit-alpha/",
    );
    expect(authored).not.toContain('href="/src/');
  });

  it("does not retain active presentation assembly", async () => {
    await expect(
      access(path.join(root, "demos", "showcase")),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });
});
