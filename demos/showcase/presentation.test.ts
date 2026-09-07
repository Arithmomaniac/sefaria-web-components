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
      /<section id="interactions">[\s\S]*data-demo="manual-reader"[\s\S]*data-title="Manual side-by-side reader"/,
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

  it("supersedes pending manual-reader work before restoring history", async () => {
    const preview = await readFile(
      path.join(showcase, "src", "preview.tsx"),
      "utf8",
    );

    expect(preview).toMatch(
      /const restoreHistory = useCallback\([\s\S]*supersedeManualReaderWork\(session\);[\s\S]*transition\(current\)/,
    );
    expect(preview).toContain("restoreHistory((current) => current.back())");
    expect(preview).toContain("current.activate(breadcrumb.entryId)");
  });
});
