import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Page } from "playwright";

import {
  captureLiveDemo,
  waitForTerminalState,
} from "../../capture-live-demo.js";

const WIDE_SCREENSHOT_PATH = join(
  tmpdir(),
  "sefaria-bilingual-segment-wide.png",
);
const NARROW_SCREENSHOT_PATH = join(
  tmpdir(),
  "sefaria-bilingual-segment-narrow.png",
);

await captureLiveDemo({
  root: "demos/bilingual-segment-live-demo",
  presets: ["default", "exact-editions", "missing-translation", "range"],
  capturePreset: async (page, preset) => {
    const result = await page
      .locator("sefaria-bilingual-segment")
      .evaluate((element) => {
        const component = element as HTMLElement & {
          viewModel?: { readonly state: string };
        };
        const sides = Array.from(
          component.shadowRoot?.querySelectorAll<HTMLElement>(
            "sefaria-text-segment[data-side]",
          ) ?? [],
        ).map((side) => {
          const child = side as HTMLElement & {
            viewModel?: { readonly direction?: string };
          };
          return `${side.dataset.side}:${child.viewModel?.direction ?? "-"}`;
        });
        return {
          state: component.viewModel?.state ?? "missing",
          sides: sides.length === 0 ? "-" : sides.join(","),
          absent: component.shadowRoot?.querySelectorAll(".absent").length ?? 0,
        };
      });
    return `${preset}|${result.state}|sides=${result.sides}|absent=${result.absent}`;
  },
  afterPresets: async (page) => {
    await page.locator('[data-demo-id="default"]').click();
    await waitForTerminalState(page);

    await selectDisplayValue(page, "contentLanguage", "both");
    await selectDisplayValue(page, "layout", "side-by-side");
    await selectDisplayValue(page, "sideOrder", "translation-first");
    await page.locator("html").evaluate((root) => {
      root.dataset.theme = "dark";
    });

    const ordered = await inspectLayout(page);
    console.log(
      `advanced|side-by-side|tracks=${ordered.tracks}|visible=${ordered.visible}|first=${ordered.first}`,
    );
    await page.screenshot({ path: WIDE_SCREENSHOT_PATH, fullPage: true });
    console.log("png|wide=true|theme=dark|translation-first=true");

    await selectDisplayValue(page, "contentLanguage", "translation");
    const translationOnly = await inspectLayout(page);
    console.log(
      `advanced|translation-only|tracks=${translationOnly.tracks}|visible=${translationOnly.visible}|first=${translationOnly.first}`,
    );

    await selectDisplayValue(page, "contentLanguage", "both");
    await selectDisplayValue(page, "layout", "auto");
    await selectDisplayValue(page, "sideOrder", "primary-first");
    await page.setViewportSize({ width: 520, height: 1100 });
    const narrow = await inspectLayout(page);
    console.log(
      `advanced|auto-narrow|tracks=${narrow.tracks}|visible=${narrow.visible}|first=${narrow.first}`,
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

async function inspectLayout(page: Page): Promise<{
  readonly tracks: number;
  readonly visible: string;
  readonly first: string;
}> {
  return await page.locator("sefaria-bilingual-segment").evaluate((element) => {
    const pair = element.shadowRoot?.querySelector<HTMLElement>(".pair");
    if (!pair) {
      throw new Error("The bilingual pair was not rendered.");
    }
    const visible = Array.from(
      pair.querySelectorAll<HTMLElement>("[data-side]"),
    )
      .map((side) => side.dataset.side ?? "unknown")
      .sort();
    const first = Array.from(
      pair.querySelectorAll<HTMLElement>("[data-side]"),
    ).sort(
      (left, right) =>
        Number.parseInt(getComputedStyle(left).order, 10) -
        Number.parseInt(getComputedStyle(right).order, 10),
    )[0]?.dataset.side;
    return {
      tracks: getComputedStyle(pair).gridTemplateColumns.split(" ").length,
      visible: visible.join(","),
      first: first ?? "-",
    };
  });
}
