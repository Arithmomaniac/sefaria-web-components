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
  it("annotates one source-backed payload on the JSON problem slide", async () => {
    const [index, fixture] = await Promise.all([
      readFile(path.join(showcase, "index.html"), "utf8"),
      readFile(
        path.join(
          repository,
          "packages",
          "client",
          "test",
          "fixtures",
          "v3-connections-genesis-target-2026-09-06.json",
        ),
        "utf8",
      ),
    ]);
    const payload = JSON.parse(fixture) as {
      versions: Array<{
        versionTitle: string;
        isSource: boolean;
        isPrimary: boolean;
        text: string;
      }>;
    };
    const english = payload.versions.find(
      (version) =>
        version.versionTitle === "THE JPS TANAKH: Gender-Sensitive Edition",
    );

    expect(english?.isSource).toBe(false);
    expect(english?.isPrimary).toBe(false);
    expect(english?.text).toContain('<sup class="footnote-marker">b</sup>');
    expect(english?.text).toContain('<i class="footnote">');
    expect(index).toContain('class="annotated-payload"');
    expect(index).toContain('data-annotation="markup"');
    expect(index).toContain('data-annotation="schema"');
    expect(index).toContain('data-annotation="roles"');
    expect(index).toContain("footnote-marker");
    expect(index).toContain('"versionSource": null');
    expect(index).toContain("Composed from two captured responses");
    expect(index).toContain("nested arrays, or null");
    expect(index).toContain("missing editions can return selector");
    expect(index).toContain("responsive layout, keyboard and focus behavior");
    expect(index).toContain("themes,");
    expect(index).toContain("loading, and failures");
    expect(index).not.toContain('class="problem-grid"');
  });

  it("uses the approved narrative and places actual component source before the delivered path", async () => {
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
    expect(index).toMatch(
      /<section id="component-source"[\s\S]*<section id="client"/,
    );
    expect(index).toContain("<h2>The component we are going to deliver</h2>");
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
      index.matchAll(/<section id="([^"]+)"/g),
      (match) => match[1],
    );

    expect(ids).toEqual([
      "title",
      "what-is-sefaria",
      "ecosystem",
      "problem",
      "component-source",
      "client",
      "view-model",
      "element",
      "all-together",
      "source-card",
      "interactions",
      "linker",
      "mcp",
      "close",
    ]);
    expect(index.match(/<aside class="notes">/g)).toHaveLength(ids.length);
  });

  it("presents the supported reader separately from manual component composition", async () => {
    const index = await readFile(path.join(showcase, "index.html"), "utf8");

    expect(index).toMatch(
      /<section id="source-card">[\s\S]*data-demo="reader"[\s\S]*data-title="Supported reader"/,
    );
    expect(index).toMatch(
      /<section id="interactions">[\s\S]*data-demo="manual-reader"[\s\S]*data-title="Spatial source and connections workflow"/,
    );
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
    const main = await readFile(path.join(showcase, "src", "main.tsx"), "utf8");

    expect(main).toContain("./media/mcp-reader.png");
    expect(main).toContain("./media/mcp-reader-hierarchy.png");
    expect(main).toContain("./media/mcp-reader-chat-export.png");
    expect(main).not.toContain("./media/mcp-source-card.png");
    expect(main).toContain("recorded in VS Code");
    expect(main).toContain("mouseWheel: false");
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
