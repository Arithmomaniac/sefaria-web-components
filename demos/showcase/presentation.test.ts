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

  it("uses one four-part technical walkthrough ending inside the Web Component", async () => {
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

    expect(index).toContain('id="pipeline"');
    expect(index).toContain("data-pipeline-experience");
    expect(index).not.toContain('id="client"');
    expect(index).not.toContain('id="view-model"');
    expect(index).not.toContain('id="element"');
    expect(index).not.toContain('id="component-source"');
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

    expect(ids.indexOf("problem")).toBeLessThan(ids.indexOf("all-together"));
    expect(ids.indexOf("all-together")).toBeLessThan(
      ids.indexOf("source-card"),
    );
    expect(ids.indexOf("source-card")).toBeLessThan(ids.indexOf("mcp"));
    expect(ids.indexOf("mcp")).toBeLessThan(ids.indexOf("pipeline"));
    expect(ids.indexOf("pipeline")).toBeLessThan(ids.indexOf("interactions"));
    expect(ids.indexOf("interactions")).toBeLessThan(ids.indexOf("linker"));
    expect(ids.indexOf("linker")).toBeLessThan(ids.indexOf("close"));
    expect(index.match(/<aside class="notes">/g)).toHaveLength(ids.length);
  });

  it("states the user, beneficiary, and request ownership boundaries", async () => {
    const index = await readFile(path.join(showcase, "index.html"), "utf8");
    const normalized = index.replace(/\s+/g, " ");

    expect(normalized).toContain(
      "Developers use the toolkit. People reading and studying Jewish texts benefit",
    );
    expect(normalized).toContain(
      "The supplied controller owns loading and navigation",
    );
    expect(normalized).toContain("the element renders the current view model");
    expect(normalized).toContain(
      "recorded acceptance video from VS Code with Copilot Chat",
    );
    expect(normalized).toContain(
      "Existing Sefaria-powered applications—not adopters of this toolkit",
    );
    expect(normalized).toContain(
      "Sefaria already has a Linker; this rewrite is not a new product feature",
    );
    expect(normalized).toContain(
      "developing and customizing interactive interfaces for educational, personal, and AI applications",
    );
  });

  it("shows complete relationships in the displayed integration samples", async () => {
    const [source, main, preview] = await Promise.all([
      readFile(path.join(showcase, "src", "example-source.ts"), "utf8"),
      readFile(path.join(showcase, "src", "main.tsx"), "utf8"),
      readFile(path.join(showcase, "src", "preview.tsx"), "utf8"),
    ]);

    expect(source).toContain('tref: "Micah 6:8"');
    expect(source).toContain('import "@sefaria/components"');
    expect(source).toContain(
      'const element = document.createElement("sefaria-text-segment")',
    );
    expect(source).toContain("element.viewModel = viewModel");
    expect(source).toContain('document.querySelector("#app")');
    expect(source).toContain("mount.replaceChildren(element)");
    expect(source).toContain("loadReaderController");
    expect(source).toContain("bindReaderController");
    expect(source).toContain("controller.dispose()");
    expect(main).toContain('label: "TypeScript"');
    expect(main).toContain('label: "HTML"');
    expect(main).toContain('label: "Typed client"');
    expect(main).toContain('label: "View-model factory"');
    expect(main).toContain('label: "Host setup"');
    expect(main).toContain('label: "Web Component"');
    expect(main).toContain("Four parts inside one delivered path");
    expect(source).toContain("await loadTextSegmentViewModel");
    expect(source).toContain('message.type !== "sefaria-showcase-active"');
    expect(source).toContain("workspace?.cancelPending()");
    expect(preview).toContain("Load new data");
    expect(preview).toContain("Presentation only · no new request");
    expect(preview).toContain("Load through supplied controller");
    expect(preview).toContain(
      "Library component: <code>&lt;sefaria-reader&gt;</code>",
    );
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

  it("uses the chronological integrated Reader video for the MCP demonstration", async () => {
    const [index, main, capture, video] = await Promise.all([
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
      readFile(path.join(showcase, "public", "media", "mcp-reader-demo.mp4")),
    ]);

    expect(index).toContain("<video");
    expect(index).toContain("./media/mcp-reader-demo.mp4");
    expect(index).toContain('poster="./media/mcp-reader.png"');
    expect(index).not.toContain("data-gallery-image");
    expect(main).toContain("initializeMcpVideo");
    expect(main).not.toContain("initializeGallery");
    expect(main).toContain("mouseWheel: false");
    expect(video.byteLength).toBeGreaterThan(1_000_000);
    expect(capture).toContain(
      "`Show me ${CONNECTIONS_REFERENCE} in Hebrew and English as an interactive Sefaria reader.`",
    );
    expect(index.replace(/\s+/g, " ")).toContain(
      "recorded acceptance video from VS Code with Copilot Chat",
    );
  });

  it("installs a deck-only minimum viewport guard", async () => {
    const [index, guard] = await Promise.all([
      readFile(path.join(showcase, "index.html"), "utf8"),
      readFile(path.join(showcase, "src", "viewport-guard.ts"), "utf8"),
    ]);

    expect(index).toContain('id="viewport-warning"');
    expect(index).toContain("data-required-viewport");
    expect(index).toContain("data-current-viewport");
    expect(index).toContain("1280 × 650");
    expect(guard).toContain("minimumDeckViewport");
    expect(guard).toContain("width: 1280");
    expect(guard).toContain("height: 650");
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
