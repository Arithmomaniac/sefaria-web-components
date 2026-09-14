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
  "react.md",
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

  it("keeps supplied-data and React teaching aligned with maintained source", async () => {
    const suppliedLesson = await readFile(
      path.join(root, "docs", "learn", "02-supplied-data.md"),
      "utf8",
    );
    const vanillaSource = await readFile(
      path.join(root, "examples", "vanilla-vite", "src", "main.ts"),
      "utf8",
    );
    expect(suppliedLesson).toContain("createSourceCardViewModel(validated, {");
    expect(vanillaSource).toContain(
      "createSourceCardViewModel(validatedPayload, {",
    );
    expect(vanillaSource).toContain(
      'updateStatus("Rendered supplied Micah 6:8 data with zero requests.")',
    );
    expect(suppliedLesson).toContain("pnpm-workspace.yaml");
    expect(suppliedLesson).not.toContain('"pnpm": {\n    "overrides"');

    const reactLesson = await readFile(
      path.join(root, "docs", "learn", "react.md"),
      "utf8",
    );
    const reactSource = await readFile(
      path.join(root, "examples", "react-vite", "src", "app.tsx"),
      "utf8",
    );
    const declarations = await readFile(
      path.join(root, "examples", "react-vite", "src", "custom-elements.d.ts"),
      "utf8",
    );
    for (const sourceFragment of [
      'useElementProperty(cardRef, "selectable", viewModel.state === "data")',
      'previous.removeEventListener("sefaria-source-select"',
      "controller.current?.abort()",
      "setSelected({",
    ]) {
      expect(reactSource).toContain(sourceFragment);
      expect(reactLesson).toContain(sourceFragment);
    }
    expect(declarations).toContain('"sefaria-source-card"');
    expect(reactLesson).toContain('"sefaria-source-card"');
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

  it("keeps the committed lockfile independent of local registry mirrors", async () => {
    const lockfile = await readFile(path.join(root, "pnpm-lock.yaml"), "utf8");
    expect(lockfile).not.toMatch(/tarball:\s+https?:\/\//);
    expect(lockfile).not.toContain("pkgs.visualstudio.com");
    expect(lockfile).not.toContain("packagefeedproxy.microsoft.io");
  });
});
