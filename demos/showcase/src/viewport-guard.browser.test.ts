import { afterEach, describe, expect, it, vi } from "vitest";

import { installViewportGuard, minimumDeckViewport } from "./viewport-guard.js";

function setViewport(width: number, height: number): void {
  Object.defineProperties(window, {
    innerWidth: { configurable: true, value: width },
    innerHeight: { configurable: true, value: height },
  });
}

afterEach(() => {
  document.body.innerHTML = "";
  document.documentElement.removeAttribute("data-viewport-blocked");
  vi.restoreAllMocks();
});

describe("deck viewport guard", () => {
  it("blocks either undersized dimension and restores the focused deck", () => {
    document.body.innerHTML = `
      <main class="reveal"><button id="deck-button">Deck</button></main>
      <div class="deck-toolbar"></div>
      <div id="warning" tabindex="-1" hidden>
        <span data-current-viewport></span>
      </div>
    `;
    const root = document.querySelector<HTMLElement>(".reveal")!;
    const toolbar = document.querySelector<HTMLElement>(".deck-toolbar")!;
    const warning = document.querySelector<HTMLElement>("#warning")!;
    const current = document.querySelector<HTMLElement>(
      "[data-current-viewport]",
    )!;
    const deckButton =
      document.querySelector<HTMLButtonElement>("#deck-button")!;
    const changes = vi.fn();
    deckButton.focus();
    setViewport(minimumDeckViewport.width - 1, minimumDeckViewport.height);

    const guard = installViewportGuard({
      root,
      toolbar,
      warning,
      current,
      onBlockedChange: changes,
    });

    expect(guard.blocked).toBe(true);
    expect(root.inert).toBe(true);
    expect(toolbar.inert).toBe(true);
    expect(warning.hidden).toBe(false);
    expect(document.activeElement).toBe(warning);
    expect(current.textContent).toContain(
      String(minimumDeckViewport.width - 1),
    );

    setViewport(minimumDeckViewport.width, minimumDeckViewport.height);
    window.dispatchEvent(new Event("resize"));

    expect(guard.blocked).toBe(false);
    expect(root.inert).toBe(false);
    expect(warning.hidden).toBe(true);
    expect(document.activeElement).toBe(deckButton);
    expect(changes).toHaveBeenLastCalledWith(false);
    guard.destroy();
  });
});
