import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Page } from "playwright";

import {
  captureLiveDemo,
  waitForTerminalState,
} from "../../capture-live-demo.js";

const WIDE_SCREENSHOT_PATH = join(tmpdir(), "sefaria-source-card-wide.png");
const NARROW_SCREENSHOT_PATH = join(tmpdir(), "sefaria-source-card-narrow.png");
let previousTextRequests = 1;

await captureLiveDemo({
  root: "demos/source-card-live-demo",
  presets: [
    "segment",
    "range",
    "spanning",
    "nested",
    "one-sided",
    "shape-union",
  ],
  capturePreset: async (page, preset) => {
    const result = await inspectCard(page);
    const textRequests = await page.evaluate(
      () =>
        performance
          .getEntriesByType("resource")
          .filter((entry) => entry.name.includes("/api/v3/texts/")).length,
    );
    const requestDelta = textRequests - previousTextRequests;
    previousTextRequests = textRequests;
    return `${preset}|${result.state}|items=${result.items}|partial=${result.partial}|requests=${requestDelta}`;
  },
  afterPresets: async (page) => {
    await page.locator('[data-demo-id="range"]').click();
    await waitForTerminalState(page);
    await selectDisplayValue(page, "layout", "side-by-side");
    await selectDisplayValue(page, "sideOrder", "translation-first");
    const wide = await inspectCard(page);
    console.log(
      `advanced|wide|items=${wide.items}|tracks=${wide.tracks}|first=${wide.first}`,
    );
    await page.screenshot({ path: WIDE_SCREENSHOT_PATH, fullPage: true });
    console.log("png|wide=true|translation-first=true");

    await selectDisplayValue(page, "layout", "auto");
    await selectDisplayValue(page, "sideOrder", "primary-first");
    await page.setViewportSize({ width: 520, height: 1100 });
    const narrow = await inspectCard(page);
    console.log(
      `advanced|narrow|items=${narrow.items}|tracks=${narrow.tracks}|first=${narrow.first}`,
    );
    await page.screenshot({ path: NARROW_SCREENSHOT_PATH, fullPage: true });
    console.log("png|narrow=true|auto-stacked=true");
  },
});

async function selectDisplayValue(
  page: Page,
  name: string,
  value: string,
): Promise<void> {
  await page
    .locator(`#display-form select[name="${name}"]`)
    .selectOption(value);
}

async function inspectCard(page: Page): Promise<{
  readonly state: string;
  readonly items: number;
  readonly partial: number;
  readonly tracks: number;
  readonly first: string;
}> {
  return await page.locator("sefaria-source-card").evaluate((element) => {
    const component = element as HTMLElement & {
      viewModel?: { readonly state: string };
    };
    const items = Array.from(
      component.shadowRoot?.querySelectorAll<HTMLElement>(".item") ?? [],
    );
    const firstPair = items[0]?.querySelector<HTMLElement>(".pair");
    const firstSide = firstPair
      ? Array.from(firstPair.querySelectorAll<HTMLElement>("[data-side]")).sort(
          (left, right) =>
            Number.parseInt(getComputedStyle(left).order, 10) -
            Number.parseInt(getComputedStyle(right).order, 10),
        )[0]?.dataset.side
      : undefined;
    return {
      state: component.viewModel?.state ?? "missing",
      items: items.length,
      partial: items.filter((item) => item.querySelector(".absent") !== null)
        .length,
      tracks:
        firstPair === undefined
          ? 0
          : getComputedStyle(firstPair).gridTemplateColumns.split(" ").length,
      first: firstSide ?? "-",
    };
  });
}
