import { html } from "lit";
import { render } from "vitest-browser-lit";
import { expect, test } from "vitest";
import { SefariaElement } from "./sefaria-element.js";

class SefariaElementFixture extends SefariaElement {
  protected override render() {
    return html`<span>Browser-ready Lit element</span>`;
  }
}

class NestedSefariaElementFixture extends SefariaElement {
  protected override render() {
    return html`
      <span>Outer Lit element</span>
      <sefaria-element-fixture></sefaria-element-fixture>
    `;
  }
}

if (!customElements.get("sefaria-element-fixture")) {
  customElements.define("sefaria-element-fixture", SefariaElementFixture);
}

if (!customElements.get("nested-sefaria-element-fixture")) {
  customElements.define(
    "nested-sefaria-element-fixture",
    NestedSefariaElementFixture,
  );
}

test("inherits tokens from a theme container", async () => {
  const screen = render(html`
    <div style="--sefaria-fg: rgb(1, 2, 3)">
      <sefaria-element-fixture></sefaria-element-fixture>
    </div>
  `);

  await expect
    .element(screen.getByText("Browser-ready Lit element"))
    .toBeVisible();

  const element = document.querySelector("sefaria-element-fixture");
  expect(element).not.toBeNull();
  expect(getComputedStyle(element!).color).toBe("rgb(1, 2, 3)");
});

test("applies font scale once across nested components", async () => {
  render(html`
    <div style="--sefaria-font-scale: 1.25">
      <nested-sefaria-element-fixture></nested-sefaria-element-fixture>
    </div>
  `);

  const outer = document.querySelector<NestedSefariaElementFixture>(
    "nested-sefaria-element-fixture",
  );
  await outer?.updateComplete;
  const inner = outer?.shadowRoot?.querySelector("sefaria-element-fixture");
  expect(outer).not.toBeNull();
  expect(inner).not.toBeNull();
  expect(getComputedStyle(inner!).fontSize).toBe(
    getComputedStyle(outer!).fontSize,
  );
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
