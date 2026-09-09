import { access, readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const showcase = import.meta.dirname;

describe("rotating booth deck", () => {
  it("defines eight unattended screens totaling 150 seconds", async () => {
    const html = await readFile(path.join(showcase, "loop.html"), "utf8");
    const sections = Array.from(
      html.matchAll(/<section\s+[^>]*id="([^"]+)"[^>]*data-autoslide="(\d+)"/g),
      (match) => ({ id: match[1], duration: Number(match[2]) }),
    );

    expect(sections.map(({ id }) => id)).toEqual([
      "loop-title",
      "loop-sefaria",
      "loop-problem",
      "loop-component",
      "loop-reader",
      "loop-toolkit",
      "loop-mcp",
      "loop-impact",
    ]);
    expect(sections.reduce((total, { duration }) => total + duration, 0)).toBe(
      150_000,
    );
    expect(html).not.toContain('<aside class="notes">');
  });

  it("uses self-contained infographics and two focused calls to action", async () => {
    const html = await readFile(path.join(showcase, "loop.html"), "utf8");
    const normalized = html.replace(/\s+/g, " ");

    expect(normalized).toContain("Sefaria Web Components");
    expect(normalized).toContain("Avi Levin");
    expect(normalized).toContain("Hackathon project built with Sefaria");
    expect(normalized).toContain("Try the live MCP Reader on the laptop");
    expect(normalized).toContain(
      "https://arithmomaniac.github.io/sefaria-web-components/",
    );
    expect(html).toContain("./media/showcase-qr.svg");
    expect(html.match(/class="loop-cta"/g)).toHaveLength(1);
    expect(html).toContain('class="loop-final-qr"');
    expect(html).toContain("./media/sefaria-reader-commentary.png");
    expect(html).toContain("./media/talmud-page.png");
    expect(html).toContain("./media/tikkun.png");
    expect(html).toContain('class="sefaria-ecosystem-visuals"');
    expect(html).toContain("./media/loop-reader.png");
    expect(html).toContain("./media/loop-linker.png");
    expect(html).toContain("./media/mcp-reader-chat-export.png");
    expect(html.match(/class="context-screenshot/g)).toHaveLength(3);
    expect(html).not.toContain("mcp-reader-demo.mp4");
    expect(html).not.toContain("<iframe");
    expect(html).not.toContain("https://www.sefaria.org");
    expect(html).not.toContain("data-demo=");
  });

  it("explains the developer gap and reusable integration boundaries", async () => {
    const html = await readFile(path.join(showcase, "loop.html"), "utf8");
    const normalized = html.replace(/\s+/g, " ");
    const problem = html.match(
      /<section id="loop-problem"[\s\S]*?<\/section>/,
    )?.[0];

    expect(normalized).toContain(
      "A frontend toolkit for developers building with Sefaria.",
    );
    expect(normalized).toContain("Coding agents enable more");
    expect(normalized).toContain("well-documented data API");
    expect(problem).toMatch(
      /class="bridge-projects"[\s\S]*?class="bridge-endpoint bridge-api"[\s\S]*?class="bridge-connector bridge-break"[\s\S]*?class="bridge-gap"/,
    );
    expect(normalized).toContain("Component factories");
    expect(normalized).toContain("component-specific view models");
    expect(normalized).toContain(
      "Hosts and controllers load data. Elements render and emit events.",
    );
    expect(normalized).toContain("complete Reader");
    expect(normalized).toContain("compose your own interface");
  });

  it("connects chat follow-up to component adoption without claiming rollout", async () => {
    const html = await readFile(path.join(showcase, "loop.html"), "utf8");
    const normalized = html.replace(/\s+/g, " ");

    expect(normalized).toContain("Continue the conversation.");
    expect(normalized).toContain("bring a source back into the main chat");
    expect(normalized).toContain(
      "Sefaria is ready to adopt these web components as a standard for its open-source developer community.",
    );
    expect(normalized).toContain(
      "A shared UI language could make maintenance and open-source contribution easier.",
    );
  });

  it("is emitted by Vite and required by the Pages artifact", async () => {
    const [vite, pages] = await Promise.all([
      readFile(path.join(showcase, "vite.config.ts"), "utf8"),
      readFile(path.join(showcase, "scripts", "build-pages.mjs"), "utf8"),
    ]);

    expect(vite).toContain('loop: "loop.html"');
    expect(pages).toContain('"loop.html"');
    expect(pages).toContain('"media/showcase-qr.svg"');
    expect(pages).toContain('"media/loop-reader.png"');
    expect(pages).toContain('"media/loop-linker.png"');
    expect(pages).toContain('"media/loop-mcp.png"');
  });

  it("generates the QR locally for the public showcase destination", async () => {
    const [packageJson, generator, qr] = await Promise.all([
      readFile(path.join(showcase, "package.json"), "utf8"),
      readFile(path.join(showcase, "scripts", "generate-qr.mjs"), "utf8"),
      readFile(
        path.join(showcase, "public", "media", "showcase-qr.svg"),
        "utf8",
      ),
    ]);

    expect(packageJson).toContain('"generate:qr"');
    expect(packageJson).toContain('"verify:qr"');
    expect(packageJson).toContain('"qrcode"');
    expect(generator).toContain(
      "https://arithmomaniac.github.io/sefaria-web-components/",
    );
    expect(qr).toContain("<svg");
    await access(path.join(showcase, "public", "media", "showcase-qr.png"));
  });

  it("fully disables autoplay in paused operator mode", async () => {
    const runtime = await readFile(
      path.join(showcase, "src", "loop.ts"),
      "utf8",
    );

    expect(runtime).toContain("autoSlide: paused ? false : 10_000");
  });
});
