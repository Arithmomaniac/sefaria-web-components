import { expect, test } from "vitest";

import "./no-network.js";
import { browserFixtures } from "./browser.js";
import { mountBrowserFixture } from "./index.js";

class ComponentFixtureProbe extends HTMLElement {
  declare viewModel: (typeof browserFixtures)[0]["viewModel"];
  footnoteMode = "";
  wordSelection = false;

  connectedCallback() {
    this.style.display = "block";
    this.style.width = "100%";
    this.textContent = "Fixture harness probe";
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "sefaria-component-fixture-probe": ComponentFixtureProbe;
  }
}

if (!customElements.get("sefaria-component-fixture-probe")) {
  customElements.define(
    "sefaria-component-fixture-probe",
    ComponentFixtureProbe,
  );
}

test("mounts fixture inputs before measuring after fonts are ready", async () => {
  const fixture = browserFixtures[0];
  expect(fixture.id).toBe("browser-text-segment-english-narrow");

  let releaseFonts: (() => void) | undefined;
  const fontReady = new Promise<void>((resolve) => {
    releaseFonts = resolve;
  });

  const mounted = mountBrowserFixture({
    fixture,
    element: document.createElement("sefaria-component-fixture-probe"),
    fontReady,
  });

  await Promise.resolve();

  const container = document.querySelector<HTMLElement>(
    '[data-sefaria-browser-fixture="browser-text-segment-english-narrow"]',
  );
  const element = container?.querySelector<ComponentFixtureProbe>(
    "sefaria-component-fixture-probe",
  );

  expect(container).not.toBeNull();
  expect(element?.viewModel).toBe(fixture.viewModel);
  expect(element?.footnoteMode).toBe("interactive");
  expect(element?.wordSelection).toBe(true);
  expect(container?.style.width).toBe("320px");
  expect(container?.style.colorScheme).toBe("light");
  expect(container?.style.getPropertyValue("--sefaria-font-english")).toBe(
    "system-ui, sans-serif",
  );

  releaseFonts?.();
  const result = await mounted;

  expect(result.measurement.containerWidth).toBeCloseTo(320, 0);
  expect(result.measurement.elementWidth).toBeCloseTo(320, 0);
  expect(result.element).toBe(element);

  result.container.remove();
});
