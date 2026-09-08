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
  it("grounds four JSON-to-UI problems in one representative response", async () => {
    const index = await readFile(path.join(showcase, "index.html"), "utf8");

    expect(index).toContain("Isaiah 1:17–2:1");
    expect(index).toContain('"actualLanguage": "en"');
    expect(index).toContain('"direction": "ltr"');
    expect(index).toContain("poetry indentAll");
    expect(index).toContain("footnote-marker");
    expect(index.match(/<article class="problem-card /g)).toHaveLength(4);
    expect(index.match(/class="payload-marker/g)).toHaveLength(3);
    expect(index.match(/class="problem-card-marker/g)).toHaveLength(4);
    expect(index).toContain('"text": [[');
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

    expect(index.indexOf('id="element"')).toBeLessThan(
      index.indexOf('id="component-source"'),
    );
    expect(index.indexOf('id="component-source"')).toBeLessThan(
      index.indexOf('id="all-together"'),
    );
    expect(index).not.toContain('class="source-principles"');
    expect(index).not.toContain("Bring the same Reader into Copilot Chat");

    const normalize = (value: string) => value.replace(/\s+/g, " ").trim();
    for (const source of [
      textSegmentElementDeclarationSource,
      textSegmentElementRenderSource,
    ]) {
      expect(normalize(element)).toContain(normalize(source));
    }
  });

  it("keeps every slide noted and the product journey ordered", async () => {
    const index = await readFile(path.join(showcase, "index.html"), "utf8");
    const ids = Array.from(
      index.matchAll(/<section\s+[^>]*id="([^"]+)"/g),
      (match) => match[1],
    );

    expect(ids.indexOf("problem")).toBeLessThan(ids.indexOf("client"));
    expect(ids.indexOf("client")).toBeLessThan(ids.indexOf("view-model"));
    expect(ids.indexOf("view-model")).toBeLessThan(ids.indexOf("element"));
    expect(ids.indexOf("source-card")).toBeLessThan(
      ids.indexOf("interactions"),
    );
    expect(ids.indexOf("interactions")).toBeLessThan(ids.indexOf("linker"));
    expect(ids.indexOf("linker")).toBeLessThan(ids.indexOf("mcp"));
    expect(index.match(/<aside class="notes">/g)).toHaveLength(ids.length);
  });

  it("presents packaged composition separately from custom composition", async () => {
    const index = await readFile(path.join(showcase, "index.html"), "utf8");

    expect(index).toMatch(
      /<section id="source-card">[\s\S]*data-demo="reader"[\s\S]*data-title="Prebuilt component composition"/,
    );
    expect(index).toMatch(
      /<section id="interactions">[\s\S]*data-demo="manual-reader"[\s\S]*data-title="Spatial source and connections workflow"/,
    );
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
    const [main, workspacePreview, workspaceHost, vite, preview] =
      await Promise.all([
        readFile(path.join(showcase, "src", "main.tsx"), "utf8"),
        readFile(path.join(showcase, "workspace-preview.html"), "utf8"),
        readFile(path.join(showcase, "src", "workspace-preview.ts"), "utf8"),
        readFile(path.join(showcase, "vite.config.ts"), "utf8"),
        readFile(path.join(showcase, "src", "preview.tsx"), "utf8"),
      ]);

    expect(main).toMatch(
      /kind === "manual-reader"\s+\? "\.\/workspace-preview\.html"/,
    );
    expect(workspacePreview).toContain('id="workspace"');
    expect(workspacePreview).toContain('name="tref"');
    expect(workspacePreview).toContain('id="host-error"');
    expect(workspacePreview).toContain('data-component-shape="square"');
    expect(workspaceHost).toContain("startReaderWorkspace(document)");
    expect(vite).toContain('workspace: "workspace-preview.html"');
    expect(preview).not.toContain("function ManualReaderDemo");
    expect(preview).toContain('if (demo === "manual-reader")');
    expect(preview).toContain('new URL("./workspace-preview.html"');
    expect(preview).toContain("location.replace(target)");
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
