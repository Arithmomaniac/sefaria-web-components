import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  captureLiveDemo,
  waitForTerminalState,
} from "../../capture-live-demo.js";

const SCREENSHOT_PATH = join(tmpdir(), "sefaria-text-segment-live-app.png");

await captureLiveDemo({
  root: "demos/text-segment-live-demo",
  presets: ["hebrew", "english-footnote", "hebrew-markup", "missing", "range"],
  capturePreset: async (page, preset) => {
    const result = await page
      .locator("sefaria-text-segment")
      .evaluate((element) => {
        const component = element as HTMLElement & {
          viewModel?: {
            readonly state: string;
            readonly direction?: string;
          };
        };
        return {
          state: component.viewModel?.state ?? "missing",
          direction: component.viewModel?.direction ?? "-",
          footnotes:
            component.shadowRoot?.querySelectorAll(".footnotes li").length ??
            "-",
        };
      });
    return `${preset}|${result.state}|direction=${result.direction}|footnotes=${result.footnotes}`;
  },
  afterPresets: async (page) => {
    await page.locator('[data-demo-id="english-footnote"]').click();
    await waitForTerminalState(page);
    const pageProof = await page.evaluate(() => {
      const form = document.querySelector("#demo-request-form");
      const presets = document.querySelectorAll("[data-demo-request]");
      const element = document.querySelector("sefaria-text-segment");
      return {
        form: form instanceof HTMLFormElement,
        presetCount: presets.length,
        elementName: element?.localName ?? null,
        shadowRoot: element?.shadowRoot !== null,
      };
    });
    console.log(
      `page|form=${pageProof.form}|presets=${pageProof.presetCount}|element=${pageProof.elementName}|shadowRoot=${pageProof.shadowRoot ? "open" : "missing"}`,
    );
    await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true });
    console.log("png|generated=true|fullPage=true");
  },
});
