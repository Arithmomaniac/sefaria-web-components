import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  markdownAnchors,
  validateMarkdownLinks,
} from "../scripts/markdown-links.mjs";

const root = path.resolve(import.meta.dirname, "..");
const journey = [
  "README.md",
  "docs/README.md",
  "docs/learn/01-web-components.md",
  "docs/learn/02-supplied-data.md",
  "docs/learn/03-live-data.md",
  "docs/learn/react.md",
  "docs/learn/04-reader.md",
  "docs/learn/05-customization.md",
  "docs/learn/06-host-integration.md",
  "examples/README.md",
  "examples/react-vite/README.md",
];

describe("GitHub Markdown file and anchor parity", () => {
  it("keeps the maintained learning journey on real repository targets", async () => {
    expect(await validateMarkdownLinks(root, journey)).toEqual([]);
  });

  it("rejects broken files and anchors but ignores code-fence examples", async () => {
    const fixtureRoot = await mkdtemp(path.join(tmpdir(), "markdown-links-"));
    await mkdir(path.join(fixtureRoot, "docs"));
    await writeFile(
      path.join(fixtureRoot, "README.md"),
      [
        "[Good](docs/guide.md#try-it)",
        "[Missing file](docs/missing.md)",
        "[Missing anchor](docs/guide.md#not-there)",
        '<a href="docs/html-missing.md">HTML missing</a>',
        "[Reference missing][missing]",
        "[missing]: docs/reference-missing.md",
        "```markdown",
        "[Illustrative only](docs/not-a-real-file.md)",
        "```",
      ].join("\n"),
    );
    await writeFile(
      path.join(fixtureRoot, "docs", "guide.md"),
      "# Guide\n\n## Try it\n",
    );

    expect(await validateMarkdownLinks(fixtureRoot, ["README.md"])).toEqual([
      "README.md: missing target docs/missing.md",
      "README.md: missing anchor docs/guide.md#not-there",
      "README.md: missing target docs/reference-missing.md",
      "README.md: missing target docs/html-missing.md",
    ]);
  });

  it("matches GitHub-style duplicate heading suffixes", () => {
    expect(markdownAnchors("# Guide\n\n## Try it\n\n## Try it\n")).toEqual(
      new Set(["guide", "try-it", "try-it-1"]),
    );
  });
});
