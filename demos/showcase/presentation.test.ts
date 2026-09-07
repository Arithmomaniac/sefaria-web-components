import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const showcase = import.meta.dirname;
const repository = path.resolve(showcase, "..", "..");

describe("showcase reader presentation", () => {
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
