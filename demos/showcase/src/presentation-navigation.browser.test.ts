import { afterEach, describe, expect, it, vi } from "vitest";

import { installPresentationNavigation } from "./presentation-navigation.js";

interface SlideChangedEvent {
  readonly currentSlide?: HTMLElement;
  readonly previousSlide?: HTMLElement;
}

function createHarness() {
  document.body.innerHTML = `
    <div class="slides">
      <section id="before"></section>
      <section id="mcp"><video controls></video></section>
      <section id="after"></section>
    </div>
    <pre class="code-pane">Scrollable code</pre>
  `;
  const slides = Array.from(
    document.querySelectorAll<HTMLElement>(".slides > section"),
  );
  let current = 0;
  let listener: ((event: SlideChangedEvent) => void) | undefined;
  const deck = {
    getCurrentSlide: () => slides[current]!,
    next: vi.fn(() => {
      const previousSlide = slides[current]!;
      current = Math.min(current + 1, slides.length - 1);
      listener?.({ previousSlide, currentSlide: slides[current]! });
    }),
    prev: vi.fn(() => {
      const previousSlide = slides[current]!;
      current = Math.max(current - 1, 0);
      listener?.({ previousSlide, currentSlide: slides[current]! });
    }),
    on: (
      _event: "slidechanged",
      nextListener: (event: SlideChangedEvent) => void,
    ) => {
      listener = nextListener;
    },
  };
  let time = 1_000;
  const destroy = installPresentationNavigation({
    deck,
    isBlocked: () => false,
    now: () => time,
  });
  const wheel = (target: Element, deltaY: number) => {
    time += 700;
    const event = new WheelEvent("wheel", {
      bubbles: true,
      cancelable: true,
      deltaY,
    });
    target.dispatchEvent(event);
    return event;
  };
  return { deck, slides, wheel, destroy };
}

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("presentation wheel navigation", () => {
  it("moves directly between slides, including past the MCP video", () => {
    const { deck, slides, wheel, destroy } = createHarness();

    wheel(slides[0]!, 100);
    expect(deck.next).toHaveBeenCalledTimes(1);

    wheel(slides[1]!, 100);
    expect(deck.next).toHaveBeenCalledTimes(2);

    wheel(slides[2]!, -100);
    expect(deck.prev).toHaveBeenCalledTimes(1);
    destroy();
  });

  it("does not navigate when the wheel originates in a native code scroller", () => {
    const { deck, wheel, destroy } = createHarness();
    const code = document.querySelector(".code-pane")!;

    const event = wheel(code, 100);

    expect(event.defaultPrevented).toBe(false);
    expect(deck.next).not.toHaveBeenCalled();
    destroy();
  });
});
