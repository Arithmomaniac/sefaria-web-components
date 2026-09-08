import { chromium, type Browser } from "playwright";
import { afterAll, beforeAll, expect, it } from "vitest";

import {
  captureVscodeViewport,
  frameReaderForCapture,
  prepareReaderForShowcaseCapture,
  prepareShowcaseLayout,
  revealLocatorForDemoClick,
} from "./vscode-capture-layout.js";
import {
  installDemoCursor,
  moveDemoCursor,
  pulseDemoCursor,
} from "./vscode-demo-cursor.js";

let browser: Browser;
beforeAll(async () => {
  browser = await chromium.launch({ headless: true });
});
afterAll(async () => {
  await browser?.close();
});

it("reveals a tall nested App in a virtualized Chat list without hiding its header", async () => {
  const page = await browser.newPage();
  try {
    await page.setContent(`
      <style>body { margin: 0 } .interactive-list { margin-top: 80px; height: 400px; overflow: hidden }</style>
      <div class="interactive-list">
        <div id="rows" style="transform:translateY(-200px)">
          <iframe style="margin-left:20px;width:700px;height:600px" srcdoc="<h1>Reader</h1>"></iframe>
        </div>
      </div>
      <script>
        let offset = -200;
        document.querySelector(".interactive-list").addEventListener("wheel", event => {
          event.preventDefault();
          offset -= Math.sign(event.deltaY) * 42;
          document.getElementById("rows").style.transform = "translateY(" + offset + "px)";
        }, { passive: false });
      </script>
    `);
    const frame = await page.locator("iframe").elementHandle();
    const app = await frame!.contentFrame();
    await frameReaderForCapture(app!, 180);
    const bounds = await page.locator("iframe").boundingBox();
    expect(bounds!.y).toBeGreaterThanOrEqual(228);
    expect(bounds!.y).toBeLessThanOrEqual(276);
    await frameReaderForCapture(app!, 180);
    expect((await page.locator("iframe").boundingBox())!.y).toBe(bounds!.y);
  } finally {
    await page.close();
  }
});

it("captures the native viewport without an emulated device-scale clip", async () => {
  const context = await browser.newContext({
    viewport: { width: 800, height: 600 },
    deviceScaleFactor: 1.5,
  });
  try {
    const page = await context.newPage();
    await page.setContent("<div>Reader capture</div>");
    const image = await captureVscodeViewport(page);
    expect(image.readUInt32BE(16)).toBe(800);
    expect(image.readUInt32BE(20)).toBe(600);
  } finally {
    await context.close();
  }
});

it.each([false, true])(
  "uses command mode and preserves fullscreen on repeated setup (initial fullscreen: %s)",
  async (fullscreen) => {
    const page = await browser.newPage();
    await page.setContent(`
    <div class="monaco-workbench ${fullscreen ? "fullscreen" : ""}" style="width:100vw;height:100vh">
      <div id="workbench.parts.auxiliarybar" style="width:200px"></div>
    </div>
    <div class="quick-input-widget" hidden>
      <div class="quick-input-box"><input></div>
      <div class="quick-input-list"></div>
    </div>
    <script>
      window.executed = [];
      const commands = {
        "workbench.action.zoomReset": "View: Reset Zoom",
        "workbench.action.zoomIn": "View: Zoom In",
        "workbench.action.toggleFullScreen": "View: Toggle Full Screen",
        "workbench.action.maximizeAuxiliaryBar": "View: Maximize Secondary Side Bar"
      };
      const picker = document.querySelector(".quick-input-widget");
      const input = picker.querySelector("input");
      document.addEventListener("keydown", event => {
        if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "p") {
          picker.hidden = false;
          input.value = ">";
          input.focus();
          event.preventDefault();
        }
      });
      input.addEventListener("input", () => {
        const list = picker.querySelector(".quick-input-list");
        list.replaceChildren();
        const id = input.value.slice(1);
        if (!input.value.startsWith(">") || !commands[id]) return;
        const row = document.createElement("div");
        row.className = "monaco-list-row";
        row.textContent = commands[id];
        row.addEventListener("click", () => {
          window.executed.push(id);
          if (id.endsWith("toggleFullScreen")) {
            document.querySelector(".monaco-workbench").classList.toggle("fullscreen");
          }
          if (id.endsWith("maximizeAuxiliaryBar")) {
            document.getElementById("workbench.parts.auxiliarybar").style.width = "100vw";
          }
          picker.hidden = true;
        });
        list.append(row);
      });
    </script>
  `);
    try {
      await prepareShowcaseLayout(page);
      expect(await page.evaluate("window.executed")).toEqual([
        "workbench.action.zoomReset",
        "workbench.action.zoomIn",
        ...(!fullscreen ? ["workbench.action.toggleFullScreen"] : []),
        "workbench.action.maximizeAuxiliaryBar",
      ]);
      await prepareShowcaseLayout(page);
      expect(await page.evaluate("window.executed")).toEqual([
        "workbench.action.zoomReset",
        "workbench.action.zoomIn",
        ...(!fullscreen ? ["workbench.action.toggleFullScreen"] : []),
        "workbench.action.maximizeAuxiliaryBar",
        "workbench.action.zoomReset",
        "workbench.action.zoomIn",
      ]);
    } finally {
      await page.close();
    }
  },
);

