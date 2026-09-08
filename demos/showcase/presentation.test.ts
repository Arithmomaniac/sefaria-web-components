import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  textSegmentElementDeclarationSource,
  textSegmentElementRenderSource,
} from "./src/example-source.js";

const showcase = import.meta.dirname;
const repository = path.resolve(showcase, "..", "..");

describe("showcase reader presentation", () => {
  it("annotates four practical JSON-to-UI problems on one real response", async () => {
    const index = await readFile(path.join(showcase, "index.html"), "utf8");

    expect(index).toContain("This is what Sefaria returns.");
    expect(index).toContain("What stands between this response and usable UI?");
    expect(index).toContain("Isaiah 1:17–2:1");
    expect(index).toContain('"actualLanguage": "en"');
    expect(index).toContain('"direction": "ltr"');
    expect(index).toContain("poetry indentAll");
    expect(index).toContain("footnote-marker");
    expect(index.match(/<article class="problem-card /g)).toHaveLength(4);
    expect(index).toContain("Validate changing shapes");
    expect(index).toContain("Interpret reading roles");
    expect(index).toContain("Prepare structured text");
    expect(index).toContain("Build the reading experience");
    expect(index.match(/class="payload-marker/g)).toHaveLength(3);
    expect(index.match(/class="problem-card-marker/g)).toHaveLength(4);
    expect(index).toContain('"text": [[');
    expect(index).not.toContain("Not in the response");
    expect(index).toContain(
      "Another reference can return nested arrays, nulls, missing",
    );
    expect(index).toContain(
      "Language, source, translation, direction, and attribution",
    );
    expect(index).toContain(
      "Sanitize markup, preserve poetry, and pair footnote",
    );
    expect(index).toContain(
      "Responsive layout, keyboard and focus behavior, loading,",
    );
    expect(index).not.toContain("versionSource");
    expect(index).not.toContain("Composed from two captured responses");
  });

  it("uses the approved narrative and ends the path inside the Web Component", async () => {
    const [index, element] = await Promise.all([
      readFile(path.join(showcase, "index.html"), "utf8"),
      readFile(
        path.join(
          repository,
          "packages",
          "components",
          "src",
          "text-segment-element.ts",
        ),
        "utf8",
      ),
    ]);

    expect(index).toContain("<h2>A living library of Jewish texts</h2>");
    expect(index.indexOf('id="element"')).toBeLessThan(
      index.indexOf('id="component-source"'),
    );
    expect(index.indexOf('id="component-source"')).toBeLessThan(
      index.indexOf('id="all-together"'),
    );
    expect(index).toContain("<h2>Inside the Web Component</h2>");
    expect(index).not.toContain('class="source-principles"');
    expect(index).toContain(
      "<h2>A Sefaria reading surface, wherever you read</h2>",
    );
    expect(index).toContain(
      "<h2>The same Reader UI, delivered as an MCP App</h2>",
    );
    expect(index).not.toContain("Bring the same Reader into Copilot Chat");

    const normalize = (value: string) => value.replace(/\s+/g, " ").trim();
    for (const source of [
      textSegmentElementDeclarationSource,
      textSegmentElementRenderSource,
    ]) {
      expect(normalize(element)).toContain(normalize(source));
    }
  });

  it("keeps fourteen stable, noted slides", async () => {
    const index = await readFile(path.join(showcase, "index.html"), "utf8");
    const ids = Array.from(
      index.matchAll(/<section\s+[^>]*id="([^"]+)"/g),
      (match) => match[1],
    );

    expect(ids).toEqual([
      "title",
      "what-is-sefaria",
      "ecosystem",
      "problem",
      "client",
      "view-model",
      "element",
      "component-source",
      "all-together",
      "source-card",
      "interactions",
      "linker",
      "mcp",
      "close",
    ]);
    expect(index.match(/<aside class="notes">/g)).toHaveLength(ids.length);
  });

  it("presents packaged composition separately from custom composition", async () => {
    const index = await readFile(path.join(showcase, "index.html"), "utf8");

    expect(index).toMatch(
      /<section id="source-card">[\s\S]*data-demo="reader"[\s\S]*data-title="Prebuilt component composition"/,
    );
    expect(index).toContain("<h2>We package composed components</h2>");
    expect(index).toContain("Example: prebuilt Reader");
    expect(index).toMatch(
      /<section id="interactions">[\s\S]*data-demo="manual-reader"[\s\S]*data-title="Spatial source and connections workflow"/,
    );
    expect(index).toContain("<h2>Compose the behavior your host needs</h2>");
    expect(index).toContain("Example: custom Reader workflow");
  });

  it("uses one Sefaria reader capture and two readable ecosystem examples", async () => {
    const index = await readFile(path.join(showcase, "index.html"), "utf8");

    expect(index).toMatch(
      /<section id="what-is-sefaria"[^>]*>[\s\S]*sefaria-reader-commentary\.png/,
    );
    expect(index).not.toContain("sefaria-library.png");
    expect(index).toMatch(
      /<section id="ecosystem">[\s\S]*class="[^"]*ecosystem-grid[^"]*"/,
    );
    expect(
      index
        .match(/<section id="ecosystem">[\s\S]*?<\/section>/)?.[0]
        .match(/<figure>/g),
    ).toHaveLength(2);
    expect(index).toContain("talmud-page.png");
    expect(index).toContain("tikkun.png");
    expect(index).not.toContain("torah-research-board.png");
    expect(index).not.toContain("bekiut.png");
    expect(index).not.toContain("lishkod.png");
  });

  it("reuses the spatial reader workspace for the manual interaction slide", async () => {
    const [
      main,
      workspacePreview,
      workspaceHost,
      workspaceStyles,
      examples,
      vite,
    ] = await Promise.all([
      readFile(path.join(showcase, "src", "main.tsx"), "utf8"),
      readFile(path.join(showcase, "workspace-preview.html"), "utf8"),
      readFile(path.join(showcase, "src", "workspace-preview.ts"), "utf8"),
      readFile(
        path.join(repository, "demos", "reader-workspace", "src", "style.css"),
        "utf8",
      ),
      readFile(path.join(showcase, "src", "example-source.ts"), "utf8"),
      readFile(path.join(showcase, "vite.config.ts"), "utf8"),
    ]);

    expect(main).toMatch(
      /kind === "manual-reader"\s+\? "\.\/workspace-preview\.html"/,
    );
    expect(workspacePreview).toContain('id="workspace"');
    expect(workspacePreview).toContain('name="tref"');
    expect(workspacePreview).toContain('id="host-error"');
    expect(workspacePreview).toContain('data-component-shape="square"');
    expect(workspaceHost).toContain("startReaderWorkspace(document)");
    expect(workspaceStyles).toMatch(
      /\[data-component-shape="square"\]\s*\{[\s\S]*--sefaria-panel-radius:\s*0;[\s\S]*--sefaria-control-radius:\s*0;/,
    );
    expect(workspaceStyles).toMatch(
      /:root\[data-theme="light"\]\s*\{\s*color-scheme:\s*light;/,
    );
    expect(workspaceStyles).toMatch(
      /:root\[data-theme="dark"\]\s*\{\s*color-scheme:\s*dark;/,
    );
    expect(examples).toContain('"--sefaria-panel-radius", "0"');
    expect(examples).toContain('"--sefaria-control-radius", "0"');
    expect(vite).toContain('workspace: "workspace-preview.html"');
  });

  it("gives the supported reader the preview viewport without page gutters", async () => {
    const [preview, styles] = await Promise.all([
      readFile(path.join(showcase, "src", "preview.tsx"), "utf8"),
      readFile(path.join(showcase, "src", "styles.css"), "utf8"),
    ]);

    expect(preview).toContain('className="demo-page reader-demo-page"');
    expect(styles).toMatch(
      /\.reader-demo-page\s*\{[\s\S]*height:\s*100vh;[\s\S]*overflow:\s*hidden;/,
    );
    expect(styles).toMatch(
      /\.reader-demo-page \.demo-reader-result\s*\{[\s\S]*padding:\s*0;[\s\S]*overflow:\s*hidden;/,
    );
    expect(styles).toMatch(
      /\.reader-demo-page \.demo-reader-result > sefaria-reader\s*\{[\s\S]*display:\s*grid;[\s\S]*height:\s*100%;/,
    );
    expect(styles).toMatch(
      /\.reveal \.slides section:has\(\.demo-workbench\)\s*\{[\s\S]*padding-inline-end:/,
    );
  });

  it("uses integrated reader captures for the MCP gallery", async () => {
    const [index, main, capture] = await Promise.all([
      readFile(path.join(showcase, "index.html"), "utf8"),
      readFile(path.join(showcase, "src", "main.tsx"), "utf8"),
      readFile(
        path.join(
          repository,
          "demos",
          "mcp",
          "scripts",
          "capture-vscode-host.ts",
        ),
        "utf8",
      ),
    ]);

    expect(main).toContain("./media/mcp-reader.png");
    expect(main).toContain("./media/mcp-reader-hierarchy.png");
    expect(main).toContain("./media/mcp-reader-chat-export.png");
    expect(main).not.toContain("./media/mcp-source-card.png");
    expect(main).toContain("mouseWheel: false");
    const prompt =
      "Show me Micah 6:8 in Hebrew and English as an interactive Sefaria reader.";
    expect(capture).toContain(
      "`Show me ${CONNECTIONS_REFERENCE} in Hebrew and English as an interactive Sefaria reader.`",
    );
    expect(index.replace(/\s+/g, " ")).toContain(`Prompt: “${prompt}”`);
  });

  it("installs a deck-only minimum viewport guard", async () => {
    const [index, guard] = await Promise.all([
      readFile(path.join(showcase, "index.html"), "utf8"),
      readFile(path.join(showcase, "src", "viewport-guard.ts"), "utf8"),
    ]);

    expect(index).toContain('id="viewport-warning"');
    expect(index).toContain("data-required-viewport");
    expect(index).toContain("data-current-viewport");
    expect(guard).toContain("minimumDeckViewport");
    expect(guard).toContain("width: 1440");
    expect(guard).toContain("height: 900");
  });

  it("allows the MCP reader to use a wide side-by-side surface", async () => {
    const app = await readFile(
      path.join(repository, "demos", "mcp", "app", "mcp-app.html"),
      "utf8",
    );

    expect(app).toContain("width: min(100%, 90rem)");
    expect(app).not.toContain("max-width: 48rem");
  });
});
