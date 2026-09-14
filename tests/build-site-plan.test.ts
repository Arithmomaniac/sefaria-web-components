import { describe, expect, it } from "vitest";

import {
  EXAMPLE_BUILDS,
  createSiteBuildSteps,
  SITE_REQUIRED_FILES,
} from "../scripts/build-site-plan.mjs";

describe("documentation site build plan", () => {
  it("assembles every maintained browser example", () => {
    expect(EXAMPLE_BUILDS.map(({ route }) => route)).toEqual([
      "explorer",
      "reader",
      "vanilla",
      "react",
      "linked-article",
      "mcp-app",
    ]);
  });

  it("keeps typechecking in standalone builds and skips it after pnpm check", () => {
    expect(createSiteBuildSteps({ skipTypecheck: false })).toContainEqual({
      kind: "pnpm",
      args: ["--filter", "@sefaria/web-components", "build"],
    });
    expect(createSiteBuildSteps({ skipTypecheck: false })).toContainEqual({
      kind: "pnpm",
      args: ["--filter", "@sefaria-example/react-vite", "typecheck"],
    });
    expect(createSiteBuildSteps({ skipTypecheck: true })).not.toContainEqual({
      kind: "pnpm",
      args: ["--filter", "@sefaria/web-components", "build"],
    });
    expect(createSiteBuildSteps({ skipTypecheck: true })).not.toContainEqual({
      kind: "pnpm",
      args: ["--filter", "@sefaria-example/react-vite", "typecheck"],
    });
  });

  it("requires real pages rather than accepting an HTML fallback", () => {
    expect(SITE_REQUIRED_FILES).toContain("examples/explorer/authored.html");
    expect(SITE_REQUIRED_FILES).toContain("examples/reader/controlled.html");
    expect(SITE_REQUIRED_FILES).toContain("examples/react/index.html");
    expect(SITE_REQUIRED_FILES).toContain("examples/mcp-app/index.html");
  });
});