it("scales only the App document for showcase capture", async () => {
  const page = await browser.newPage();
  await page.setContent('<iframe srcdoc="<p>Reader</p>"></iframe>');
  const handle = await page.locator("iframe").elementHandle();
  const frame = await handle!.contentFrame();

  await prepareReaderForShowcaseCapture(frame!);

  expect(await frame!.evaluate(() => document.documentElement.style.zoom)).toBe(
    "0.84",
  );
  expect(await page.evaluate(() => document.documentElement.style.zoom)).toBe(
    "",
  );
  await page.close();
});

it("moves and pulses the synthetic demo cursor over a target", async () => {
  const page = await browser.newPage();
  await page.setContent(
    '<main style="height:1200px"></main><button style="position:fixed;left:100px;top:80px;width:120px;height:40px">Open</button>',
  );
  const button = page.getByRole("button", { name: "Open" });

  await installDemoCursor(page);
  await moveDemoCursor(button, 0);
  await pulseDemoCursor(page);

  const cursor = page.locator("#sefaria-demo-cursor");
  expect(
    await cursor.evaluate((element) => ({
      transform: (element as HTMLElement).style.transform,
      clicking: element.classList.contains("clicking"),
      opacity: (element as HTMLElement).style.opacity,
    })),
  ).toEqual({
    transform: "translate(160px, 100px)",
    clicking: true,
    opacity: "0",
  });
  const bounds = await cursor.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x + bounds!.width / 2).toBe(160);
  expect(bounds!.y + bounds!.height / 2).toBe(100);
  await page.close();
});

it("scrolls a demo click target above the fixed Chat composer", async () => {
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
  await page.setContent(`
    <div class="interactive-list" style="position:fixed;inset:0;overflow:auto">
      <div style="height:900px">
        <button style="position:absolute;top:700px">Covered target</button>
      </div>
    </div>
    <div class="interactive-input-part" style="position:fixed;left:0;right:0;bottom:0;height:140px;background:white"></div>
  `);
  const button = page.getByRole("button", { name: "Covered target" });

  await revealLocatorForDemoClick(button, 0);

  const [buttonBounds, composerBounds] = await Promise.all([
    button.boundingBox(),
    page.locator(".interactive-input-part").boundingBox(),
  ]);
  expect(buttonBounds).not.toBeNull();
  expect(composerBounds).not.toBeNull();
  expect(buttonBounds!.y + buttonBounds!.height).toBeLessThan(
    composerBounds!.y,
  );
  await page.close();
});

it("reveals a distant shadow-DOM button inside nested frames before a real click", async () => {
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
  try {
    await page.setContent(`
      <style>body { margin: 0 }</style>
      <div class="interactive-list" style="height:460px;overflow:auto">
        <iframe style="width:760px;height:600px;border:0"></iframe>
      </div>
      <div class="interactive-input-part" style="position:fixed;inset:460px 0 0;background:white"></div>
    `);
    const outer = await (await page
      .locator("iframe")
      .elementHandle())!.contentFrame();
    await outer!.setContent(
      '<iframe style="width:100%;height:600px;border:0"></iframe>',
    );
    const inner = await (await outer!
      .locator("iframe")
      .elementHandle())!.contentFrame();
    await inner!.setContent("<demo-panel></demo-panel>");
    await inner!.locator("demo-panel").evaluate((element) => {
      const root = element.attachShadow({ mode: "open" });
      root.innerHTML =
        '<div style="height:16000px"></div><button>More</button><div style="height:600px"></div>';
      root.querySelector("button")!.addEventListener("click", () => {
        element.setAttribute("data-clicked", "true");
      });
    });
    const button = inner!.getByRole("button", { name: "More", exact: true });
    expect((await button.boundingBox())!.y).toBeGreaterThan(16000);

    await revealLocatorForDemoClick(button);
    const bounds = (await button.boundingBox())!;
    expect(bounds.y).toBeGreaterThanOrEqual(16);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(444);
    await button.click({ timeout: 1000 });
    expect(
      await inner!.locator("demo-panel").getAttribute("data-clicked"),
    ).toBe("true");
  } finally {
    await page.close();
  }
});

it("rejects a target covered by another element even inside the safe rectangle", async () => {
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
  try {
    await page.setContent(`
      <div class="interactive-list" style="position:fixed;inset:0 0 140px">
        <button style="position:absolute;left:100px;top:100px">Covered</button>
        <div style="position:absolute;inset:0;background:white"></div>
      </div>
      <div class="interactive-input-part" style="position:fixed;inset:460px 0 0"></div>
    `);
    await expect(
      revealLocatorForDemoClick(page.getByRole("button", { name: "Covered" })),
    ).rejects.toThrow();
  } finally {
    await page.close();
  }
}, 15000);
