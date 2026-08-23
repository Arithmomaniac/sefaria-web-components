import { html } from "lit";
import { render } from "vitest-browser-lit";
import { expect, test } from "vitest";
import { SefariaElement } from "./sefaria-element.js";

class SefariaElementFixture extends SefariaElement {
  protected override render() {
    return html`<span>Browser-ready Lit element</span>`;
  }
}

if (!customElements.get("sefaria-element-fixture")) {
  customElements.define("sefaria-element-fixture", SefariaElementFixture);
}

test("renders in a real browser and accepts host tokens", async () => {
  const screen = render(
    html`<sefaria-element-fixture
      style="--sefaria-fg: rgb(1, 2, 3)"
    ></sefaria-element-fixture>`,
  );

  await expect
    .element(screen.getByText("Browser-ready Lit element"))
    .toBeVisible();

  const element = document.querySelector("sefaria-element-fixture");
  expect(element).not.toBeNull();
  expect(getComputedStyle(element!).color).toBe("rgb(1, 2, 3)");
});

test("inherits the embedding document color scheme", async () => {
  document.documentElement.style.colorScheme = "dark";

  try {
    render(html`<sefaria-element-fixture></sefaria-element-fixture>`);

    const element = document.querySelector("sefaria-element-fixture");
    expect(element).not.toBeNull();
    expect(getComputedStyle(element!).backgroundColor).toBe("rgb(45, 45, 43)");
    expect(getComputedStyle(element!).color).toBe("rgb(255, 255, 255)");
  } finally {
    document.documentElement.style.removeProperty("color-scheme");
  }
});
