import { describe, expect, it } from "vitest";

import {
  createBuildCommands,
  LEGACY_DEMO_REDIRECTS,
  PAGE_DEMOS,
} from "./build-pages-plan.mjs";

describe("Pages build plan", () => {
  it("keeps standalone builds typechecked", () => {
    const commands = createBuildCommands({
      linkerUrl: "https://example.test/sefaria-linker.js",
      skipTypecheck: false,
    });

    expect(commands.every((command) => command.args[2] === "build")).toBe(true);
  });

  it("uses bundle-only commands after the repository typecheck has passed", () => {
    const commands = createBuildCommands({
      linkerUrl: "https://example.test/sefaria-linker.js",
      skipTypecheck: true,
    });

    expect(commands).toHaveLength(4);
    expect(commands.every((command) => command.args[2] === "exec")).toBe(true);
    expect(commands.some((command) => command.args.includes("tsc"))).toBe(
      false,
    );
  });

  it("builds one explorer and retains every previous public demo route", () => {
    expect(PAGE_DEMOS).toEqual([
      ["explorer", "@sefaria-demo/explorer"],
      ["reader-workspace", "@sefaria-demo/reader-workspace"],
    ]);
    expect(LEGACY_DEMO_REDIRECTS).toEqual([
      ["component-lab", "authored.html"],
      ["ref-label", "ref-label.html"],
      ["text-segment", "text-segment.html"],
      ["bilingual-segment", "bilingual-segment.html"],
      ["source-card", "source-card.html"],
      ["connections", "connections.html"],
    ]);
  });
});
