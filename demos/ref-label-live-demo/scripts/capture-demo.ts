import { captureLiveDemo } from "../../capture-live-demo.js";

await captureLiveDemo({
  root: "demos/ref-label-live-demo",
  presets: ["segment", "range", "spanning", "commentary", "empty"],
  capturePreset: async (page, preset) => {
    const result = await page
      .locator("sefaria-ref-label")
      .evaluate((element) => {
        const component = element as HTMLElement & {
          viewModel?: { readonly state: string; readonly url?: string };
        };
        return {
          state: component.viewModel?.state ?? "missing",
          url: component.viewModel?.url ?? "-",
          linked: component.shadowRoot?.querySelector("a") !== null,
        };
      });
    return `${preset}|${result.state}|linked=${result.linked}|url=${result.url}`;
  },
});
