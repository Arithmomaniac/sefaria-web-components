interface WheelDelta {
  readonly deltaX: number;
  readonly deltaY: number;
  readonly deltaMode: number;
}

interface WheelPreservation {
  readonly ctrlKey: boolean;
  readonly nativeScroll: boolean;
}

interface DeckNavigation {
  getCurrentSlide(): HTMLElement | undefined;
  next(): void;
  prev(): void;
}

interface PresentationNavigationOptions {
  readonly deck: DeckNavigation;
  readonly isBlocked: () => boolean;
  readonly document?: Document;
  readonly now?: () => number;
}

const wheelStepInterval = 650;
const minimumWheelDelta = 24;
const nativeWheelSelector = [
  ".code-pane",
  ".pipeline-output",
  ".pipeline-render",
  "input",
  "select",
  "textarea",
  "[contenteditable='true']",
].join(",");

export function normalizeWheelDelta(event: WheelDelta): number {
  if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return 0;
  const multiplier =
    event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 900 : 1;
  return event.deltaY * multiplier;
}

export function shouldPreserveWheel(input: WheelPreservation): boolean {
  return input.ctrlKey || input.nativeScroll;
}

function isNativeWheelTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element && target.closest(nativeWheelSelector) !== null
  );
}

export function installPresentationNavigation({
  deck,
  isBlocked,
  document = window.document,
  now = Date.now,
}: PresentationNavigationOptions): () => void {
  let lastStep = Number.NEGATIVE_INFINITY;
  const onWheel = (event: WheelEvent) => {
    if (
      isBlocked() ||
      shouldPreserveWheel({
        ctrlKey: event.ctrlKey,
        nativeScroll: isNativeWheelTarget(event.target),
      })
    ) {
      return;
    }
    const delta = normalizeWheelDelta(event);
    if (
      Math.abs(delta) < minimumWheelDelta ||
      now() - lastStep < wheelStepInterval
    )
      return;

    lastStep = now();
    event.preventDefault();
    if (delta > 0) deck.next();
    else deck.prev();
  };

  document.addEventListener("wheel", onWheel, { passive: false });
  return () => document.removeEventListener("wheel", onWheel);
}
