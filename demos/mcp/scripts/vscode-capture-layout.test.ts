import { chromium, type Browser } from "playwright";
import { afterAll, beforeAll, expect, it } from "vitest";

import {
  captureVscodeViewport,
  frameReaderForCapture,
  prepareShowcaseLayout,
} from "./vscode-capture-layout.js";

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
    await frameReaderForCapture(app!);
    const bounds = await page.locator("iframe").boundingBox();
    expect(bounds!.y).toBeGreaterThanOrEqual(80);
    expect(bounds!.y).toBeLessThanOrEqual(136);
    await frameReaderForCapture(app!);
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
        ...(!fullscreen ? ["workbench.action.toggleFullScreen"] : []),
        "workbench.action.maximizeAuxiliaryBar",
      ]);
      await prepareShowcaseLayout(page);
      expect(await page.evaluate("window.executed")).toEqual([
        "workbench.action.zoomReset",
        ...(!fullscreen ? ["workbench.action.toggleFullScreen"] : []),
        "workbench.action.maximizeAuxiliaryBar",
        "workbench.action.zoomReset",
      ]);
    } finally {
      await page.close();
    }
  },
);
