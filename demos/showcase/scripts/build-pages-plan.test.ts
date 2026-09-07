import { describe, expect, it } from "vitest";

import { createBuildCommands } from "./build-pages-plan.mjs";

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

    expect(commands).toHaveLength(8);
    expect(commands.every((command) => command.args[2] === "exec")).toBe(true);
    expect(commands.some((command) => command.args.includes("tsc"))).toBe(
      false,
    );
  });
});
